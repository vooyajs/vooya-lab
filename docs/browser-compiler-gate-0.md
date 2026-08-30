# Browser Compiler Gate 0 Inventory

Date: 2026-08-30. Status: candidate selected and the fixed-source Gate 1 spike
passed in local Chrome; browser and memory matrix remain open. This is not a
public compiler claim. See [`browser-compiler-gate-1.md`](./browser-compiler-gate-1.md).

## Selected candidate

Use [Weblings](https://github.com/AngelOnFira/weblings) at commit
`d0cd7a9f3af7d8249b3948ac0e19d2afc0d01633` as the first implementation
reference. It is MIT licensed and already demonstrates the properties Gate 1
needs:

- `rustc` executes as WASM inside a dedicated browser Worker;
- compilation targets `wasm32-wasip1`;
- source is compiled rather than matched to prebuilt outputs;
- rustc JSON diagnostics include source spans;
- cancellation terminates and replaces the Worker; and
- the implementation is non-threaded and does not require
  `SharedArrayBuffer`/cross-origin isolation.

The compiler artifacts come from
[`AngelOnFira/wasm-rustc`](https://github.com/AngelOnFira/wasm-rustc) at commit
`d7c1a08a60816ed824bb04f75fe79fa797996deb`, release tag
`artifacts-test-7`, also MIT licensed. The upstream lock file pins SHA-256
digests.

## Payload inventory

Published compressed release assets:

| Asset | Bytes | Approx. MiB |
| --- | ---: | ---: |
| `rustc-wasm.tar.zst` | 17,206,482 | 16.41 |
| `wasip1-sysroot.tar.zst` | 43,403,178 | 41.39 |
| Total | 60,609,660 | 57.80 |

Weblings' runtime comments describe an approximately 84 MB instantiated rustc
module and a 72 MB staged sysroot bundle. Those are upstream observations, not
measurements on Vooya Lab hardware. The Lab must measure transfer,
decompression, module compilation, Worker initialization, peak memory, fixed
compile, cancellation, and warm retry itself.

The payload must be loaded only after explicit user action on a compiler
experiment. It must never join the normal gallery or case-page critical path.

## Required host capabilities

- `WebAssembly.compileStreaming` or a byte-buffer fallback;
- a dedicated module Worker;
- Fetch and `ReadableStream` for progress;
- an in-memory WASI filesystem with preopened `/work`, `/tmp`, and `/sysroot`;
- Cache Storage when available so replacement Workers do not receive repeated
  main-thread clones; and
- Worker termination for cancellation because synchronous WASM compilation is
  not cooperatively interruptible.

Network access is needed only to retrieve versioned, integrity-pinned toolchain
assets. Source compilation itself must not call a remote compiler.

## Vooya-specific gap

Gate 1 proves fixed Rust source to a real `wasm32-wasip1` module. It does not yet
prove a Vooya component. Vooya's current build uses `wasm32-unknown-unknown`,
the Vooya macro/build pipeline, dependencies, `wasm-bindgen`, generated adapter
code, and TypeScript declarations. Therefore:

1. keep every current case `precompiled` and `editable: false`;
2. build the Gate 1 spike in an isolated experiment route and package;
3. decide whether to add a `wasm32-unknown-unknown` sysroot/backend or adapt a
   constrained WASI artifact only after Gate 1 measurements;
4. inventory Vooya macros and build-time dependencies before Gate 2; and
5. do not expose arbitrary Cargo manifests, crates.io, build scripts, or proc
   macros during the fixed-template gates.

## Alternative retained for comparison

[`oligamiq/rubrc`](https://github.com/oligamiq/rubrc) is a broader browser
toolchain with rustc, Cargo, LLVM, a virtual filesystem, and rust-analyzer. Its
own README calls the current v2 work pre-release, documents occasional session
failure, serialized compiler execution, no external dependencies/procedural
macros, and a requirement for COOP/COEP. It remains useful evidence for later
Cargo and target work, but its larger surface makes it a worse first Gate 1
dependency.

The official Rust Playground is not a browser-compiler candidate: its React
frontend sends work to an Axum backend using isolated compiler containers.

## Gate 0 exit checks

- [x] concrete browser-hosted rustc implementation identified;
- [x] immutable source and artifact revisions recorded;
- [x] license recorded;
- [x] compressed release sizes recorded;
- [x] Worker, filesystem, cache, diagnostic, and cancellation model identified;
- [x] locally verified Chrome fixed-source compile, diagnostics, cancellation,
  and clean retry;
- [ ] locally measured Chrome cold init and peak-memory profile;
- [ ] locally measured Firefox and Safari capability/failure profile;
- [ ] integrity and asset-hosting policy implemented; and
- [ ] focused browser-compiler issue/RFC linked before a public API is exposed.

Gate 1 implementation may proceed as a hidden Lab experiment while the open
checks are measured. It must not enable `execution.editable` on any public case.
