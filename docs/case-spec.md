# Case Specification Standard

Status: normative authoring contract for every directory under `cases/`.

## Purpose

A Lab case is not only a demo route. It is a self-contained product hypothesis,
Vooya consumer, evidence unit, and candidate extraction boundary. Each case has:

- `SPEC.md` for human decisions, rationale, acceptance, and known gaps; and
- `case.json` for validated registry, route, capability, and distribution data.

The pair must change together. A case cannot claim a capability that appears in
only one of them.

## Directory contract

```text
cases/<category>/<slug>/
  SPEC.md                       # normative case-local design
  case.json                     # machine-readable projection
  index.ts                      # public case entry, when routed through the gallery
  DemoPage.vue                  # case composition, not global site chrome
  src/                          # Rust component/store and case-owned styles
  host/vue/                     # copyable host integration, when applicable
  host/react/                   # only when the comparison proves adapter behavior
  assets/                       # case-owned originals, derivatives, provenance
  tests/                        # focused lifecycle and browser evidence
```

The filesystem path defines `/cases/<category>/<slug>`. The build registry may
generate aliases during migration, but a case must not own a hand-maintained
global route entry.

## Required `SPEC.md` sections

### Identity and status

State the portfolio class, maturity, execution mode, distribution mode, owning
repository, and last verified date. These labels are evidence states, not
marketing labels.

### User outcome and question

Describe the useful outcome in one paragraph and the single architectural or
product question the case is intended to answer. If the question cannot be
falsified by implementation evidence, narrow it.

### Why this boundary?

Record:

- what Vue/React or the Web host owns;
- what Rust/WASM owns;
- whether WebGPU/WebGL is an alternative, complement, or not applicable;
- inputs, outputs, representation, and update frequency across the boundary;
- the reused Rust crate or shared capability;
- the Vooya contracts replacing one-off integration glue; and
- alternatives considered, including plain TypeScript and a custom
  `wasm-bindgen` wrapper where relevant.

Do not select WASM only because an effect is visual. Do not claim that WASM is
parallel by default.

### Experience and source

Specify the introduction, Live Workbench behavior, preview controls and reset
semantics, source files, install/copy actions, props/events, error presentation,
reduced-motion behavior, and small-screen behavior. Preview and Source share one
stable-height work surface: split at wide desktop sizes and explicit tabs when
either pane would be cramped. Precompiled cases omit compile actions; a link to
Compiler alpha must not imply that the current case workspace is editable.

### Execution and isolation

Declare exactly one Rust execution mode:

- `precompiled`;
- `browser-compiler`; or
- `remote-compiler`.

Declare source `editable` independently. `editable: true` requires a real
non-precompiled compiler path. Also record the preview host, Worker use, network
policy, headers, memory/cancellation behavior, and disposal ownership where
applicable. A Worker alone is not an untrusted-code sandbox.

### Distribution

Use one mode:

- `copy`: complete files can be copied into a consumer project;
- `package`: the capability has an independent versioned package; or
- `demo-only`: the result cannot yet be reproduced honestly outside the Lab.

List every exported file, npm dependency, Rust crate/feature, Cargo change,
asset/license, TypeScript setting, and deployment requirement.

### Evidence and acceptance

List observable acceptance criteria and the evidence location for applicable
install, development, error recovery, production build, mount, update, event,
failure, reset, and disposal behavior.

Performance claims are absent by default. A claim requires a reproducible
benchmark recording:

- device and operating system;
- browser and version;
- dataset and workload boundary;
- compared implementation and algorithm;
- warm-up and sample method;
- transfer, render, and initialization costs; and
- raw results or a script that produces them.

### Known gaps and upstream issues

Record current architecture violations, incomplete evidence, Core workarounds,
and focused issue links. Never convert a workaround into an undocumented local
contract.

### Extraction decision and non-goals

State what remains case-local and the evidence required before extraction.
Explicitly list attractive adjacent work that this case does not authorize.

## Machine-readable contract

`case.json` validates against `cases/case.schema.json`. Its proof fields are a
concise projection of `SPEC.md`; they do not replace the reasoning in the spec.

The generated registry should eventually consume only this metadata and the
case public entry. Application types and route lists must not become a parallel
schema.

## Change control

Update the spec before implementing any of these changes:

- portfolio or maturity status;
- host/Rust/GPU ownership;
- public props, events, distribution, or execution mode;
- compiler, Worker, sandbox, network, or deployment permissions;
- reusable package extraction; or
- a performance or compatibility claim.

Focused implementation details may be recorded after the change, but public
contracts and security boundaries are spec-first.
