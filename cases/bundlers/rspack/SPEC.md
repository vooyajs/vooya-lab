# Rspack Browser Experiment Specification

## Identity and status

- Portfolio class: `experiment`
- Maturity: `experimental`
- Rust execution: `precompiled`
- Rust source editable: `false`
- Distribution: `demo-only`
- Owning repository: `vooyajs/vooya-lab`
- Last verified: existing repository evidence; reverify during shell migration

## User outcome

Edit a small JavaScript workspace, run Rspack Browser in a Worker, inspect its
emitted files, and see a Vooya-rendered Rust summary of the build state.

## Question

Can an external browser bundler Worker and a precompiled Vooya component coexist
behind explicit environment, messaging, failure, and disposal boundaries?

## Why this boundary?

### Host owns

- editable JavaScript source and IDE state;
- Worker creation, build invocation, cancellation/failure presentation; and
- emitted-file inspection.

### Rust/WASM owns

- the bounded Vooya summary component only.

### GPU relationship

`not-applicable`.

### Boundary crossing

- Inputs: coarse build-status and summary props.
- Outputs: a Vooya-rendered summary surface.
- Update pattern: the host translates Worker results into summary updates.

### Vooya value

This experiment primarily validates composition and lifecycle, not Rust compute
value. It must not be promoted as a flagship ecosystem port.

## Experience and source

The IDE may edit JavaScript input because Rspack Browser is a real runner. Rust
source remains read-only and precompiled. UI labels must distinguish these two
capabilities.

## Execution and isolation

- Rspack Browser executes in a Worker.
- The Vooya summary is precompiled by the repository build.
- Cross-origin isolation and large WASM asset delivery are explicit deployment
  requirements.
- Worker execution is not called an untrusted-code sandbox.
- The composition layer owns Worker termination, object URLs, build state, and
  component disposal.

## Distribution

`demo-only`. The external Rspack artifact, Worker policy, isolation headers,
Cloudflare WASM asset gateway, quotas, and Vooya summary prevent a simple honest
copy bundle today.

## Acceptance and evidence

- [x] Editable JavaScript source is sent to the browser bundler.
- [x] Emitted files are inspectable.
- [x] Environment requirements are reported rather than hidden.
- [ ] Worker termination and repeat-run cleanup have focused evidence.
- [ ] Rust read-only state is visually distinct from JavaScript editability.
- [ ] The experiment consumes shared IDE/runner protocols rather than
  application-specific coupling.

## Known gaps and upstream issues

- The experiment predates the compiler/runner protocol proposed in
  `docs/browser-compiler.md`.
- It must be audited during the IDE composition refactor for cleanup, error
  normalization, and capability labeling.

## Extraction decision

Keep Rspack-specific runner code case-local. Extract Worker build messaging only
after Rolldown or a Rust compiler client proves a common toolchain-neutral
protocol.

## Non-goals

- compiling Vooya Rust source in the browser;
- treating the Worker as a security sandbox;
- making Rspack part of Vooya Core; or
- using bundler spectacle as the primary long-term Vooya proof.
