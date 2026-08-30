export type WasmExportResult = {
  value: number | string;
  valueType: "number" | "bigint";
  importCount: number;
  elapsedMs: number;
};

type ActiveRun = {
  requestId: string;
  worker: Worker;
  resolve: (result: WasmExportResult) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  settled: boolean;
};

export class BrowserWasmExportRunner {
  #active?: ActiveRun;

  run(bytes: Uint8Array, exportName: string, args: number[] = [], options: { timeoutMs?: number } = {}) {
    const transferable = bytes.slice();
    if (!WebAssembly.validate(transferable.buffer)) {
      return Promise.reject(new Error("Module runner received an invalid WebAssembly module"));
    }
    if (!/^[A-Za-z_$][\w$]*$/.test(exportName)) {
      return Promise.reject(new Error("Module runner received an invalid export name"));
    }
    if (!args.every(Number.isFinite)) {
      return Promise.reject(new Error("Module runner accepts only finite numeric arguments"));
    }
    this.cancel();
    const requestId = crypto.randomUUID?.() ?? `module-${Date.now()}-${Math.random()}`;
    const worker = new Worker(new URL("./module.worker.ts", import.meta.url), { type: "module", name: "vooya-unknown-target-artifact" });
    const timeoutMs = options.timeoutMs ?? 1000;
    return new Promise<WasmExportResult>((resolve, reject) => {
      const active: ActiveRun = {
        requestId,
        worker,
        resolve,
        reject,
        settled: false,
        timeout: setTimeout(() => this.#reject(active, new Error(`WASM export exceeded the ${timeoutMs} ms runtime limit`)), timeoutMs),
      };
      this.#active = active;
      worker.onmessage = (event: MessageEvent<{ type: "result" | "error"; requestId: string; result?: WasmExportResult; message?: string }>) => {
        if (event.data.requestId !== requestId) return;
        if (event.data.type === "result" && event.data.result) this.#resolve(active, event.data.result);
        else this.#reject(active, new Error(event.data.message || "WASM export invocation failed"));
      };
      worker.onerror = (event) => this.#reject(active, new Error(event.message || "WASM module Worker failed"));
      worker.postMessage({ type: "run", requestId, bytes: transferable.buffer, exportName, args }, [transferable.buffer]);
    });
  }

  cancel() {
    const active = this.#active;
    if (!active || active.settled) return;
    this.#reject(active, new Error("WASM export invocation cancelled"));
  }

  dispose() {
    this.cancel();
  }

  #resolve(active: ActiveRun, result: WasmExportResult) {
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

type ActiveGlueRun = {
  requestId: string;
  worker: Worker;
  resolve: (result: WasmExportResult) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  settled: boolean;
};

export class BrowserGeneratedGlueRunner {
  #active?: ActiveGlueRun;

  run(javascript: string, wasm: Uint8Array, exportName: string, args: number[] = [], options: { timeoutMs?: number } = {}) {
    const transferable = new Uint8Array(wasm.byteLength);
    transferable.set(wasm);
    if (!WebAssembly.validate(transferable.buffer)) return Promise.reject(new Error("Generated glue runner received invalid WASM"));
    if (!/^[A-Za-z_$][\w$]*$/.test(exportName)) return Promise.reject(new Error("Generated glue runner received an invalid export name"));
    if (!args.every(Number.isFinite)) return Promise.reject(new Error("Generated glue runner accepts only finite numeric arguments"));
    this.cancel();
    const requestId = crypto.randomUUID?.() ?? `glue-${Date.now()}-${Math.random()}`;
    const worker = new Worker(new URL("./generated-glue.worker.ts", import.meta.url), { type: "module", name: "vooya-generated-glue" });
    const timeoutMs = options.timeoutMs ?? 2000;
    return new Promise<WasmExportResult>((resolve, reject) => {
      const active: ActiveGlueRun = {
        requestId,
        worker,
        resolve,
        reject,
        settled: false,
        timeout: setTimeout(() => this.#reject(active, new Error(`Generated glue exceeded the ${timeoutMs} ms runtime limit`)), timeoutMs),
      };
      this.#active = active;
      worker.onmessage = (event: MessageEvent<{ type: "result" | "error"; requestId: string; result?: WasmExportResult; message?: string }>) => {
        if (event.data.requestId !== requestId) return;
        if (event.data.type === "result" && event.data.result) this.#resolve(active, event.data.result);
        else this.#reject(active, new Error(event.data.message || "Generated glue execution failed"));
      };
      worker.onerror = (event) => this.#reject(active, new Error(event.message || "Generated glue Worker failed"));
      worker.postMessage({ type: "run", requestId, javascript, wasm: transferable.buffer, exportName, args }, [transferable.buffer]);
    });
  }

  cancel() {
    const active = this.#active;
    if (!active || active.settled) return;
    this.#reject(active, new Error("Generated glue execution cancelled"));
  }

  dispose() {
    this.cancel();
  }

  #resolve(active: ActiveGlueRun, result: WasmExportResult) {
    if (active.settled) return;
    active.settled = true;
    clearTimeout(active.timeout);
    active.worker.terminate();
    if (this.#active === active) this.#active = undefined;
    active.resolve(result);
  }

  #reject(active: ActiveGlueRun, error: Error) {
    if (active.settled) return;
    active.settled = true;
    clearTimeout(active.timeout);
    active.worker.terminate();
    if (this.#active === active) this.#active = undefined;
    active.reject(error);
  }
}
