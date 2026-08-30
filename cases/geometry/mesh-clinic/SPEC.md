# Mesh Clinic Specification

## Identity and status

- Portfolio class: `flagship`
- Maturity: `experimental`
- Execution: `precompiled`
- Source editable: `false`
- Distribution: `demo-only`
- Owning repository: `vooyajs/vooya-lab`
- Last verified: `2026-08-30`

## User outcome

Inspect a deliberately damaged OBJ mesh, identify topology defects, apply a
bounded safe repair, rotate the diagnostic projection, and see exactly which
work belongs to the Rust geometry core and which belongs to the Web renderer.

## Question

Can Vooya keep branch-heavy mesh parsing and topology traversal in a reusable
Rust capability while Vue remains responsible for controls, accessibility, and
the rendering technology?

## Why this boundary?

### Host owns

- specimen, repair, rotation, reset, responsive layout, and accessible labels;
- the current SVG renderer and any future WebGL/WebGPU renderer.

### Rust/WASM owns

- `tobj` OBJ parsing, triangle normalization, edge-incidence maps;
- degenerate, duplicate, boundary, and non-manifold diagnostics;
- bounded removal of degenerate/duplicate faces and projected triangle data.

### GPU relationship

`complement`

Topology validation is irregular CPU work. Rasterization and dense picking are
renderer work. The first slice uses host SVG so that this ownership line stays
inspectable; WebGPU/WebGL may replace SVG without replacing the Rust clinic.

### Boundary crossing

- Inputs: specimen/repair actions and one rotation scalar.
- Outputs: a bounded snapshot of metrics, diagnostic strings, and projected
  triangle polygons.
- Update pattern: one coarse action produces one host-renderable snapshot.

### Vooya value

- Instance lifecycle, typed actions/snapshot, Vue subscription, build wiring,
  and deterministic disposal replace a handwritten `wasm-bindgen` store.

### Alternatives

- TypeScript OBJ/topology implementation, GPU compute validation, a bespoke
  `wasm-bindgen` bridge, or embedding a full CAD engine.

## Experience and source

- Preview: host-rendered mesh projection with defect highlighting and metrics.
- Controls and reset: damaged/clean specimen, repair, rotation, and reset.
- Source files: Rust Store, case CSS, Vue host, manifest, and spec.
- Props/events: Store actions and structured snapshot; no per-face JS calls.
- Copy/install action: read-only source copy; complete packaging is not claimed.
- Responsive and reduced-motion behavior: Workbench tabs at compact widths;
  no essential animation.

## Execution and isolation

- Compiler/runtime path: repository build to `wasm32-unknown-unknown`.
- Worker/frame boundary: trusted main-thread precompiled Store; no sandbox.
- Network/storage policy: no runtime network or persistent storage.
- Cancellation and disposal: synchronous bounded specimens; Store disposed with
  the Vue host.
- Required headers/capabilities: ordinary WASM and SVG; no isolation headers.

## Distribution

- Exported files: files listed in `case.json`.
- npm packages: `@vooya/vue`.
- Rust crates/features: `tobj = 4.0.5`, default features disabled.
- Cargo/TypeScript changes: Lab authored-root dependency and generated Store
  declarations.
- Assets: case-owned inline OBJ specimens; no external license.
- Deployment: static host able to serve the shared WASM artifact.

## Acceptance and evidence

- [x] Clean repository dependency path
- [x] Production build
- [x] Typed mount and action update
- [x] Failure-free reset behavior
- [ ] Development Rust-error recovery
- [ ] Two-instance dispose/remount evidence
- [x] Public **Why this boundary?** explanation
- [x] Focused browser evidence

Evidence locations: `apps/web/tests/e2e/lab.spec.ts`, production build output,
and this case's public route.

## Known gaps and upstream issues

- The Lab shared WASM artifact includes case-only crates; isolated authored-root
  artifacts remain tracked by `vooyajs/vooya#106`.
- The first repair intentionally removes only degenerate and duplicate faces;
  hole filling, welding, winding repair, binary upload, and export remain open.

## Extraction decision

Keep the clinic case-local until a second geometry case reuses its topology
snapshot or a non-Lab consumer needs a versioned mesh-inspection package.

## Non-goals

- Full CAD repair, a universal mesh benchmark, GPU replacement, or untrusted
  file sandboxing.
