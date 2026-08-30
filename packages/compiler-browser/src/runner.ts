import type { ArtifactManifest, CompileRequest, CompilerEvent, CompilerRunner } from "@vooya-lab/compiler-protocol";

export type BrowserRustcAssets = {
  rustcUrl: string;
  rustcIntegrity: `sha256-${string}`;
  sysrootUrl: string;
  sysrootIntegrity: `sha256-${string}`;
  unknownSysrootUrl?: string;
  unknownSysrootIntegrity?: `sha256-${string}`;
  dependencyBundleUrl?: string;
  dependencyBundleIntegrity?: `sha256-${string}`;
  dependencyProfile?: "reactive" | "bindgen-numeric" | "vooya-dom";
};

export const WEBLINGS_DEMO_ASSETS: BrowserRustcAssets = {
  rustcUrl: "https://weblings.forest-anderson.ca/rustc/rustc.wasm",
  rustcIntegrity: "sha256-QUEgge78PgjsVmTtB0iQKn5XXh8meJjcxk1BJwLffoM=",
  sysrootUrl: "https://weblings.forest-anderson.ca/rustc/sysroot-wasip1.bundle",
  sysrootIntegrity: "sha256-bboT1gd8t5Nu1mYc0Qh7yektwdizWQPs8iiByXrDmAs=",
};

type ActiveCompile = {
  requestId: string;
  worker: Worker;
  startedAt: number;
  onEvent: (event: CompilerEvent) => void;
  resolve: (manifest: ArtifactManifest | undefined) => void;
  reject: (error: Error) => void;
  settled: boolean;
};

export class BrowserRustcGateOneRunner implements CompilerRunner {
  readonly id = "weblings-rustc-wasi";
  readonly version = "gate1-d0cd7a9";
  readonly artifacts = new Map<string, Uint8Array>();
  #assets: BrowserRustcAssets;
  #active?: ActiveCompile;

  constructor(assets: BrowserRustcAssets = WEBLINGS_DEMO_ASSETS) {
    this.#assets = assets;
  }

  compile(request: CompileRequest, onEvent: (event: CompilerEvent) => void): Promise<ArtifactManifest | undefined> {
    this.#cancelActive("cancelled");
    this.artifacts.clear();
    const worker = new Worker(new URL("./rustc.worker.ts", import.meta.url), { type: "module", name: "vooya-browser-rustc" });
    return new Promise((resolve, reject) => {
      const active: ActiveCompile = {
        requestId: request.requestId,
        worker,
        startedAt: performance.now(),
        onEvent,
        resolve,
        reject,
        settled: false,
      };
      this.#active = active;
      let manifest: ArtifactManifest | undefined;
      worker.onmessage = (message: MessageEvent<{ type: string; event?: CompilerEvent; requestId?: string; name?: string; bytes?: ArrayBuffer }>) => {
        const payload = message.data;
        if (payload.type === "artifact-bytes" && payload.requestId === request.requestId && payload.name && payload.bytes) {
          this.artifacts.set(`${payload.requestId}:${payload.name}`, new Uint8Array(payload.bytes));
          return;
        }
        if (payload.type !== "event" || !payload.event || payload.event.requestId !== request.requestId) return;
        onEvent(payload.event);
        if (payload.event.type === "artifact") manifest = payload.event.manifest;
        if (payload.event.type === "complete") {
          this.#settle(active, payload.event.stage === "succeeded" ? manifest : undefined);
        }
      };
      worker.onerror = (event) => {
        this.#reject(active, new Error(event.message || "Browser compiler Worker failed"));
      };
      worker.postMessage({ type: "compile", request, compilerVersion: this.version, assets: this.#assets });
    });
  }

  cancel(requestId: string) {
    if (requestId !== this.#active?.requestId) return;
    this.#cancelActive("cancelled");
  }

  takeArtifact(requestId: string, name: string) {
    const key = `${requestId}:${name}`;
    const artifact = this.artifacts.get(key);
    this.artifacts.delete(key);
    return artifact;
  }

  dispose() {
    this.#cancelActive("terminated");
    this.artifacts.clear();
  }

  #settle(active: ActiveCompile, manifest: ArtifactManifest | undefined) {
    if (active.settled) return;
    active.settled = true;
    active.worker.terminate();
    if (this.#active === active) this.#active = undefined;
    active.resolve(manifest);
  }

  #reject(active: ActiveCompile, error: Error) {
    if (active.settled) return;
    active.settled = true;
    active.worker.terminate();
    if (this.#active === active) this.#active = undefined;
    active.reject(error);
  }

  #cancelActive(stage: "cancelled" | "terminated") {
    const active = this.#active;
    if (!active || active.settled) return;
    active.onEvent({
      type: "complete",
      requestId: active.requestId,
      compilerVersion: this.version,
      stage,
      elapsedMs: performance.now() - active.startedAt,
    });
    this.#settle(active, undefined);
    this.artifacts.clear();
  }
}
