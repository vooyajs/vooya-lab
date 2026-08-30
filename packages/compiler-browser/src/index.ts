export type BrowserCompilerCapability = {
  available: boolean;
  detail: string;
};

export type BrowserCompilerEnvironment = {
  webAssembly: BrowserCompilerCapability;
  moduleWorkers: BrowserCompilerCapability;
  streamingFetch: BrowserCompilerCapability;
  cacheStorage: BrowserCompilerCapability;
  crossOriginIsolated: BrowserCompilerCapability;
  hardwareConcurrency?: number;
  deviceMemoryGiB?: number;
};

export const WEBLINGS_GATE_1_CANDIDATE = {
  id: "weblings-rustc-wasi",
  status: "gate-0-candidate",
  repository: "https://github.com/AngelOnFira/weblings",
  commit: "d0cd7a9f3af7d8249b3948ac0e19d2afc0d01633",
  license: "MIT",
  compilerRepository: "https://github.com/AngelOnFira/wasm-rustc",
  compilerCommit: "d7c1a08a60816ed824bb04f75fe79fa797996deb",
  artifactTag: "artifacts-test-7",
  target: "wasm32-wasip1",
  compressedBytes: {
    rustc: 17_206_482,
    sysroot: 43_403_178,
    total: 60_609_660,
  },
  runtime: {
    worker: true,
    cancellation: "terminate-worker",
    diagnostics: "rustc-json",
    threaded: false,
    sharedArrayBufferRequired: false,
  },
  limitations: [
    "The selected artifact target is wasm32-wasip1, not Vooya's current wasm32-unknown-unknown output pipeline.",
    "Cargo dependency resolution, build scripts, and procedural macros are outside the fixed-source Gate 1 proof.",
    "Published payload and browser memory costs are too large for eager loading on normal case pages.",
  ],
} as const;

export function probeBrowserCompilerEnvironment(): BrowserCompilerEnvironment {
  const hasWindow = typeof window !== "undefined";
  const hasWorker = typeof Worker !== "undefined";
  const hasReadableStream = typeof ReadableStream !== "undefined";
  const hasCacheStorage = typeof caches !== "undefined";
  const navigatorWithMemory = globalThis.navigator as Navigator & { deviceMemory?: number };
  return {
    webAssembly: { available: typeof WebAssembly !== "undefined", detail: "WebAssembly compile and instantiate APIs" },
    moduleWorkers: { available: hasWindow && hasWorker, detail: "Dedicated module Worker; actual construction is verified by the Gate 1 spike" },
    streamingFetch: { available: typeof fetch !== "undefined" && hasReadableStream, detail: "Fetch + ReadableStream for staged toolchain assets" },
    cacheStorage: { available: hasCacheStorage, detail: "Cache Storage for sysroot reuse across replacement Workers" },
    crossOriginIsolated: { available: globalThis.crossOriginIsolated === true, detail: "Not required by the selected non-threaded candidate; required by some alternative toolchains" },
    hardwareConcurrency: navigatorWithMemory?.hardwareConcurrency,
    deviceMemoryGiB: navigatorWithMemory?.deviceMemory,
  };
}

export function canAttemptGateOne(environment = probeBrowserCompilerEnvironment()) {
  return environment.webAssembly.available && environment.moduleWorkers.available && environment.streamingFetch.available;
}

export { BrowserRustcGateOneRunner, WEBLINGS_DEMO_ASSETS, type BrowserRustcAssets } from "./runner";
