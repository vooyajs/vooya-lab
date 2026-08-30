# R-tree Scatter Explorer Specification

## Identity and status

- Portfolio class: `foundation`
- Maturity: `live`
- Execution: `precompiled`
- Source editable: `false`
- Distribution: `demo-only`
- Owning repository: `vooyajs/vooya-lab`
- Last verified: existing repository evidence; reverify during shell migration

## User outcome

Explore nearest-neighbor queries across a large deterministic point set, switch
between a Rust `rstar` R-tree and a transparent JavaScript linear scan, and read
the complete case source without installing Rust.

## Question

Can a real Rust spatial-index crate remain behind a bounded Vooya component
while Vue owns the surrounding product controls and comparison experience?

## Why this boundary?

### Host owns

- gallery composition and navigation;
- point-count and zoom controls; and
- switching and explaining the comparison implementation.

### Rust/WASM owns

- deterministic point generation;
- construction and lifetime of the `rstar` R-tree;
- local pointer-driven nearest-neighbor queries; and
- the component-owned Canvas presentation.

### GPU relationship

`not-applicable`. This case uses a Canvas surface and does not claim a WebGPU or
WebGL advantage. A future GPU scatter renderer would be a separate rendering
decision and would not replace the spatial-index question automatically.

### Boundary crossing

- Inputs: numeric `points` and `zoom` props on host updates.
- Outputs: a component-owned Canvas result; pointer queries remain local.
- Update pattern: coarse prop updates, high-frequency pointer work inside the
  Rust component.

### Vooya value

- Rust-file build and crate integration;
- generated host adapter and typed props;
- component mount/update/disposal; and
- source and style ownership within one case.

### Alternatives

- plain JavaScript linear scan, shown only as a transparent baseline;
- an optimized JavaScript spatial-index library; or
- a custom `wasm-bindgen` wrapper around `rstar` with case-owned lifecycle and
  adapter glue.

No universal Rust/WASM speed claim is made. The current comparison demonstrates
crate reuse and workload shape, not language superiority.

## Experience and source

- Live Workbench: Preview and Source share one fixed-height surface; wide
  desktops use a split view and compact layouts use explicit Preview/Source
  tabs.
- Preview: interactive point field with pointer nearest-neighbor queries in a
  stable-height stage when switching implementations.
- Controls: implementation, point count, zoom, and reset.
- Source: Rust, CSS, Vue host, baseline, metadata, and public case entry.
- Copy/install: the Workbench toolbar copies the currently active file; complete
  component copy is not yet honest because the case depends on application
  internals.
- Source Workbench: read-only; compile controls are absent. The Compiler alpha
  link opens a separate controlled probe and does not imply this `rstar` crate
  graph is browser-editable.

## Execution and isolation

- Rust is compiled during the repository build.
- No browser or remote Rust compiler is used.
- No Worker, iframe sandbox, or special network permission is claimed.
- The component owns its Canvas resources and must dispose them on unmount.

## Distribution

Current mode is `demo-only`. A future copy mode must include Rust/CSS, host
integration, Cargo crate/feature declarations, Vooya packages, TypeScript
configuration, and a case-local detail composition that does not import
`apps/web`.

## Acceptance and evidence

- [x] Rust-file component compiled by the Lab Vooya entry.
- [x] `rstar` builds an R-tree for the selected point count.
- [x] Pointer queries update in the Rust and baseline implementations.
- [x] Runtime props change point count and zoom.
- [x] Source is readable in the composed Workbench.
- [x] Preview and Source remain in one responsive Live Workbench context.
- [x] The detail page exposes the standard **Why this boundary?** section.
- [x] The case no longer imports private `apps/web` components or types.
- [x] Filesystem metadata generates the public route and directory entry.
- [ ] Case-local lifecycle evidence covers dispose and remount explicitly.
- [ ] Production build evidence is linked from this spec.
- [ ] A complete copy or package path is available before changing distribution.

Evidence currently lives in the case implementation and
`apps/web/tests/e2e/lab.spec.ts`; it must move to focused case evidence during
the restructuring.

## Known gaps and upstream issues

- No focused disposal/remount test or complete copy bundle exists.
- `distribution.mode` remains `demo-only`; active-file copy is intentionally not
  presented as a dependency-complete installable unit.
- Browser Rust editing remains intentionally disabled while compiler Gate 0 and
  Gate 1 evidence is incomplete.

## Extraction decision

Keep the scatter composition case-local. Extract only a general preview host,
source enumerator, evidence helper, or typed case entry after another independent
case requires the same public behavior.

## Non-goals

- proving that Rust always beats JavaScript;
- replacing WebGPU/WebGL rendering;
- publishing `rstar` as a new wrapper package; or
- enabling browser Rust editing before the compiler gates pass.
