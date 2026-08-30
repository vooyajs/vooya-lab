export type WasiCommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  truncated: boolean;
  elapsedMs: number;
};

type ActiveRun = {
  requestId: string;
  worker: Worker;
  resolve: (result: WasiCommandResult) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  settled: boolean;
};

export class BrowserWasiCommandRunner {
  #active?: ActiveRun;

  run(bytes: Uint8Array, options: { timeoutMs?: number; maxOutputBytes?: number } = {}) {
    const transferable = new Uint8Array(bytes.byteLength);
    transferable.set(bytes);
    if (!WebAssembly.validate(transferable.buffer)) return Promise.reject(new Error("WASI runtime received an invalid WebAssembly module"));
    this.cancel();
    const requestId = crypto.randomUUID?.() ?? `wasi-${Date.now()}-${Math.random()}`;
    const worker = new Worker(new URL("./wasi-command.worker.ts", import.meta.url), { type: "module", name: "vooya-wasi-artifact" });
    const timeoutMs = options.timeoutMs ?? 3000;
    const maxOutputBytes = options.maxOutputBytes ?? 64 * 1024;
    const artifactBuffer = transferable.buffer;
    return new Promise<WasiCommandResult>((resolve, reject) => {
      const active: ActiveRun = {
        requestId,
        worker,
        resolve,
        reject,
        settled: false,
        timeout: setTimeout(() => this.#reject(active, new Error(`WASI artifact exceeded the ${timeoutMs} ms runtime limit`)), timeoutMs),
      };
      this.#active = active;
      worker.onmessage = (event: MessageEvent<{ type: "result" | "error"; requestId: string; result?: WasiCommandResult; message?: string }>) => {
        if (event.data.requestId !== requestId) return;
        if (event.data.type === "result" && event.data.result) this.#resolve(active, event.data.result);
        else this.#reject(active, new Error(event.data.message || "WASI artifact failed"));
      };
      worker.onerror = (event) => this.#reject(active, new Error(event.message || "WASI runtime Worker failed"));
      worker.postMessage({ type: "run", requestId, bytes: artifactBuffer, maxOutputBytes }, [artifactBuffer]);
    });
  }

  cancel() {
    const active = this.#active;
    if (!active || active.settled) return;
    this.#reject(active, new Error("WASI artifact execution cancelled"));
  }

  dispose() {
    this.cancel();
  }

  #resolve(active: ActiveRun, result: WasiCommandResult) {
    if (active.settled) return;
    active.settled = true;
    clearTimeout(active.timeout);
    active.worker.terminate();
    if (this.#active === active) this.#active = undefined;
    active.resolve(result);
  }

  #reject(active: ActiveRun, error: Error) {
    if (active.settled) return;
    active.settled = true;
    clearTimeout(active.timeout);
    active.worker.terminate();
    if (this.#active === active) this.#active = undefined;
    active.reject(error);
  }
}
