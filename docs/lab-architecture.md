# Vooya Lab Architecture and Development Contract

Status: initial product and repository contract for the next Lab iteration.

Case selection and portfolio evidence are defined in
[`case-portfolio.md`](./case-portfolio.md).
Per-case specification units are defined in [`case-spec.md`](./case-spec.md).
Shared identity, Lovart research, and generated-asset provenance are defined in
[`visual-identity.md`](./visual-identity.md).
Browser compiler research is gated by
[`browser-compiler.md`](./browser-compiler.md).

This document is the starting context for maintainers, contributors, and coding
agents working in `vooya-lab`. Read it before changing the public information
architecture, case layout, WebIDE, compiler experiments, or shared packages.

## Product thesis

Vooya Lab is the public, interactive proof of what Vooya can enable inside an
existing Web application. Its first job is to make a Web developer want the
outcome. Its second job is to reveal how a bounded Rust/WASM component produced
that outcome. Its third job is to turn real authoring friction into evidence for
Vooya Core.

The public experience is **delight-first**:

```text
see a compelling result
  -> interact with it
  -> understand the Web use case
  -> discover the Vooya boundary
  -> inspect or change the source
  -> try it in an existing Vue or React application
```

The engineering process underneath it is **evidence-first**:

```text
build a case as an ordinary Vooya consumer
  -> record friction, limitations, and failures
  -> file the smallest issue in the repository that owns the problem
  -> fix the owning layer
  -> remove the Lab workaround
  -> preserve the result as case evidence
  -> extract a package only after its boundary is demonstrated
```

The public site must not read like a compatibility dashboard. Internal maturity,
environment, and lifecycle evidence remains available on every case, but the
effect and its value lead the page.

## Repository ownership

`vooyajs/vooya` owns:

- the compiler, ABI, runtime, macros, and authoring contract;
- framework and bundler adapters;
- Rust/Cargo/WASM toolchain integration;
- generated declarations and diagnostics; and
- product-level compatibility guarantees.

`vooyajs/vooya-lab` owns:

- the public gallery and case-detail experience;
- real, source-available Vooya consumers;
- source exploration and the WebIDE surface;
- browser compiler, sandbox, and deployment experiments; and
- reusable Lab packages whose independent boundary has been demonstrated.

The Lab must not become a private second implementation of Vooya Core. A Core
defect may have a temporary, linked workaround in a case, but that workaround
must not silently become the Lab contract.

## Product surfaces

The Lab has four connected public surfaces:

1. **Case browser** is the primary product surface: a dense, grouped directory
   of effects and useful components, with search and direct filesystem-derived
   routes.
2. **Case detail** combines a concise introduction, an interactive preview
   sandbox, source/workbench views, dependencies, and copy/install actions.
3. **Workbench** lets a visitor inspect, copy, and, when explicitly enabled,
   edit case source and run a supported compilation path.
4. **Home and docs** provide discovery and adoption context around the case
   library; a home-page hero is an entrance, not the whole Lab experience.

The interaction model is closer to a component library than a campaign landing
page. A visitor should be able to move rapidly between many effects without
returning to Home, then copy a complete integration unit into a real project.

Infrastructure probes such as browser bundlers may have direct routes, but they
must not take over the public gallery hierarchy.

### Case detail anatomy

Every public case page follows one predictable reading order:

1. breadcrumb, name, one-sentence outcome, and supported host/framework badges;
2. a short explanation of what the case enables and why Vooya is useful there;
3. a large interactive preview sandbox with case-local controls and reset;
4. a source Workbench with Rust, host-framework, style, manifest, and evidence
   files;
5. copy/install actions and complete dependency information; and
6. optional props/events, implementation notes, limitations, and related cases.

The directory remains visible on desktop and becomes a drawer or compact case
picker on small screens. Preview controls belong to the sandbox; source and copy
controls belong to the Workbench.

### Navigation scale contract

The public shell must be designed for hundreds of cases, not only the first
handful. The persistent desktop directory is a product surface, not incidental
navigation.

- Keep a slim global bar for brand, version, repository, and site-wide actions.
- Keep the case directory visible beside case detail at ordinary tablet and
  desktop widths. It must not move into the top bar merely because the viewport
  is narrower than a large desktop.
- Collapse the directory into a drawer only at a true phone breakpoint. The
  exact breakpoint is a design-system token and must be verified against the
  source Workbench, not copied from a generic framework default.
- Group cases by stable product categories and show group counts. Case order and
  grouping come from the generated registry, never a manually maintained menu.
- Provide keyboard-accessible search and support aliases, tags, host framework,
  and capability metadata. Recent and saved cases may supplement categories but
  must not replace the canonical hierarchy.
- Preserve the selected case and expanded category while moving between detail
  routes. At large registry sizes, virtualize or incrementally render the case
  rows without changing route or keyboard behavior.
- Keep page-local anchors such as Preview, Source, API, and Evidence separate
  from the global case directory. Do not mix hundreds of case names with the
  table of contents for the current case.

The minimum responsive acceptance widths are 360, 736, and 1024 CSS pixels. At
736 pixels the case directory must remain visible. At 360 pixels it may become a
drawer, but the current case and an obvious directory trigger must remain in the
page chrome.

### Visual system and generated assets

The normative identity and asset workflow lives in
[`visual-identity.md`](./visual-identity.md). It defines how Lovart Design Skill,
external inspiration, Clipper, and Reference Space feed a reviewable pipeline
rather than becoming anonymous generated decoration.

The Lab itself is part of the proof. It should feel like a distinctive creative
developer tool rather than a generic documentation theme, while source,
controls, focus states, and long-form text remain readable.

Shared visual primitives belong in `packages/ui`; case-specific art belongs in
the owning case. Prefer a small system of deliberate typography, spectral color,
spatial grid, motion, and material treatments over unrelated decoration on each
page. Motion must respect reduced-motion preferences and must never disguise a
static mock as a live case.

AI-generated or commissioned visual assets are source material, not anonymous
build output. For every retained asset, record:

- its generator or author, prompt or brief, source project URL, and generation
  date;
- the original file and optimized Web derivatives;
- usage or licensing constraints and required attribution;
- the owning surface or case; and
- whether it is decorative, a cover, or part of the actual interactive result.

Store shared originals and provenance under `assets/brand/`; store case-owned
art and metadata under the case's `assets/`. Produce optimized AVIF/WebP
derivatives through tooling instead of editing originals in place. Generated
art may establish atmosphere or cover imagery, but it cannot substitute for the
running Vooya output inside the preview sandbox.

## Browser-first compiler direction

The long-term direction is a Vooya compiler that can run in the browser. The
target experience is a self-contained workspace that can edit Rust, compile it,
produce the Vooya WASM/component artifacts, report source diagnostics, and mount
the result without requiring a local toolchain or a remote build service.

One controlled fixed-ABI DOM template has now passed the full local browser
compile, diagnostics, wasm-bindgen, preview, cancellation, reset, and disposal
loop documented in `browser-compiler-gate-2.md`. That is a real research
capability, but it is not arbitrary Cargo, editable procedural macros, a public
case compiler, or an untrusted-code service. Broader browser compilation still
needs explicit designs for:

- the Rust compiler/toolchain payload and browser-compatible execution model;
- the virtual workspace, Cargo metadata, crate sources, features, and lockfile;
- registry and artifact caching;
- compilation workers, cancellation, memory, CPU, and storage limits;
- `wasm-bindgen` or an equivalent binding stage;
- Vooya schema, declarations, styles, diagnostics, and output assets;
- preview isolation, runtime disposal, and failure recovery; and
- offline behavior, package provenance, and supply-chain policy.

Rspack Browser and Rolldown Browser are useful precedents for browser-resident
toolchains, but they do not prove that the Rust toolchain has the same cost or
security model.

### Execution modes

Every case must declare one execution mode:

- `precompiled`: the repository build produces WASM and bindings ahead of time;
- `browser-compiler`: source compilation happens locally in a browser worker;
- `remote-compiler`: an isolated service compiles source and returns artifacts.

`precompiled` is the default and expected mode for current live cases. A remote
compiler is an optional research or fallback path, not an architectural
prerequisite for the Lab. `browser-compiler` is the preferred long-term target.

### The `editable` contract

The Workbench exposes one public capability switch:

```ts
type WorkbenchProps = {
  editable: boolean;
};
```

Rules:

- `editable` defaults to `false`.
- When `false`, source is selectable, navigable, and copyable, but cannot be
  changed. Compile/run actions that would imply source compilation are absent or
  disabled with an honest explanation.
- When `true`, the case must also declare a real supported execution mode. The
  UI must never simulate a successful Rust build.
- `editable` controls product affordances; it is not a sandbox or security
  boundary.
- A global feature flag may force all Workbenches to read-only, regardless of a
  case request.
- Current cases should ship precompiled WASM and set `editable: false` until the
  selected compilation path passes its lifecycle, quota, and failure criteria.

Suggested effective capability:

```ts
const canEdit = globalWebIdeEnabled
  && caseDefinition.execution.editable
  && caseDefinition.execution.mode !== "precompiled";
```

Do not render an enabled **Run**, **Build**, or **Apply** control when
`canEdit` is false. Parameter controls that update an already compiled component
are independent of source editing and remain available.

Read-only does not mean unusable. `editable: false` still allows:

- switching among every source file;
- copying one file or the complete component bundle;
- copying an install command or agent-ready integration prompt;
- changing documented props through sandbox controls; and
- resetting and replaying the precompiled preview.

## Target monorepo structure

```text
vooya-lab/
  apps/
    web/                         # public gallery, cases, workbench, and docs shell
    compiler-service/            # optional remote compiler experiment

  cases/
    graphics/
      scatter-explorer/          # /cases/graphics/scatter-explorer
      particle-field/            # /cases/graphics/particle-field
      image-pipeline/             # /cases/graphics/image-pipeline
    audio/
      spectrogram/               # /cases/audio/spectrogram
    data/
      data-grid/                 # /cases/data/data-grid
      trace-waterfall/           # /cases/data/trace-waterfall
    developer-tools/
      diff-viewer/               # /cases/developer-tools/diff-viewer
      source-analyzer/           # /cases/developer-tools/source-analyzer
    experiments/
      rspack-browser/            # direct experimental route
      rolldown-browser/          # direct experimental route

  packages/
    case-schema/                 # current: metadata, evidence types and route helper
    ide/                         # current: source tree/editor + composed Workbench
    compiler-protocol/           # current: requests, events, diagnostics and artifacts
    compiler-browser/            # current: browser rustc Worker and artifact protocol adapter
    preview-host/                # current: isolated Vooya mount/reset/dispose lifecycle
    runtime-module/              # current: import-free unknown-target export probe
    runtime-wasi/                # current: constrained Gate 1 command execution
    case-runtime/                # target: reusable discovery/loading contract
    compiler-client/             # target: Worker lifecycle, messages and cancellation
    sandbox/                     # Worker/frame capability and isolation protocol
    ui/                          # shared Lab presentation primitives

  assets/
    brand/                       # shared originals, derivatives, and provenance

  services/
    wasm-assets/                 # large immutable artifacts and headers

  docs/
    lab-architecture.md
    case-portfolio.md
    case-spec.md
    browser-compiler.md
    browser-compiler-gate-0.md
    browser-compiler-gate-1.md
    browser-compiler-gate-2.md
    compiler-security-model.md

  tooling/
    generate-case-registry/
    generate-thumbnails/
    validate-cases/
```

This is a target layout. Migration should be incremental and keep the deployed
site working at each step.

## Filesystem and route contract

The case directory is the route source of truth:

```text
cases/<category>/<slug>/case.json
                      -> /cases/<category>/<slug>
```

The Web application discovers case definitions through one build-time glob or a
generated registry. Do not add a second hand-maintained route list.

Each case directory owns its complete story:

```text
cases/<category>/<slug>/
  SPEC.md                       # rationale, boundary, acceptance and known gaps
  case.json                     # validated registry and capability projection
  index.ts                      # public case entry when used by the gallery
  DemoPage.vue                  # case-specific composition
  preview.ts                    # preview registration when needed
  src/
    Component.rs                # ordinary Vooya authoring source
    Component.css
  host/
    vue/                        # host integration shown to visitors
    react/                      # only when the comparison has value
  assets/
  tests/
```

Avoid placing reusable behavior in `apps/web`. When a second case needs the same
behavior, move it to a package with a narrow public API.

### Dependency direction

Dependencies flow in one direction:

```text
apps -> cases -> packages
apps ----------> packages
```

- Packages must not import cases or applications.
- Cases must not import private application internals.
- Cases may compose shared packages and ordinary published Vooya packages.
- Infrastructure code communicates through typed protocols, not imports from UI
  components.

## Case contract

`SPEC.md` and `case.json` form the independent specification unit defined in
`docs/case-spec.md`. Product metadata drives desire and discovery; proof and
evidence constrain technical claims.

Suggested product definition:

```ts
type LabCaseManifest = {
  category: string;
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  cover?: string;
  status: "planned" | "catalogued" | "experimental" | "live";
  portfolioClass: "flagship" | "showcase" | "foundation" | "experiment";
  question: string;
  spec: "./SPEC.md";
  vooyaComponent: `./src/${string}.rs`;
  host?: string;
  runner?: string;
  interactions: string[];
  reference?: string;
  evidence?: string[];
  distribution: {
    mode: "copy" | "package" | "demo-only";
    files: string[];
    dependencies?: string[];
    installCommand?: string;
  };
  execution: {
    mode: "precompiled" | "browser-compiler" | "remote-compiler";
    editable: boolean;
  };
  proof: {
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
};
```

The route is derived from `category` and `slug`; it is not stored as a second
source of truth. The generated registry may add build-only module references and
computed presentation data without changing the portable manifest.

Engineering evidence records, where applicable:

- Vooya package and Rust crate versions;
- development and production build paths;
- mount, update, event, failure, reset, and dispose behavior;
- required browser capabilities and response headers;
- artifact sizes and loading behavior;
- supported host frameworks;
- known limitations and temporary workarounds; and
- focused upstream issues for every Core gap.

A case is `live` only when its Vooya-generated component is the visible result
and its declared evidence is verified. A mock, video, screenshot, or plain-Web
replacement cannot silently carry a `live` label.

### Copy and distribution contract

A copy-ready case is not just a Rust file. The exported unit must include or
describe everything required to reproduce the preview:

- Rust component/store source and styles;
- Vue and/or React host integration;
- required `@vooya/*` packages at coherent versions;
- Cargo crates, features, and manifest additions;
- assets and attribution when present;
- TypeScript configuration requirements; and
- browser headers or capability requirements.

`distribution.mode: "copy"` means those files can be copied into a consumer
project. `package` means the case is consumed through a separately versioned
package. `demo-only` is permitted for research surfaces whose assets, license,
security model, or complexity do not support honest copy-and-use yet.

Do not show **Copy component** unless the exported bundle is complete. A code
pane may always offer **Copy file**. Agent-facing copy should state the target
framework, dependency changes, file destinations, and unsupported boundaries.

## Packages and ecosystem extraction

Start new effect-specific behavior inside its case. Extract it when:

- two independent cases require the same public behavior;
- it owns a protocol or lifecycle independent of the gallery; or
- an application outside the Lab can consume it without importing Lab internals.

Workspace extraction does not imply npm publication. Publication requires a
separate versioning, compatibility, documentation, and maintenance decision.

Workbench, compiler messaging, preview isolation, and sandbox protocols may be
designed as packages early because they already have independent lifecycle and
security boundaries.

## Development workflow

### Adding or changing a case

1. State the user-visible outcome and the product question the case answers.
2. Decide whether it is a showcase case or an infrastructure experiment.
3. Create `cases/<category>/<slug>` and let the filesystem define its route.
4. Implement it through published or workspace Vooya APIs as an ordinary
   consumer.
5. Default to precompiled WASM and `editable: false`.
6. Add focused browser evidence for the behavior being claimed.
7. Record every workaround and link the owning issue.
8. Update the generated registry, thumbnails, and machine-readable manifests.
9. Verify the case in development, production, and its deployed header model.

### Triage rule

- Compiler, ABI, runtime, adapter, toolchain, or declarations: **Vooya Core**.
- Case composition, copy, preview, and gallery navigation: **Vooya Lab case/app**.
- Repeated reusable behavior: **Lab package proposal**.
- Artifact hosting, isolation headers, quotas, and deployment: **Infrastructure**.
- Unsupported product direction or public contract change: **Issue/RFC first**.

## Agent constraints

Agents working in this repository must follow these rules:

1. Read this document and the nearest case/package README before editing. Read
   `docs/case-portfolio.md` before proposing or prioritizing cases.
2. Preserve the outcome-first public experience. Do not lead a public page with
   ABI, toolchain, status, or compatibility language.
3. Do not fake interactivity, compilation, benchmarks, or a live Vooya path.
4. Treat `editable` as false unless a working compiler mode is explicitly wired
   and verified.
5. Keep current live cases on precompiled WASM until browser compilation is
   actually supported.
6. Do not add hand-written case routes when filesystem discovery can express the
   route.
7. Do not place reusable case infrastructure in `apps/web` by default.
8. Do not patch around a Core defect without documenting the workaround and
   opening or linking its owning issue.
9. Do not describe WASM, Rust, WebGPU, or Vooya as universally faster. Performance
   copy requires a reproducible comparison and stated boundary.
10. Do not call same-origin DOM-capable WASM a sandbox. Build isolation and
    runtime isolation are separate designs.
11. Do not broaden network, crate, filesystem, or execution permissions merely
    to make a compiler demo work.
12. Preserve deterministic mount, reset, failure, and disposal behavior in every
    interactive surface.
13. Update case metadata, evidence, and tests in the same change as the behavior
    they describe.
14. Keep a migration reversible and the public build deployable after each
    structural step.
15. Preserve the persistent case directory at the 736-pixel acceptance width;
    do not solve dense navigation by moving it into the top bar.
16. Do not add generated visual assets without source provenance and optimized
    derivatives, or use them to impersonate a live case result.
17. Do not classify a case as `flagship` until it passes the admission rubric in
    `docs/case-portfolio.md` and exposes its public **Why this boundary?** proof.
18. Treat WebGPU/WebGL as the correct layer when the workload belongs on the GPU.
    A hybrid case must state what Rust/WASM owns and what the GPU owns.

## Near-term sequence

1. Maintain the established case contract, route generation, and read-only Workbench.
2. Continue the redesigned case browser and case detail around a persistent directory,
   outcome-first introduction, live sandbox, copy-ready source, and progressive
   disclosure of implementation.
3. Keep current cases on filesystem-derived routes and precompiled artifacts.
4. Extend the flagship portfolio beyond the first Log Atlas vertical slice with distinct architectural questions.
5. Extract shared source-viewer, preview-host, and case-runtime packages.
6. Publish and reproduce the controlled browser-compiler toolchain/profile
   without broadening its fixed-ABI claim.
7. Enable `editable` for one constrained public case only after its own spec
   adopts the passed profile and adds cold-cache, peak-memory, schema, copy,
   compatibility, and accessibility evidence.
8. Expand machine-readable docs, case manifests, CLI discovery, and agent-facing
   resources after the human product path is coherent.

## Definition of done for the next redesign

- The case directory supports fast browsing across a large future library.
- A visitor can move from a case outcome to its live sandbox and copy-ready
  source without leaving the detail page.
- Home may create desire before introducing Rust/WASM terminology, but it is not
  the only or primary interaction surface.
- Case URLs match their filesystem locations.
- Every live case has source, value, controls, evidence, and honest limitations.
- Every flagship case explains host, Rust/WASM, and GPU ownership and states the
  boundary-crossing pattern without an unsupported performance claim.
- Workbench is read-only by default and communicates that state clearly.
- Current cases use repository-built, precompiled WASM.
- No public control implies browser compilation before it exists.
- Shared code follows the dependency direction in this document.
- Desktop and mobile flows both preserve effect-first progressive disclosure.
