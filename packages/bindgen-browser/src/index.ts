export type BrowserBindgenAssets = {
  toolUrl: string;
  toolIntegrity: `sha256-${string}`;
};

export type BrowserBindgenResult = {
  javascript: string;
  wasm: Uint8Array;
  elapsedMs: number;
};

type ActiveTransform = {
  requestId: string;
  worker: Worker;
  resolve: (result: BrowserBindgenResult) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  settled: boolean;
};

export class BrowserBindgenRunner {
  #active?: ActiveTransform;

  constructor(private readonly assets: BrowserBindgenAssets) {}

  transform(input: Uint8Array, options: { outName?: string; timeoutMs?: number } = {}) {
    const transferable = new Uint8Array(input.byteLength);
    transferable.set(input);
    if (!WebAssembly.validate(transferable.buffer)) return Promise.reject(new Error("wasm-bindgen received an invalid input module"));
    const outName = options.outName ?? "vooya_component";
    if (!/^[a-z][a-z0-9_]*$/.test(outName)) return Promise.reject(new Error("wasm-bindgen received an invalid output name"));
    this.cancel();
    const requestId = crypto.randomUUID?.() ?? `bindgen-${Date.now()}-${Math.random()}`;
    const worker = new Worker(new URL("./bindgen.worker.ts", import.meta.url), { type: "module", name: "vooya-browser-wasm-bindgen" });
    const timeoutMs = options.timeoutMs ?? 15_000;
    return new Promise<BrowserBindgenResult>((resolve, reject) => {
      const active: ActiveTransform = {
        requestId,
        worker,
        resolve,
        reject,
        settled: false,
        timeout: setTimeout(() => this.#reject(active, new Error(`wasm-bindgen exceeded the ${timeoutMs} ms limit`)), timeoutMs),
      };
      this.#active = active;
      worker.onmessage = (event: MessageEvent<{ type: "result" | "error"; requestId: string; javascript?: string; wasm?: ArrayBuffer; elapsedMs?: number; message?: string }>) => {
        if (event.data.requestId !== requestId) return;
        if (event.data.type === "result" && event.data.javascript !== undefined && event.data.wasm && event.data.elapsedMs !== undefined) {
          this.#resolve(active, { javascript: event.data.javascript, wasm: new Uint8Array(event.data.wasm), elapsedMs: event.data.elapsedMs });
        } else {
          this.#reject(active, new Error(event.data.message || "wasm-bindgen Worker failed"));
        }
      };
      worker.onerror = (event) => this.#reject(active, new Error(event.message || "wasm-bindgen Worker failed"));
      worker.postMessage({ type: "transform", requestId, input: transferable.buffer, outName, assets: this.assets }, [transferable.buffer]);
    });
  }

  cancel() {
    const active = this.#active;
    if (!active || active.settled) return;
    this.#reject(active, new Error("wasm-bindgen transformation cancelled"));
  }

  dispose() {
    this.cancel();
  }

  #resolve(active: ActiveTransform, result: BrowserBindgenResult) {
    if (active.settled) return;
    active.settled = true;
    clearTimeout(active.timeout);
    active.worker.terminate();
    if (this.#active === active) this.#active = undefined;
    active.resolve(result);
  }

  #reject(active: ActiveTransform, error: Error) {
    if (active.settled) return;
    active.settled = true;
    clearTimeout(active.timeout);
    active.worker.terminate();
    if (this.#active === active) this.#active = undefined;
    active.reject(error);
  }
}
