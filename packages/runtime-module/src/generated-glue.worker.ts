import type { WasmExportResult } from "./index";

type RunMessage = {
  type: "run";
  requestId: string;
  javascript: string;
  wasm: ArrayBuffer;
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
  const { requestId, javascript, wasm, exportName, args } = event.data;
  const startedAt = performance.now();
  const moduleUrl = URL.createObjectURL(new Blob([javascript], { type: "text/javascript" }));
  try {
    const generated = await import(/* @vite-ignore */ moduleUrl) as Record<string, unknown> & {
      default?: (input: { module_or_path: Uint8Array }) => Promise<unknown>;
    };
    if (typeof generated.default !== "function") throw new Error("Generated glue has no default initializer");
    await generated.default({ module_or_path: new Uint8Array(wasm) });
    const exported = generated[exportName];
    if (typeof exported !== "function") throw new Error(`Generated glue does not export ${exportName}`);
    const value = exported(...args) as unknown;
    if (typeof value !== "number" && typeof value !== "bigint") throw new Error(`${exportName} returned a non-numeric value`);
    const valueType: "number" | "bigint" = typeof value === "bigint" ? "bigint" : "number";
    const result: WasmExportResult = {
      value: typeof value === "bigint" ? value.toString() : value,
      valueType,
      importCount: 0,
      elapsedMs: performance.now() - startedAt,
    };
    workerScope.postMessage({ type: "result", requestId, result });
  } catch (cause) {
    workerScope.postMessage({ type: "error", requestId, message: cause instanceof Error ? cause.message : String(cause) });
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
};
