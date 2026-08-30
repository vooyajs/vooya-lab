type RunMessage = {
  type: "run";
  requestId: string;
  bytes: ArrayBuffer;
  exportName: string;
  args: number[];
};

type WorkerScope = {
  postMessage(message: unknown): void;
  onmessage: ((event: MessageEvent<RunMessage>) => void) | null;
};

const workerScope = globalThis as unknown as WorkerScope;

workerScope.onmessage = async (event) => {
  if (event.data.type !== "run") return;
  const { requestId, bytes, exportName, args } = event.data;
  const startedAt = performance.now();
  try {
    const module = await WebAssembly.compile(bytes);
    const imports = WebAssembly.Module.imports(module);
    if (imports.length) {
      throw new Error(`Unknown-target probe requested ${imports.length} imported capabilities`);
    }
    const instance = await WebAssembly.instantiate(module, {});
    const exported = instance.exports[exportName];
    if (typeof exported !== "function") throw new Error(`Artifact does not export ${exportName}`);
    const value = exported(...args) as unknown;
    if (typeof value !== "number" && typeof value !== "bigint") {
      throw new Error(`${exportName} returned a non-numeric value`);
    }
    workerScope.postMessage({
      type: "result",
      requestId,
      result: {
        value: typeof value === "bigint" ? value.toString() : value,
        valueType: typeof value,
        importCount: imports.length,
        elapsedMs: performance.now() - startedAt,
      },
    });
  } catch (cause) {
    workerScope.postMessage({ type: "error", requestId, message: cause instanceof Error ? cause.message : String(cause) });
  }
};
