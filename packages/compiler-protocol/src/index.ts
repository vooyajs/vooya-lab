export const COMPILER_PROTOCOL_VERSION = "vooya-lab.compiler/0.1" as const;

export type CompilerStage =
  | "idle"
  | "queued"
  | "preparing"
  | "compiling"
  | "linking"
  | "emitting"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "terminated";

export type DiagnosticSeverity = "error" | "warning" | "information";

export interface WorkspaceFile {
  path: string;
  content: string;
}

export interface CompileRequest {
  protocol: typeof COMPILER_PROTOCOL_VERSION;
  requestId: string;
  compilerId: string;
  workspace: WorkspaceFile[];
  entryPath: string;
  target: "wasm32-unknown-unknown" | "wasm32-wasip1";
  profile: "debug" | "release";
}

export interface SourceLocation {
  path: string;
  start: { line: number; column: number; byte?: number };
  end?: { line: number; column: number; byte?: number };
}

export interface CompilerDiagnostic {
  severity: DiagnosticSeverity;
  stage: Exclude<CompilerStage, "idle" | "succeeded" | "cancelled" | "terminated">;
  message: string;
  code?: string;
  location?: SourceLocation;
  related?: Array<{ message: string; location: SourceLocation }>;
}

export interface ArtifactDescriptor {
  name: string;
  mediaType: string;
  byteLength: number;
  sha256: string;
  role: "wasm" | "javascript" | "types" | "source-map" | "metadata";
}

export interface ArtifactManifest {
  protocol: typeof COMPILER_PROTOCOL_VERSION;
  requestId: string;
  compilerId: string;
  compilerVersion: string;
  target: CompileRequest["target"];
  artifacts: ArtifactDescriptor[];
}

export type CompilerEvent =
  | { type: "state"; requestId: string; compilerVersion: string; stage: CompilerStage; message?: string; elapsedMs?: number }
  | { type: "diagnostic"; requestId: string; compilerVersion: string; diagnostic: CompilerDiagnostic }
  | { type: "artifact"; requestId: string; compilerVersion: string; manifest: ArtifactManifest }
  | { type: "complete"; requestId: string; compilerVersion: string; stage: "succeeded" | "failed" | "cancelled" | "terminated"; elapsedMs: number };

export interface CompilerRunner {
  readonly id: string;
  readonly version: string;
  compile(request: CompileRequest, onEvent: (event: CompilerEvent) => void): Promise<ArtifactManifest | undefined>;
  cancel(requestId: string): void;
  dispose(): void;
}

export function createCompileRequest(input: Omit<CompileRequest, "protocol" | "requestId">): CompileRequest {
  return {
    ...input,
    protocol: COMPILER_PROTOCOL_VERSION,
    requestId: globalThis.crypto?.randomUUID?.() ?? `compile-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  };
}

export function isTerminalStage(stage: CompilerStage) {
  return stage === "succeeded" || stage === "failed" || stage === "cancelled" || stage === "terminated";
}
