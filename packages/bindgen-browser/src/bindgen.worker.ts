import { Directory, Fd, File as WasiFile, type Inode, PreopenDirectory, WASI } from "@bjorn3/browser_wasi_shim";

type TransformMessage = {
  type: "transform";
  requestId: string;
  input: ArrayBuffer;
  outName: string;
  assets: { toolUrl: string; toolIntegrity: string };
};

type WorkerScope = {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<TransformMessage>) => void) | null;
};

const workerScope = globalThis as unknown as WorkerScope;

workerScope.onmessage = async (event) => {
  if (event.data.type !== "transform") return;
  const { requestId, input, outName, assets } = event.data;
  const startedAt = performance.now();
  let stderr = "";

  class Capture extends Fd {
    fd_write(data: Uint8Array) {
      stderr += new TextDecoder().decode(data);
      return { ret: 0, nwritten: data.byteLength };
    }
  }

  try {
    const response = fetch(assets.toolUrl, { cache: "force-cache", integrity: assets.toolIntegrity });
    const tool = await WebAssembly.compileStreaming(response);
    const output = new Directory(new Map());
    const work = new PreopenDirectory("/work", new Map<string, Inode>([
      ["input.wasm", new WasiFile(new Uint8Array(input), { readonly: true })],
      ["out", output],
    ]));
    const capture = new Capture();
    const wasi = new WASI(
      ["vooya-wasm-bindgen-wasi", "/work/input.wasm", "/work/out", outName],
      [],
      [capture, capture, capture, work],
      { debug: false },
    );
    const instance = await WebAssembly.instantiate(tool, { wasi_snapshot_preview1: wasi.wasiImport });
    let exitCode = 0;
    try {
      exitCode = wasi.start(instance as WebAssembly.Instance & { exports: { memory: WebAssembly.Memory; _start: () => unknown } });
    } catch {
      exitCode = 1;
    }
    if (exitCode !== 0) throw new Error(stderr.trim() || `wasm-bindgen exited with code ${exitCode}`);
    const javascript = output.contents.get(`${outName}.js`);
    const wasm = output.contents.get(`${outName}_bg.wasm`);
    if (!(javascript instanceof WasiFile) || !(wasm instanceof WasiFile)) {
      throw new Error("wasm-bindgen completed without both JavaScript and WASM outputs");
    }
    const wasmBytes = wasm.data.slice();
    if (!WebAssembly.validate(wasmBytes)) throw new Error("wasm-bindgen emitted an invalid WebAssembly module");
    workerScope.postMessage({
      type: "result",
      requestId,
      javascript: new TextDecoder().decode(javascript.data),
      wasm: wasmBytes.buffer,
      elapsedMs: performance.now() - startedAt,
    }, [wasmBytes.buffer]);
  } catch (cause) {
    workerScope.postMessage({ type: "error", requestId, message: cause instanceof Error ? cause.message : String(cause) });
  }
};
