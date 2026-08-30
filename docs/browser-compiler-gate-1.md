# Browser Compiler Gate 1 Report

Date: 2026-08-30. Status: fixed-source Gate 1 passed in local Chrome; this is
a hidden experiment, not a public Vooya compiler.

## What passed

The route `#/experiments/browser-compiler` executes the selected Weblings
`rustc.wasm` inside a dedicated module Worker. No compilation request is sent
to a server. Toolchain downloads begin only after explicit user action.

The implementation:

- copies the edited `main.rs` into an in-memory WASI filesystem;
- mounts the pinned `wasm32-wasip1` sysroot bundle;
- executes the actual compiler with JSON diagnostics enabled;
- validates the emitted bytes as a WebAssembly module;
- computes SHA-256 in the browser and emits a versioned artifact manifest;
- keeps artifact bytes in memory rather than publishing an object URL; and
- checks both fetched toolchain assets with pinned Fetch SRI digests before
  compilation; and
- cancels synchronous compilation by terminating the Worker, settling the
  pending runner promise, clearing artifacts, and allowing a clean retry.

## Reproducible observations

Local Chrome observations on 2026-08-30:

| Input/result | Observation |
| --- | --- |
| Default source | `output.wasm`, 561,119 bytes, SHA-256 `1f3e88d25752408ea68191789538c8e6f0e19be43c04f01e0fcb6e4931728fdd` |
| Edited valid source | `output.wasm`, 560,999 bytes, SHA-256 `44d7953870dd4faa3d3fde45bd9455afb94042f10cfc03e949498bb785542765` |
| Edited type error | rustc reported `mismatched types` at `main.rs:2:22` |
| Cancel and retry | Worker terminated, stale artifact removed, next compile succeeded |
| Warm compile seen in UI | approximately 1.7–2.0 seconds after the toolchain was browser-cached |

The different artifact hashes after changing source prove that the experiment
does not select a known prebuilt output. Timing is an observation from one
machine, not a benchmark or performance promise.

The first linker attempt exposed genuine missing allocator symbols. Matching
the upstream linker mode (`CLIF2WASM_OBJECT=1`) and unstable compiler options
fixed emission. This is useful evidence that the Lab is exercising the real
toolchain rather than a simulated progress path.

## Architecture added

```text
VooyaWorkbench
  -> CompilerRunner / serializable compiler protocol
    -> dedicated rustc Worker
      -> streamed rustc.wasm + fetched sysroot bundle
      -> in-memory WASI filesystem
      -> diagnostics + versioned artifact manifest
```

`packages/ide` knows only the compiler protocol. The Weblings-specific Worker
and asset URLs live in `packages/compiler-browser`. Current public cases remain
`precompiled` with `editable: false`.

## Gate 1.5 follow-up

The emitted WASI artifact now executes in a fresh constrained Worker through
`packages/runtime-wasi`. Its real stdout and exit status can update a
repository-built Vooya summary mounted through `packages/preview-host`. Changed
source produced changed runtime output in local Chrome.

This is deliberately named Gate 1.5: the dynamic artifact is a WASI command;
the visible Vooya component remains precompiled. Exact observations and the
remaining toolchain gaps are in
[`browser-compiler-gate-2.md`](./browser-compiler-gate-2.md).

## What Gate 1 does not prove

- It targets `wasm32-wasip1`, not Vooya's current
  `wasm32-unknown-unknown` output.
- It does not run Vooya macros, Cargo dependency resolution, build scripts,
  `wasm-bindgen`, adapter generation, or TypeScript declaration generation.
- It does not compile the Vooya component that is mounted by the preview host.
- Toolchain assets still come from the candidate's mutable public demo host;
  production requires Vooya-owned, immutable, integrity-checked hosting.
- Cache Storage staging is not implemented, so replacement Workers currently
  rely on the browser HTTP cache.
- Peak memory and Firefox/Safari compatibility have not been measured.
- Arbitrary crates, untrusted execution, persistence, quotas, and security
  isolation remain out of scope.

## Gate 2 entry work

Before enabling Rust editing on a case:

1. inventory the exact Vooya macro, crate, target, bindgen, adapter, and type
   generation pipeline;
2. choose a constrained, dependency-pinned Vooya template;
3. self-host immutable compiler/sysroot assets and enforce their digests;
4. add a preview host with deterministic object URL and instance disposal;
5. compile and mount one real Vooya component; and
6. measure cold transfer/init/compile and peak memory in the browser matrix.

Until those checks pass, this route stays hidden and every normal case stays
precompiled.
