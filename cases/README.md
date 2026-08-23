# Cases

The lab is organized by domain first, then by a concrete scenario:

```text
cases/<category>/<case>/
```

Each case should keep its own Rust component, browser runner, fixture, and
case metadata. A case is only complete when the Rust component has gone through
the Vooya build path and the browser behavior has an end-to-end assertion.

Current categories:

- `bundlers/rspack` — Rspack Browser Worker and a Vooya Rust build summary;
- `bundlers/rolldown` — Rolldown Browser Worker and a Vooya Rust build summary.

The catalog is deliberately open to future `editors`, `graphics`, `data`, and
`wasm` categories.
