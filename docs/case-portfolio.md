# Vooya Lab Case Portfolio Strategy

Status: selection rubric and evidence plan for the Lab case library.

Read this together with [`lab-architecture.md`](./lab-architecture.md) before
proposing, prioritizing, or implementing a public case.

This strategy narrows the open case-selection question in
[Vooya Discussion #104](https://github.com/vooyajs/vooya/discussions/104) and its
[execution tracker #103](https://github.com/vooyajs/vooya/issues/103). It should
produce evidence for the larger-component contract in
[#60](https://github.com/vooyajs/vooya/issues/60), the host-rendered state path
in [#61](https://github.com/vooyajs/vooya/issues/61), and future precompiled
distribution work without silently expanding their release scope.

## The question the portfolio must answer

The case library must prove more than “Rust can produce a visual effect.” Its
long-term job is to answer:

> Why should an existing Vue or React application choose a bounded Rust/WASM
> capability, and why should it use Vooya instead of maintaining a one-off
> integration?

WebGPU and WebGL are not competitors that Vooya must defeat. They solve a
different class of problems and are often the correct rendering or massively
parallel compute layer. Vooya is valuable when a Web application needs a
repeatable host boundary around CPU-oriented Rust code, an existing
browser-compatible Rust crate, stateful domain logic, or a hybrid CPU/GPU
pipeline.

The durable product is therefore the integration contract:

- keep the existing host framework, router, design system, and page ownership;
- move one coherent capability into Rust rather than rewrite the application;
- generate typed props, events, declarations, adapters, build integration, and
  diagnostics;
- own mount, updates, failures, resources, and deterministic disposal;
- reuse browser-compatible Rust code and, eventually, distribute precompiled
  components to consumers without a Rust toolchain; and
- make the same bounded capability usable from more than one host framework.

CPU speed can be supporting evidence for a measured workload. It is not the
product definition.

## Workload map

Use the layer that matches the work instead of forcing every case through WASM.

### Keep it in the host application

Prefer JavaScript/TypeScript and the host framework for ordinary DOM, forms,
routing, accessibility, application state, network orchestration, and work that
is already clear and fast enough. A case must not move this work to Rust merely
to make Vooya appear necessary.

### Use Rust/WASM for a bounded CPU capability

Strong candidates have one or more of these properties:

- branch-heavy parsing, decoding, validation, indexing, search, diffing, or
  graph/geometry algorithms;
- compact, long-lived data whose useful operations can remain on one side of
  the boundary;
- deterministic state or domain rules that benefit from Rust's type system and
  can be shared with another Rust target;
- a browser-compatible Rust crate that would otherwise need bespoke WASM,
  adapter, lifecycle, type, and packaging glue; or
- a substantial unit of local computation that accepts and returns coarse,
  typed messages instead of crossing the JavaScript/WASM boundary per item.

WASM does not automatically provide parallelism. Threads require an explicit
Worker/shared-memory design and deployment prerequisites. Do not select a case
on the assumption that compiling Rust to WASM makes an algorithm multithreaded.

### Use WebGPU or WebGL for GPU work

Prefer WebGPU for massively parallel compute kernels and modern GPU rendering.
Prefer WebGL where its rendering model and compatibility are sufficient. A
shader-heavy visual effect is not evidence that it should have been implemented
as CPU-side WASM.

Hybrid cases are encouraged when the boundary is honest:

```text
host UI and product state
  -> Rust/WASM parses, validates, indexes, simulates, or prepares geometry
  -> typed buffers or coarse results
  -> WebGPU/WebGL renders or runs a suitable compute kernel
```

The hybrid story is stronger than pretending one layer replaces the others.

## Case classes

Every case declares one portfolio class:

- `flagship`: a user-relevant capability that proves a durable Vooya reason;
- `showcase`: an attraction surface that demonstrates craft but is not counted
  as core architectural proof;
- `foundation`: lifecycle, ABI, framework, toolchain, or packaging evidence;
- `experiment`: a clearly labeled research path with no product claim yet.

A healthy library may contain many showcases. The release and ecosystem story
must be anchored by flagships and foundations.

## Admission rubric

A proposed flagship must answer all of the following before implementation:

1. What useful outcome can a Web developer adopt or learn from?
2. Which coherent capability belongs in Rust, and what remains in the host?
3. Why is JavaScript/TypeScript alone not the preferred boundary for this
   particular case: crate reuse, shared code, correctness, memory locality, or a
   measured workload?
4. Could WebGPU/WebGL solve the same work better? If so, use it or explain the
   hybrid split.
5. What data crosses the boundary, how often, and in what representation?
6. Which Vooya product contract does the case exercise beyond raw
   `wasm-bindgen`: types, events, stores, lifecycle, errors, styles, adapters,
   toolchain, artifacts, or packaging?
7. What evidence would falsify the proposed value?
8. Can the case be copied or packaged honestly, including crates, assets,
   manifests, host files, headers, and limitations?

Reject or reclassify a proposal when its only answer is “WASM might be faster”
or when most of its time is spent in a shader that Vooya does not improve.

## Initial flagship set

The first portfolio should use three to five cases with different boundaries,
not five variations of Canvas animation.

### 1. Log Atlas — parse, index, query, and visualize local traces

**User outcome:** drop a large log/trace file, query it locally, and explore a
responsive waterfall without uploading private data.

**Rust boundary:** parsing, normalization, indexing, filtering, and compact
aggregations. The host owns file selection, query UI, accessibility, and the
page; Canvas or WebGL may render the dense timeline.

**Question answered:** can Vooya keep a large, long-lived data model inside one
WASM island and cross the boundary through typed coarse results rather than
serializing every row?

**Core pressure:** structured values, binary transport, failure diagnostics,
Worker options, progress/cancellation, and store lifecycle.

### 2. Mesh Clinic — inspect and repair irregular geometry

**User outcome:** load a mesh, locate non-manifold or degenerate topology, apply
bounded repairs, and export the result.

**Rust boundary:** format parsing, half-edge/topology traversal, validation,
repair planning, and structured diagnostics. WebGPU or WebGL owns shading and
rasterization.

**Question answered:** can Vooya compose a branch-heavy Rust geometry core with
a GPU renderer without claiming that WASM replaces the GPU?

**Core pressure:** binary assets, ownership of GPU/Canvas resources, large
buffers, async loading, errors, and deterministic disposal.

### 3. Workflow Replay — typed domain rules hosted by Vue and React

**User outcome:** run, inspect, rewind, and replay a non-trivial approval or
fulfilment workflow with the same behavior in two host applications.

**Rust boundary:** state transitions, invariants, validation, snapshots, and
deterministic replay. The host owns all rendered controls and product layout.

**Question answered:** is Vooya valuable when correctness and portable domain
logic matter more than graphics or a benchmark?

**Core pressure:** state components, user-defined types, events, error stages,
framework adapter parity, and instance isolation.

### 4. Source Surgeon — structural diff and code analysis

**User outcome:** compare large source trees, inspect structural changes, and
apply precise selections in a browser developer tool.

**Rust boundary:** parsing or tokenization, diffing, indexing, and result
projection. The host owns editor chrome, keyboard behavior, and accessible
presentation.

**Question answered:** can an existing Rust analysis capability become a typed,
lifecycle-safe component instead of a bespoke WASM wrapper?

**Core pressure:** browser-compatible crates, source maps, diagnostics, large
structured results, source Workbench reuse, and packaging.

### 5. Vector Tile Forge — a complete CPU/GPU pipeline

**User outcome:** load vector tiles or compact geometry, change simplification
and styling, and inspect the result immediately.

**Rust boundary:** binary decoding, geometry simplification, clipping, and
triangulation. WebGPU/WebGL owns rendering; the host owns controls and map UI.

**Question answered:** can one copyable Vooya case make the CPU/GPU split visible
and teach users to choose both deliberately?

**Core pressure:** assets, typed buffers, incremental updates, framework-owned
controls, renderer lifecycle, and deployment compatibility.

The exact cases may change after feasibility spikes. Preserve the architectural
questions even if a specific dataset, crate, or visual treatment changes.

## Required case-page explanation

Every flagship page includes a concise **Why this boundary?** section adjacent
to the live preview. It must show:

- what stays in Vue/React;
- what Rust/WASM owns;
- whether WebGPU/WebGL is an alternative, a complement, or not applicable;
- the shape and frequency of data crossing the boundary;
- which existing crate or shared Rust capability is reused;
- the Vooya glue that the author did not have to maintain by hand; and
- measured evidence or an explicit statement that no speed claim is made.

Do not hide this in an internal evidence file. The public explanation is part
of the product education path.

Suggested metadata extension:

```ts
type CaseProof = {
  portfolioClass: "flagship" | "showcase" | "foundation" | "experiment";
  question: string;
  hostOwns: string[];
  rustOwns: string[];
  gpuRelationship: "alternative" | "complement" | "not-applicable";
  boundary: {
    inputs: string[];
    outputs: string[];
    updatePattern: string;
  };
  reusedCrates: string[];
  vooyaContracts: string[];
  alternatives: string[];
  performanceClaim?: {
    statement: string;
    benchmark: string;
  };
};
```

`performanceClaim` is absent by default. If present, it must link to a
reproducible benchmark with device, browser, dataset, baseline, warm-up, and
measurement boundaries.

## Portfolio review

Review the portfolio as a set at each planning checkpoint:

- At least half of the selected flagship work should be valuable without a GPU.
- At least one flagship should prove host-rendered Rust state or logic.
- At least one flagship should demonstrate an honest CPU/GPU composition.
- At least one should exercise a real browser-compatible Rust crate or shared
  Rust codebase.
- The set must cover lifecycle, errors, updates, disposal, typed integration,
  and production artifacts—not only successful first mount.
- Showcase count must not be used as a substitute for architectural coverage.

The result should let a skeptical developer conclude not that “WASM replaces
the GPU,” but that “Vooya gives my Web application a maintainable way to adopt
the Rust capability that belongs there.”
