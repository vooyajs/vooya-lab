# Cases

The lab is organized by domain first, then by a concrete scenario:

```text
cases/<category>/<case>/
```

Each case keeps its own Rust-file component, browser host/runner, fixture, and
`case.json` metadata. New cases use ordinary `.rs` files with explicit
`#[voo::component]` roles. `.voo` is a legacy format and must not be added to
new lab cases.

`case.json` follows [`case.schema.json`](./case.schema.json). Every case declares
its category, slug, title, lifecycle status, Rust component, and the user
interactions it is meant to demonstrate. A case is only marked `live` when the
Rust component has gone through the lab Vooya build path and the browser
behavior has an end-to-end assertion.

Current categories:

- `bundlers/rspack` — Rspack Browser Worker and a Vooya Rust build summary;
- `bundlers/rolldown` — Rolldown Browser Worker and a Vooya Rust build summary.
- `examples/scatter-plot` — a Rust-file canvas component with point-count and
  zoom controls, based on the earlier scatter-plot behavior as a reference;

The catalog is deliberately open to future `editors`, `graphics`, `data`, and
`wasm` categories.
