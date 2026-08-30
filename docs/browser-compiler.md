# Browser Compiler Exploration Contract

Status: Gates 1 through 1.97 and one controlled Gate 2 DOM template passed in
local Chrome. The Gate 1 WASI probe is now exposed as a capability-labelled
public alpha; the larger locally configured Gate 2 profile is not published by
the deployment workflow. The Gate 2 profile compiles an
editable, fixed-ABI Rust unit, links it into a trusted Vooya DOM scaffold, runs
official wasm-bindgen in the browser, and mounts the exact emitted bytes. It is
not arbitrary Cargo, editable procedural macros, or an untrusted-code service.
The public alpha claims only the gates that its configured assets actually
support. See
[`browser-compiler-gate-0.md`](./browser-compiler-gate-0.md) for the candidate
inventory and [`browser-compiler-gate-1.md`](./browser-compiler-gate-1.md) for
the first implementation evidence. The exact Vooya pipeline, Gate 1.5 evidence,
and Gate 2 blockers are recorded in
[`browser-compiler-gate-2.md`](./browser-compiler-gate-2.md).

## Objective

Explore whether a browser can edit an ordinary Vooya Rust case, compile it to
the real Vooya WASM/component artifacts, return source diagnostics, and mount the
result without a local or remote compiler service.

The preferred long-term experience is browser-resident compilation. Preference
does not remove feasibility, payload, licensing, compatibility, memory, or
security gates.

## Separate products

Keep these boundaries independent:

1. `packages/ide` presents and edits a virtual workspace.
2. A compiler protocol accepts a workspace snapshot and emits progress,
   diagnostics, and artifacts.
3. A compiler Worker executes one selected toolchain implementation.
4. A preview host mounts successful artifacts and owns reset/disposal.
5. A runtime sandbox, if untrusted code is ever allowed, owns capabilities,
   origin, network, storage, and abuse policy.

An editor is not a compiler. A compiler Worker is not a runtime sandbox. A
sandboxed preview is not build isolation.

## Current public mode

Current Lab Rust cases use repository-built, precompiled WASM and
`editable: false`. Visitors may navigate and copy source, change documented
runtime props, and replay the preview. No enabled control may imply that edited
Rust is being compiled in the browser.

`#/experiments/browser-compiler` is linked from the global navigation and from
precompiled Live Workbenches as **Compiler alpha**. Its default WASI path edits,
compiles, executes, and validates one real Rust command entirely in the browser.
Unknown-target capability is labelled by the exact configured gate. It must not
claim arbitrary Cargo or imply that a precompiled case's crate graph is editable.

Compiler feedback and Preview share one Live Workbench. State transitions are
visible beside the source. The last successful preview remains mounted while a
new request prepares/compiles and is replaced only after the new artifact is
ready; failed builds retain the prior result and show diagnostics.

Starting a build reveals Preview on compact Workbench layouts and presents an
accessible loading layer for the complete local pipeline: queue, toolchain
preparation, compilation, linking, emission, binding, execution, and mount. The
loading layer must preserve the previous successful realm behind it, expose
cancellation, keep the work surface height stable, and clear on success,
failure, or cancellation. Wide split layouts remain split.

## Protocol-first packages

The target package boundaries are hypotheses to validate:

```text
packages/ide                 # existing editor/file-tree surface
packages/compiler-protocol   # serializable request/event/artifact types
packages/compiler-client     # Worker lifecycle, cancellation, version checks
packages/virtual-workspace   # files, manifests, lockfile, cache keys
packages/preview-host        # mount, failure, reset, deterministic disposal
packages/compiler-browser    # selected browser toolchain experiment
packages/bindgen-browser     # pinned wasm-bindgen WASI command lifecycle
packages/runtime-module      # import-free unknown-target export execution
packages/runtime-wasi        # constrained execution of Gate 1 WASI artifacts
```

`compiler-protocol` must not depend on CodeMirror, Vue, React, a case, or the
toolchain implementation.

Minimum state model:

```text
idle -> queued -> preparing -> compiling -> linking -> emitting
  -> succeeded | failed | cancelled | terminated
```

Every event carries a request ID and compiler/toolchain version. Diagnostics
carry severity, stage, file, byte or line/column range, message, and optional
related locations. Successful output carries an artifact manifest rather than
unstructured blobs.

## Feasibility gates

### Gate 0 — toolchain inventory

Identify a concrete compiler implementation that can legally and technically
execute in a browser or a browser-hosted WASI environment. Measure compressed
download size, initialization memory/time, required host calls, Worker support,
and supported browsers. Do not design around an unspecified “rustc.wasm”.

### Gate 1 — real fixed-source compile

Compile one fixed Rust source to a valid WASM module entirely in the browser.
The result must be produced by the declared compiler, not selected from a cache
of known outputs.

### Gate 1.9 — ordinary Rust on the Vooya target

Build the browser compiler and `wasm32-unknown-unknown` standard library from
one exact Rust revision, compile ordinary `std` code with allocation, link it
inside the compiler Worker, and execute the import-free output in a fresh
runtime Worker. This gate validates the target foundation; it does not include
Cargo dependencies, procedural macros, wasm-bindgen post-processing, or Vooya.

### Gate 1.95 — one macro-free Vooya runtime profile

Compile edited Rust against an exact-toolchain `vooya-core` rlib, execute the
result in a fresh Worker, and reflect it through the preview lifecycle. The
profile must be produced by a reviewable Core feature boundary rather than a
case-local reimplementation. This gate proves one pinned library dependency;
it does not prove DOM components, Cargo resolution, procedural macros, or
wasm-bindgen post-processing.

### Gate 1.97 — controlled binding scaffold

Compile editable ordinary Rust against a fixed, reviewed ABI scaffold whose
wasm-bindgen metadata was pre-expanded from version `0.2.115`. Preserve that
metadata through the browser linker, run the official pinned
`wasm-bindgen-cli-support` implementation as a WASI command in another Worker,
import its generated JavaScript glue in a fresh runtime Worker, and invoke the
browser-emitted export. This gate does not support editable procedural macros,
arbitrary signatures, DOM components, Cargo resolution, or a browser-emitted
Vooya component.

### Gate 2 — one fixed Vooya template

Compile one constrained Vooya component with pinned source dependencies and no
network registry resolution. Emit genuine compiler diagnostics and mount the
artifact through the preview host.

Passed locally on 2026-08-30 for the controlled `vooya-dom` dependency profile.
The editable source owns only `vooya_user_answer(i32) -> i32`; the trusted,
pre-expanded scaffold owns DOM access, the component lifecycle, and the stable
preview ABI. Extending that editable ABI or dependency surface requires a new
reviewed, content-addressed profile.

### Gate 3 — editable virtual workspace

Allow edits to predefined files, cancellation by terminating the Worker,
deterministic reset, stable cache keys, build failure recovery, and artifact
cleanup. Enable `editable` for only this constrained case.

### Gate 4 — dependency and Cargo model

Design crate source provenance, manifests, features, lockfiles, build scripts,
proc macros, registry/cache behavior, target-specific dependencies, and offline
operation. Unsupported Cargo semantics must fail clearly rather than be
translated by case-specific code.

### Gate 5 — untrusted authoring

Only after a separate threat model: isolate build and runtime origins, define
network/storage capabilities, enforce quotas and termination, validate artifact
and dependency provenance, and design abuse response. This is not required for
the first editable template.

## First spike acceptance

The first implementation spike is successful only if it:

- runs locally in a Worker without a remote compiler request;
- compiles changed source rather than returning a prebuilt artifact;
- reports at least one real syntax/type error at the correct source location;
- emits a versioned artifact manifest;
- mounts the exact browser-emitted Vooya result through the preview lifecycle;
- supports cancellation through Worker termination and a clean retry;
- removes Workers, object URLs, previews, and temporary workspace state on
  reset/disposal; and
- reports measured payload, initialization, compile, and memory observations
  without calling the path production-ready.

If Gate 0 or Gate 1 fails, record the result. A remote compiler may remain a
separate optional experiment, but it must not be presented as fulfillment of
the browser-resident objective.

## Non-goals for the first spike

- arbitrary crates.io dependencies;
- a complete Cargo workspace;
- rust-analyzer or a VS Code clone;
- persistent user projects;
- untrusted public code execution;
- a production SLA or universal browser support; or
- making the full Lab wait for browser compilation.

## Required issue boundary

The compiler protocol, toolchain implementation, security model, and any Core
changes each require a focused issue/RFC in the owning repository before public
API implementation. Keep feasibility notes and measured failures in the Lab;
keep compiler/runtime product contracts in `vooyajs/vooya`.
