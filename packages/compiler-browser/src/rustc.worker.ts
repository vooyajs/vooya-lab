import { Directory, Fd, File as WasiFile, type Inode, PreopenDirectory, WASI } from "@bjorn3/browser_wasi_shim";
import type { ArtifactManifest, CompileRequest, CompilerDiagnostic, CompilerEvent } from "@vooya-lab/compiler-protocol";

type StartMessage = {
  type: "compile";
  request: CompileRequest;
  compilerVersion: string;
  assets: {
    rustcUrl: string;
    rustcIntegrity: string;
    sysrootUrl: string;
    sysrootIntegrity: string;
    unknownSysrootUrl?: string;
    unknownSysrootIntegrity?: string;
    dependencyBundleUrl?: string;
    dependencyBundleIntegrity?: string;
    dependencyProfile?: "reactive" | "bindgen-numeric" | "vooya-dom";
  };
};

type BundleIndex = { files: Array<{ p: string; o: number; l: number }> };
type BundleFiles = Map<string, WasiFile>;

type CompilerWorkerScope = {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<StartMessage>) => void) | null;
};

const workerScope = globalThis as unknown as CompilerWorkerScope;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function emit(event: CompilerEvent) {
  workerScope.postMessage({ type: "event", event });
}

function parseBundle(bytes: Uint8Array): BundleFiles {
  if (decoder.decode(bytes.subarray(0, 6)) !== "RIWB1\n") throw new Error("Unsupported sysroot bundle format");
  const indexLength = new DataView(bytes.buffer, bytes.byteOffset + 6, 4).getUint32(0, true);
  const index = JSON.parse(decoder.decode(bytes.subarray(10, 10 + indexLength))) as BundleIndex;
  const base = 10 + indexLength;
  const files: BundleFiles = new Map();
  for (const entry of index.files) {
    if (entry.p === "manifest.json") continue;
    files.set(entry.p, new WasiFile(bytes.subarray(base + entry.o, base + entry.o + entry.l), { readonly: true }));
  }
  return files;
}

function bundlePreopen(mountPath: string, files: BundleFiles) {
  type DirectoryNode = Map<string, Inode | DirectoryNode>;
  const root: DirectoryNode = new Map();
  for (const [path, file] of files) {
    const segments = path.split("/");
    const name = segments.pop()!;
    let directory = root;
    for (const segment of segments) {
      const existing = directory.get(segment);
      if (existing instanceof Map) directory = existing;
      else {
        const child: DirectoryNode = new Map();
        directory.set(segment, child);
        directory = child;
      }
    }
    directory.set(name, file);
  }
  const materialize = (node: DirectoryNode): Directory => new Directory(new Map(
    [...node].map(([name, child]) => [name, child instanceof Map ? materialize(child) : child]),
  ));
  return new PreopenDirectory(mountPath, materialize(root).contents);
}

function findDependency(files: BundleFiles, prefix: string) {
  const match = [...files.keys()].find((path) => path.startsWith(`target/${prefix}`) && path.endsWith(".rlib"));
  if (!match) throw new Error(`Browser dependency bundle is missing ${prefix}*.rlib`);
  return `/deps/${match}`;
}

function findOptionalDependency(files: BundleFiles, prefix: string) {
  const match = [...files.keys()].find((path) => path.startsWith(`target/${prefix}`) && path.endsWith(".rlib"));
  return match ? `/deps/${match}` : undefined;
}

function parseDiagnostics(log: string): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  for (const line of log.split("\n")) {
    if (!line.startsWith("{")) continue;
    try {
      const message = JSON.parse(line) as {
        $message_type?: string;
        level?: string;
        message?: string;
        code?: { code?: string };
        spans?: Array<{ is_primary?: boolean; file_name: string; line_start: number; line_end: number; column_start: number; column_end: number }>;
      };
      if (message.$message_type !== "diagnostic" || !message.message) continue;
      const primary = message.spans?.find((span) => span.is_primary) ?? message.spans?.[0];
      diagnostics.push({
        severity: message.level === "error" ? "error" : message.level === "warning" ? "warning" : "information",
        stage: "compiling",
        message: message.message,
        code: message.code?.code,
        location: primary ? {
          path: primary.file_name.replace("/work/", ""),
          start: { line: primary.line_start, column: primary.column_start },
          end: { line: primary.line_end, column: primary.column_end },
        } : undefined,
      });
    } catch {
      // Non-JSON rustc output is reported as a terminal error below.
    }
  }
  return diagnostics;
}

async function sha256(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function compile(message: StartMessage) {
  const { request, compilerVersion, assets } = message;
  const started = performance.now();
  if (request.target !== "wasm32-wasip1" && request.target !== "wasm32-unknown-unknown") {
    throw new Error(`Browser rustc runner does not support ${request.target}`);
  }
  const entry = request.workspace.find((file) => file.path === request.entryPath);
  if (!entry) throw new Error(`Entry file not found: ${request.entryPath}`);

  const selectedSysroot = request.target === "wasm32-unknown-unknown" && assets.unknownSysrootUrl && assets.unknownSysrootIntegrity
    ? { url: assets.unknownSysrootUrl, integrity: assets.unknownSysrootIntegrity }
    : { url: assets.sysrootUrl, integrity: assets.sysrootIntegrity };
  emit({
    type: "state",
    requestId: request.requestId,
    compilerVersion,
    stage: "preparing",
    message: request.target === "wasm32-unknown-unknown" && assets.unknownSysrootUrl
      ? "Streaming the SRI-pinned browser rustc and matched unknown-unknown sysroot"
      : "Streaming rustc (87.9 MB decoded) and the WASI sysroot (71.3 MB decoded)",
  });
  const rustcResponse = fetch(assets.rustcUrl, { cache: "force-cache", integrity: assets.rustcIntegrity });
  const sysrootFetch = fetch(selectedSysroot.url, { cache: "force-cache", integrity: selectedSysroot.integrity });
  const dependencyFetch = request.target === "wasm32-unknown-unknown" && assets.dependencyBundleUrl && assets.dependencyBundleIntegrity
    ? fetch(assets.dependencyBundleUrl, { cache: "force-cache", integrity: assets.dependencyBundleIntegrity })
    : undefined;
  const [rustcModule, sysrootResponse, dependencyResponse] = await Promise.all([
    WebAssembly.compileStreaming(rustcResponse),
    sysrootFetch,
    dependencyFetch,
  ]);
  if (!sysrootResponse.ok) throw new Error(`Sysroot fetch failed: HTTP ${sysrootResponse.status}`);
  const sysroot = parseBundle(new Uint8Array(await sysrootResponse.arrayBuffer()));
  if (dependencyResponse && !dependencyResponse.ok) throw new Error(`Dependency bundle fetch failed: HTTP ${dependencyResponse.status}`);
  const dependencies = dependencyResponse ? parseBundle(new Uint8Array(await dependencyResponse.arrayBuffer())) : undefined;

  emit({ type: "state", requestId: request.requestId, compilerVersion, stage: "compiling", message: "Running rustc.wasm in the dedicated Worker" });
  let stderr = "";
  class Capture extends Fd {
    fd_write(data: Uint8Array) {
      stderr += decoder.decode(data, { stream: true });
      return { ret: 0, nwritten: data.byteLength };
    }
  }

  const work = new PreopenDirectory("/work", new Map([["main.rs", new WasiFile(encoder.encode(entry.content))]]));
  const bindgenScaffold = dependencies ? findOptionalDependency(dependencies, "libvooya_bindgen_scaffold-") : undefined;
  const domScaffold = dependencies ? findOptionalDependency(dependencies, "libvooya_gate_two_dom_scaffold-") : undefined;
  if (assets.dependencyProfile === "bindgen-numeric" && !bindgenScaffold) {
    throw new Error("The bindgen-numeric dependency profile is missing its reviewed scaffold");
  }
  if (assets.dependencyProfile === "vooya-dom" && !domScaffold) {
    throw new Error("The vooya-dom dependency profile is missing its reviewed component scaffold");
  }
  const args = [
    "rustc", "/work/main.rs", "--sysroot", "/sysroot", "--target", request.target,
    "-Zunstable-options", "--edition", "2024", request.profile === "release" ? "-O" : "-Copt-level=0", "-Cpanic=abort",
    ...(request.target === "wasm32-unknown-unknown" ? ["--crate-type=cdylib"] : []),
    ...(dependencies ? [
      "-Ldependency=/deps/target",
      "--extern", `vooya_core=${findDependency(dependencies, "libvooya_core-")}`,
      ...(bindgenScaffold ? ["--extern", `vooya_bindgen_scaffold=${bindgenScaffold}`] : []),
      ...(domScaffold ? ["--extern", `vooya_gate_two_dom_scaffold=${domScaffold}`] : []),
    ] : []),
    "--error-format=json", "--json=diagnostic-rendered-ansi", "-o", "/work/output.wasm",
  ];
  const capture = new Capture();
  const preopens = [capture, capture, capture, new PreopenDirectory("/tmp", new Map()), bundlePreopen("/sysroot", sysroot), work];
  if (dependencies) preopens.push(bundlePreopen("/deps", dependencies));
  const wasi = new WASI(args, ["CLIF2WASM_OBJECT=1", "RIWL_TIMINGS=1"], preopens, { debug: false });
  const instance = await WebAssembly.instantiate(rustcModule, { wasi_snapshot_preview1: wasi.wasiImport });
  let exitCode = 0;
  try {
    exitCode = wasi.start(instance as WebAssembly.Instance & { exports: { memory: WebAssembly.Memory; _start: () => unknown } });
  } catch {
    exitCode = 1;
  }

  for (const diagnostic of parseDiagnostics(stderr)) {
    emit({ type: "diagnostic", requestId: request.requestId, compilerVersion, diagnostic });
  }
  const output = work.dir.contents.get("output.wasm");
  if (!(output instanceof WasiFile) || !output.data.byteLength || exitCode !== 0) {
    const plain = stderr.split("\n").filter((line) => !line.startsWith("{")).join("\n").trim();
    if (plain) emit({ type: "diagnostic", requestId: request.requestId, compilerVersion, diagnostic: { severity: "error", stage: "compiling", message: plain } });
    emit({ type: "complete", requestId: request.requestId, compilerVersion, stage: "failed", elapsedMs: performance.now() - started });
    return;
  }

  emit({ type: "state", requestId: request.requestId, compilerVersion, stage: "emitting", message: "Validating and hashing the emitted WebAssembly module" });
  const bytes = output.data.slice();
  if (!WebAssembly.validate(bytes)) throw new Error("rustc emitted an invalid WebAssembly module");
  const manifest: ArtifactManifest = {
    protocol: request.protocol,
    requestId: request.requestId,
    compilerId: request.compilerId,
    compilerVersion,
    target: request.target,
    artifacts: [{ name: "output.wasm", mediaType: "application/wasm", byteLength: bytes.byteLength, sha256: await sha256(bytes), role: "wasm" }],
  };
  workerScope.postMessage({ type: "artifact-bytes", requestId: request.requestId, name: "output.wasm", bytes: bytes.buffer }, [bytes.buffer]);
  emit({ type: "artifact", requestId: request.requestId, compilerVersion, manifest });
  emit({ type: "complete", requestId: request.requestId, compilerVersion, stage: "succeeded", elapsedMs: performance.now() - started });
}

workerScope.onmessage = (event: MessageEvent<StartMessage>) => {
  if (event.data.type !== "compile") return;
  compile(event.data).catch((error) => {
    const { request, compilerVersion } = event.data;
    emit({ type: "diagnostic", requestId: request.requestId, compilerVersion, diagnostic: { severity: "error", stage: "preparing", message: error instanceof Error ? error.message : String(error) } });
    emit({ type: "complete", requestId: request.requestId, compilerVersion, stage: "failed", elapsedMs: 0 });
  });
};
