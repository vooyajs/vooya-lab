# Cases

The lab is organized by domain first, then by a concrete scenario:

```text
cases/<category>/<case>/
```

Each case is a self-contained gallery unit. It keeps its Rust component,
interactive demo page, optional baseline implementation, metadata, and local
entry point together. New cases use ordinary `.rs` files with explicit
`#[voo::component]` roles. `.voo` is a legacy format and must not be added to
new lab cases.

```text
cases/examples/<demo>/
  SPEC.md             # rationale, boundary proof, acceptance and known gaps
  index.ts             # optional case-local public exports
  case.json            # portable case metadata
  DemoPage.vue         # preview, controls, source and API docs
  <Name>Baseline.vue   # optional non-Vooya comparison
  src/
    <Name>.rs
    <Name>.css
```

The web application discovers `case.json` and optional `DemoPage.vue` modules
through one build-time filesystem glob. The manifest path generates
`/cases/<category>/<slug>`; no case registration or public route is maintained
by hand. Bundler experiments remain available at direct routes and never appear
as public Gallery components.

`SPEC.md` and `case.json` form one independent case specification unit. Read
[`docs/case-spec.md`](../docs/case-spec.md) and [`AGENTS.md`](./AGENTS.md) before
adding or changing a case. `case.json` follows
[`case.schema.json`](./case.schema.json) and projects the spec into registry,
execution, distribution, and host/Rust/GPU proof fields.

A case is only marked `live` when the Rust component has gone through the Lab
Vooya build path and the browser behavior has focused evidence. A case is only
marked `flagship` when it also passes the portfolio rubric and publicly explains
**Why this boundary?**

Current categories:

- `bundlers/rspack` — Rspack Browser Worker and a Vooya Rust build summary;
- `bundlers/rolldown` — Rolldown Browser Worker and a Vooya Rust build summary.
- `examples/scatter-plot` — a Rust-file canvas component with point-count and
  zoom controls, based on the earlier scatter-plot behavior as a reference;

The catalog is deliberately open to future `editors`, `graphics`, `data`, and
`wasm` categories.

Case detail pages must not import application-owned components or types. They
compose case-local files with public packages such as `@vooya-lab/ide` and
`@vooya-lab/case-schema`; the application owns only the surrounding shell.
