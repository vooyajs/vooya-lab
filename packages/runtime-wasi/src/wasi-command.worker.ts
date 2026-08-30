import { Fd, PreopenDirectory, WASI } from "@bjorn3/browser_wasi_shim";

type RunMessage = {
  type: "run";
  requestId: string;
  bytes: ArrayBuffer;
  maxOutputBytes: number;
};

type WorkerScope = {
  postMessage(message: unknown): void;
  onmessage: ((event: MessageEvent<RunMessage>) => void) | null;
};

const workerScope = globalThis as unknown as WorkerScope;

workerScope.onmessage = async (event) => {
  if (event.data.type !== "run") return;
  const { requestId, bytes, maxOutputBytes } = event.data;
  const startedAt = performance.now();
  let stdout = "";
  let stderr = "";
  let truncated = false;

  class Capture extends Fd {
    readonly #decoder = new TextDecoder();
    #writtenBytes = 0;

    constructor(private readonly target: "stdout" | "stderr") {
      super();
    }

    fd_write(data: Uint8Array) {
      const remaining = Math.max(0, maxOutputBytes - this.#writtenBytes);
      if (remaining === 0) {
        truncated = true;
        return { ret: 0, nwritten: data.byteLength };
      }
      const chunk = data.byteLength > remaining ? data.subarray(0, remaining) : data;
      this.#writtenBytes += chunk.byteLength;
      const decoded = this.#decoder.decode(chunk, { stream: true });
      if (this.target === "stdout") stdout += decoded;
      else stderr += decoded;
      if (chunk.byteLength < data.byteLength) truncated = true;
      return { ret: 0, nwritten: data.byteLength };
    }
  }

  try {
    const module = await WebAssembly.compile(bytes);
    const input = new Capture("stderr");
    const wasi = new WASI(
      ["vooya-browser-artifact"],
      [],
      [input, new Capture("stdout"), new Capture("stderr"), new PreopenDirectory("/sandbox", new Map())],
      { debug: false },
    );
    const instance = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi.wasiImport });
    let exitCode = 0;
    try {
      exitCode = wasi.start(instance as WebAssembly.Instance & { exports: { memory: WebAssembly.Memory; _start: () => unknown } });
    } catch (cause) {
      exitCode = 1;
      if (!stderr) stderr = cause instanceof Error ? cause.message : String(cause);
    }
    workerScope.postMessage({
      type: "result",
      requestId,
      result: {
        exitCode,
        stdout: stdout.trimEnd(),
        stderr: stderr.trimEnd(),
        truncated,
        elapsedMs: performance.now() - startedAt,
      },
    });
  } catch (cause) {
    workerScope.postMessage({ type: "error", requestId, message: cause instanceof Error ? cause.message : String(cause) });
  }
};
