# Vooya Lab

Vooya Lab is a browser integration laboratory for Vooya Rust/WASM components,
precompiled artifacts, and browser-hosted tooling. It is intentionally separate
from the Vooya compiler repository: the compiler owns the authoring contract;
the lab owns cross-scenario evidence and interactive demos.

Every case in this repository must include a Rust component or store compiled
through Vooya before it is considered complete. External browser WASM packages
such as `@rspack/browser` and `@rolldown/browser` are dependencies exercised by
the case, not replacements for the Vooya compilation path.

## Case layout

Cases are grouped by domain and then by scenario:

```text
cases/
  bundlers/
    rspack/
    rolldown/
  editors/
  graphics/
  data/
  wasm/
```

The public site maps these directories to routes such as
`/bundlers/rspack` and `/bundlers/rolldown`.

## Local development

The first cases use the published coordinated Vooya alpha packages. Source
authoring also requires Cargo, the `wasm32-unknown-unknown` target, and the
matching `wasm-bindgen` CLI.

```sh
pnpm install
pnpm dev
```

Build and typecheck the site with:

```sh
pnpm build
pnpm typecheck
```

Rspack Browser and Rolldown Browser use Workers and shared WebAssembly memory,
so they require a cross-origin-isolated deployment (`Cross-Origin-Opener-Policy`
and `Cross-Origin-Embedder-Policy`). Each case reports that environment
requirement at runtime instead of hiding it.

The included GitHub Pages workflow is useful for the static catalog and the
Vooya-compiled Rust summaries. GitHub Pages does not normally let a project set
the cross-origin isolation headers required by either browser bundler, so both
cases may remain in their explicit `needs-isolation` state there. A
headers-capable static host can serve the same `dist` output for the full
Rspack and Rolldown paths.

## Large WASM assets

Cloudflare Pages has a per-file upload limit, so the larger Rspack binary lives
outside `dist`. `workers/wasm-assets` is a private-R2 gateway with CORS and
cross-origin resource headers, a path allowlist, a conservative per-IP request
window, and an `ASSETS_ENABLED` kill switch. The Rspack Worker uses
`VITE_RSPACK_WASM_URL` when set and otherwise falls back to the package-local
WASM file for local development.

For a Pages upload, set `VITE_RSPACK_WASM_URL` to the deployed Worker URL and
run `pnpm build:pages`. The final command removes only the generated Rspack
binary from `dist/assets`; Rolldown, Vooya, and the application remain in Pages.
