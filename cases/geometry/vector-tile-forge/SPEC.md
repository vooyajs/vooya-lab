# Vector Tile Forge Specification

## Identity and status

- Portfolio class: `flagship`
- Maturity: `experimental`
- Execution: `precompiled`
- Source editable: `false`
- Distribution: `demo-only`
- Owning repository: `vooyajs/vooya-lab`
- Last verified: `2026-08-30`

## User outcome

Adjust simplification tolerance for a compact local vector tile, inspect the
vertex/payload reduction, and reveal the polygon triangles consumed by a Web
renderer without uploading geometry.

## Question

Can Vooya make a copyable CPU-geometry/Web-renderer boundary visible while
keeping decoding, simplification, and triangulation behind one Rust lifecycle?

## Why this boundary?

### Host owns

- product controls, labels, SVG presentation, and future WebGPU lifecycle.

### Rust/WASM owns

- `geojson` decode, `geo` simplification, `earcutr` triangulation, retained
  source geometry, and compact render projection.

### GPU relationship

`complement`

The GPU is appropriate for high-volume rasterization. Branching format decode,
feature rules, simplification, and triangulation remain a bounded CPU stage.
The first slice uses SVG so the transferred representation is inspectable.

### Boundary crossing

- Inputs: one tolerance action.
- Outputs: layer paths, triangle polygons, and aggregate metrics.
- Update pattern: one coarse action recomputes one bounded snapshot.

### Vooya value

- Cargo/build integration, typed Store actions and snapshots, framework
  subscription, error boundary, and disposal replace bespoke glue.

### Alternatives

- Turf/TypeScript, server tiles, a custom WASM Worker, or GPU compute.

## Experience and source

- Preview: host-rendered terrain, water, roads, and optional triangles.
- Controls and reset: tolerance slider, triangle overlay, and reset.
- Source files: Rust Store, CSS, Vue host, manifest, and spec.
- Props/events: Store action + structured snapshot.
- Copy/install: read-only source copy; complete packaging is not claimed.
- Responsive/reduced motion: stable Workbench; no essential animation.

## Execution and isolation

- Compiler/runtime: repository precompiled `wasm32-unknown-unknown` Store.
- Boundary: trusted main thread; no sandbox or Worker claim.
- Network/storage: embedded case dataset; no runtime network/storage.
- Cancellation/disposal: synchronous bounded tile; host disposal owns Store.
- Headers: ordinary WASM/SVG only.

## Distribution

- Exported files: listed in `case.json`.
- npm: `@vooya/vue`.
- Rust: `geo 0.33.1` without defaults, `geojson 1.0.0` without defaults,
  `earcutr 0.5.0`.
- Assets: case-authored inline synthetic GeoJSON.
- Deployment: static shared WASM hosting.

## Acceptance and evidence

- [x] Clean dependency path
- [x] Production build
- [x] Typed mount and update
- [x] Deterministic reset
- [ ] Rust-error recovery
- [ ] Dispose/remount evidence
- [x] Public **Why this boundary?**
- [x] Focused browser evidence

Evidence locations: Lab E2E, production build output, public route.

## Known gaps and upstream issues

- Shared artifact isolation remains `vooyajs/vooya#106`.
- This first tile uses GeoJSON rather than binary MVT/PBF and returns SVG-ready
  strings rather than transferable typed buffers.

## Extraction decision

Keep local until binary tile decode or another case proves a reusable render
projection package and independent lifecycle.

## Non-goals

- Complete map SDK, global projection handling, navigation, server tile stack,
  or a GPU-vs-WASM benchmark.
