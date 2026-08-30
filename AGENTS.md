# Vooya Lab Agent Contract

This file applies to the whole repository. A nested `AGENTS.md` may add stricter
scope-specific rules; it does not replace this contract.

## Required context

Before changing product structure, cases, shared packages, the IDE, or compiler
experiments, read:

1. `README.md`;
2. `docs/lab-architecture.md`;
3. `docs/case-portfolio.md`;
4. `docs/case-spec.md`; and
5. `docs/visual-identity.md` when changing shared visuals or generated assets;
   and
6. the nearest package README, `SPEC.md`, and nested `AGENTS.md`.

Do not infer a current capability from a target architecture document. Inspect
the implementation and tests before changing public claims.

## Product direction

- Vooya Lab is both a public gallery and an alpha self-hosting environment.
- The public experience leads with a useful or striking outcome, then explains
  the host/Rust/GPU boundary and the Vooya integration value.
- WebGPU and WebGL are collaborators when the workload belongs on the GPU. Do
  not move shader work to CPU-side WASM to manufacture a Vooya use case.
- The durable portfolio is ecosystem-first: reuse browser-compatible Rust crates
  or shared Rust capabilities through bounded, typed component or store
  contracts.
- Do not claim universal Rust, WASM, WebGPU, or Vooya performance. A performance
  statement requires the evidence defined in `docs/case-spec.md`.

## Repository boundaries

- `vooyajs/vooya` owns compiler, ABI, runtime, adapters, Rust toolchain
  integration, declarations, and supported authoring contracts.
- This repository owns cases, public presentation, source exploration, preview
  hosts, browser-compiler research, and evidence-gated ecosystem packages.
- A Lab workaround for a Core defect must be temporary, documented in the
  owning case spec, and linked to a focused Core issue.
- Dependencies flow from applications to cases and packages, and from cases to
  packages. Packages must not import applications or cases. Cases must not
  import private application internals in the target architecture.

Current violations may be migrated incrementally. Record them in the owning
`SPEC.md`; do not hide them behind aliases or add new violations for
convenience.

## Case work

- Every case directory has `case.json` and `SPEC.md` as one independent spec
  unit. `case.json` is the machine-readable projection; `SPEC.md` owns the
  rationale, boundaries, acceptance evidence, and known gaps.
- Start a new case from `cases/_template/SPEC.md` and follow
  `cases/AGENTS.md`.
- A case route is derived from its filesystem location. Do not add a second
  hand-maintained route registry.
- A copied or packaged case must contain the complete integration unit: Rust,
  host code, styles, manifests, dependencies, assets, headers, and limitations.
- Do not mark a case `live`, `flagship`, or copy-ready before its spec acceptance
  criteria and evidence are satisfied.

## IDE and compiler work

- Preserve `packages/ide` as a toolchain-neutral editor surface. Add compiler,
  sandbox, and preview behavior through typed composition contracts rather than
  hard-coding one runner into CodeMirror components.
- `editable` is a product capability flag, not a security boundary. It defaults
  to `false` for current Rust cases.
- A visible Build, Run, or Apply control must execute a real declared compiler
  mode. Never simulate a successful Rust build.
- Browser compilation, build isolation, and runtime isolation are three
  separate designs. Read `docs/browser-compiler.md` before touching them.
- Read `docs/browser-compiler-gate-2.md` before changing the hidden compiler
  experiment. Gate 1.5 executes a browser-built WASI command and feeds its
  result into a precompiled Vooya shell; it is not a browser-built Vooya
  component and must not be presented as Gate 2.
- Gate 1.75 proves only an import-free `#![no_core]`
  `wasm32-unknown-unknown` module. It does not prove a matching Rust sysroot,
  ordinary Rust crates, Vooya dependencies, procedural macros, or wasm-bindgen.
- Gate 1.9 proves an exact-revision unknown-target sysroot, ordinary `std`,
  allocation, linking, and import-free execution with a patched browser rustc.
  It still does not prove Cargo dependency resolution, Vooya/wasm-bindgen
  macros, browser-side wasm-bindgen post-processing, or a browser-built Vooya
  component. Do not present Gate 1.9 as Gate 2.
- Gate 1.95 proves one pinned, exact-toolchain `vooya-core` reactive rlib after
  separating its DOM feature. It does not prove the DOM runtime, Cargo,
  procedural macros, browser-side wasm-bindgen post-processing, or a
  browser-built Vooya component. Do not present Gate 1.95 as Gate 2.
- Gate 1.97 proves one fixed, reviewed wasm-bindgen ABI scaffold, preservation
  of its linker metadata, official browser-resident wasm-bindgen
  post-processing, and invocation through generated glue. It does not prove
  editable procedural macros, arbitrary signatures, DOM components, Cargo, or
  a browser-built Vooya component. Do not present Gate 1.97 as Gate 2.
- Controlled Gate 2 proves only the reviewed `vooya-dom` profile: an editable
  fixed-ABI Rust function is linked into a trusted, pre-expanded Vooya DOM
  scaffold; official wasm-bindgen runs in a browser Worker; and the exact glue
  and WASM from that request mount through `packages/preview-host`. It does not
  prove editable procedural macros, arbitrary Rust signatures, Cargo manifests,
  arbitrary dependencies, or safe execution of untrusted code. Keep public
  cases `precompiled` and `editable: false` until a case spec explicitly opts
  into this profile and records its own acceptance evidence.
- Do not call a main-thread or Worker-hosted DOM-capable WASM module a sandbox.

## Development workflow

1. Update or create the owning spec before a structural or public-contract
   change.
2. Implement the smallest vertical slice through public package boundaries.
3. Record discovered Core gaps in the case spec and open or link the owning
   issue before making a workaround durable.
4. Update machine-readable metadata, evidence, and focused tests together.
5. Keep migrations deployable and reversible after each change.

When a case adds a new Rust module or Store export to `cases/lib.rs`, restart
the Vite development server before browser verification. The current alpha
pipeline rebuilds the authored WASM entry at server start; Vue/manifest HMR may
otherwise expose the new route while the running WASM module still lacks its
exports. A production build remains the authoritative clean-entry check.

Use the repository package manager and existing scripts:

```sh
pnpm install
pnpm validate:cases
pnpm typecheck
pnpm build
pnpm test:e2e
```

Run checks in proportion to the changed surface. Do not rewrite unrelated user
changes or generated workspaces.

## Issue and RFC discipline

- Documentation, focused examples, and tests may be implemented directly.
- Bugs, public APIs, compiler/runtime behavior, security boundaries, and major
  architecture changes start with an issue or RFC in the owning repository.
- Discussion #104 is the idea and case-selection front door; Issue #103 tracks
  accepted alpha-program execution. A discussion proposal is not automatically
  a beta commitment.

## Definition of done

A change is complete only when its public behavior, spec, metadata, evidence,
and tests agree. A visually convincing mock, screenshot, or generated asset is
not evidence of a live Vooya execution path.
