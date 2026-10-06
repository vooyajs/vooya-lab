# Bevy World Inspector Specification

## Identity and status

- Portfolio class: `showcase`
- Maturity: `experimental`
- Execution: `precompiled`
- Source editable: `false`
- Distribution: `demo-only`
- Owning repository: `vooyajs/vooya-lab`
- Last verified: `2026-08-30`

## User outcome

Run, pause, single-step, inspect, spawn, and remove elastically colliding agents
in a real headless Bevy ECS world while Vue renders the complete inspector,
impact feedback, timing metrics, and world projection.

## Question

Can a current, feature-configured Bevy ECS crate compile through Vooya without
Lab-only dependency translation, remain instance-scoped, and expose a bounded
world snapshot to an ordinary Vue product surface?

## Why this boundary?

### Host owns

- playback timing and accessible pause/step/reset controls;
- the DOM world projection, entity selection, inspector, and responsive layout;
- page copy, source exploration, focus, and product navigation.

### Rust/WASM owns

- the Bevy `World`, entity/component storage, resources, and `Schedule`;
- deterministic movement, boundary, pair-contact, impact, energy, and pulse systems;
- a case-authored equal-mass elastic collision solver using Bevy mutable pair
  queries; Bevy ECS does not claim to be the physics engine;
- spawn/despawn semantics, stable public agent ids, selection validity, and
  the structured public world snapshot.

### GPU relationship

`complement`

This first stage is deliberately headless and host-rendered. Its maximum 48
bodies use an inspectable O(n²) CPU contact pass: small, branch-heavy, mutating
work where GPU upload/readback, synchronization, and atomic resolution would
dominate. A later WebGL2/WebGPU renderer could consume the same world or compact
render projection. Much larger, regular particle workloads may justify GPU
compute or a spatial broad phase, but that is a different measured boundary.

### Boundary crossing

- Inputs: coarse actions (`tick`, `toggle_running`, `select`, `spawn_agent`,
  `despawn_selected`, `reset`) with primitive arguments.
- Outputs: one cached structured snapshot containing the world tick, running
  state, system/entity/contact counts, selected id, impact state, and at most 48
  visible agent projections.
- Update pattern: while running, Vue requests one bounded ECS step every 40ms;
  Rust runs its schedule and publishes one coalesced snapshot notification.
  Host `requestAnimationFrame` measures presentation FPS independently.

### Vooya value

- exact Cargo dependency and feature configuration through the Vite build;
- generated Rust Store factory and Vue Store lifecycle adapter;
- structured nested snapshot conversion and primitive action ABI;
- instance creation, subscription, reset, unmount, and deterministic disposal;
- source-linked Cargo/rustc diagnostics when the ecosystem crate is incompatible.

### Alternatives

- a Vue array updated by TypeScript timers;
- a custom ECS implemented solely for the demo;
- a handwritten wasm-bindgen handle, JS callback registry, snapshot encoder,
  and Vue unmount integration around Bevy.

## Experience and source

- Live Workbench: fixed-height Preview/Source surface with container-aware tabs.
- Preview: a headless-world console, spatial agent projection, collision rings,
  selected-entity inspector, system schedule, host FPS/ECS rate/contact metrics,
  and playback controls.
- Controls and reset: run/pause, single step, select, spawn, despawn, and reset.
- Source files: Rust Bevy Store, Vue host, case CSS, manifest, spec, and entry.
- Copy/install action: active-file copy only; the case is not dependency-complete
  until one packed Store artifact can be consumed outside the Lab.
- Responsive and reduced-motion behavior: controls wrap, the world remains
  selectable without animation, and the ledger/inspector own their scrolling.

## Execution and isolation

- Compiler/runtime path: repository build to `wasm32-unknown-unknown` through
  the Vooya Vite pipeline.
- Bevy dependency: exact `bevy_ecs = 0.18.1`, `default-features = false`, with
  only `std`; this is the newest checked release compatible with the currently
  selected Rust 1.94 toolchain. Bevy ECS 0.19.x requires Rust 1.95.
- Worker/frame boundary: none; trusted headless ECS Store in the application realm.
- Network/storage policy: no network, persistent storage, renderer, or assets.
- Cancellation and disposal: each tick is bounded; the Vue adapter unsubscribes
  and disposes the owned Store on unmount.
- Required headers/capabilities: ordinary WASM support; no GPU or cross-origin
  isolation is claimed by this headless stage.

## Distribution

- Exported files: those listed in `case.json`.
- npm packages: `@vooya/vue = 0.2.0-alpha.0`.
- Rust crates/features: `bevy_ecs = 0.18.1`, no default features, `std` only;
  coordinated `vooya` runtime.
- Cargo/TypeScript changes: the Lab root currently owns dependency aggregation;
  generated user-defined Store snapshots still require the temporary narrowing
  tracked by upstream issue #105.
- Assets, license, and attribution: no assets; Bevy ECS is MIT OR Apache-2.0.
- Deployment requirements: ordinary static Vooya WASM hosting.

Distribution remains `demo-only`. A shared Lab WASM entry also means this heavy
crate can affect unrelated case payloads; per-case artifact isolation and a
packed precompiled-consumer contract must be measured before copy/package claims.

## Acceptance and evidence

- [x] Exact Cargo version/features appear in the generated manifest
- [x] Development build and Rust-error recovery
- [x] Production build and artifact-size delta
- [x] Real Bevy `World`, components, resources, and `Schedule` execute
- [x] Run, pause, step, select, spawn, despawn, and reset update snapshots
- [x] Snapshot entity count stays bounded at 48
- [x] Pairwise elastic contacts mutate velocity/position and publish impact/count evidence
- [x] Host render FPS is measured separately from the fixed ECS step rate
- [ ] Deterministic dispose/remount with two independent instances
- [x] Public **Why this boundary?** explanation
- [x] Focused browser evidence
- [ ] React host parity
- [ ] Minimal WebGL2 renderer follow-up has its own spec and lifecycle evidence

Evidence locations:

- `apps/web/tests/e2e/lab.spec.ts`
- generated `.vooya/build/Cargo.toml` and `.vooya/types/`
- production `dist/assets/vooya_app_bg-*.wasm`
- [Vooya Discussion #104](https://github.com/vooyajs/vooya/discussions/104)

## Known gaps and upstream issues

- Bevy ECS 0.19.1 currently requires Rust 1.95 while the resolved Vooya/Lab
  stable toolchain is Rust 1.94. The case pins 0.18.1 rather than weakening the
  crate's MSRV or silently selecting a different compiler.
- [vooyajs/vooya#105](https://github.com/vooyajs/vooya/issues/105): concrete
  generated user-defined Store snapshot types.
- [vooyajs/vooya#106](https://github.com/vooyajs/vooya/issues/106): lazy,
  isolated WASM artifacts for independent authored roots. This case supplied the
  first measured heavy-route payload evidence.
- [vooyajs/vooya#107](https://github.com/vooyajs/vooya/issues/107): Rust HMR
  rebuild cleanup may race and fail with `ENOTEMPTY`; restarting Vite recovers
  the generated application workspace.
- The published alpha.10 Vue generated-hook runtime mismatch remains covered by
  the beta release evidence in Core issue #26; this case uses `useVooyaStore`.
- The Lab still compiles selected Rust cases into one shared authored entry.
  Artifact-size and case-isolation findings must decide whether this is a Lab
  registry concern or a Core precompiled-artifact concern.
- No renderer, assets, Bevy `App`, physics plugin, parallel schedule, Worker
  execution, React parity, or shared runtime is claimed by the headless slice.

## Extraction decision

Keep all Bevy behavior case-local. A `packages/bevy-*` adapter requires a second
independent consumer or a lifecycle that can be specified without Lab imports.

## Non-goals

- Claiming this is the full Bevy engine or renderer.
- Claiming the case-authored contact system is Bevy Physics, Rapier, or Avian.
- Claiming that CPU ECS universally beats GPU compute or a spatial broad phase.
- Claiming ECS is faster than an array-based TypeScript demo.
- Solving one-engine-per-component versus shared-runtime architecture yet.
- Adding dependency-specific translation or patching Bevy to make the case pass.
- Enabling arbitrary Cargo projects, untrusted execution, networking, or assets.
