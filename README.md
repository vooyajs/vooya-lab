# Vooya Lab

Vooya Lab is the interactive gallery for Vooya Rust/WASM components. Visitors
can run each demo, switch between a Vooya implementation and a plain Web
baseline when that comparison is useful, and read the Rust, host-framework,
style, and bundler source without leaving the page.

The public product and navigation are a gallery. Compatibility and
browser-tooling cases remain available at direct routes for focused testing,
without competing with the gallery's public information architecture. The lab
is intentionally separate from the Vooya compiler
repository: the compiler owns the authoring contract, while the lab makes that
contract visible through real, explorable examples.

## Related resources

- [Vooya documentation](https://vooyajs.com/) — authoring contracts, Rust-file guidance, and compatibility boundaries;
- [Open the hosted lab](https://vooyajs.github.io/vooya-lab/) — interactive browser cases and live integration evidence;
- [Vooya Lab source](https://github.com/vooyajs/vooya-lab) — case implementations and deployment configuration.
- [Lab architecture](./docs/lab-architecture.md) — product, repository, and agent contract.
- [Case portfolio strategy](./docs/case-portfolio.md) — case selection rubric and evidence plan.
- [Case specification standard](./docs/case-spec.md) — independent, copyable case-unit contract.
- [Visual identity and asset workflow](./docs/visual-identity.md) — brand system, Lovart research modes, logo exploration, and generated-asset provenance.
- [Browser compiler exploration](./docs/browser-compiler.md) — protocol and feasibility gates.
- [Browser compiler Gate 0](./docs/browser-compiler-gate-0.md) — pinned browser-hosted rustc candidate, payload inventory, and open measurements.
- [Browser compiler Gate 1](./docs/browser-compiler-gate-1.md) — real in-browser rustc evidence and the remaining Vooya gaps.
- [Browser compiler Gate 2 working report](./docs/browser-compiler-gate-2.md) — evidence for a controlled browser-built Vooya DOM component, its exact toolchain/profile boundary, lifecycle tests, payload cost, and remaining publication and security gaps.

Every case marked `live` must include a Rust component or store compiled through
Vooya. Planned cards may communicate the gallery roadmap, but they do not link
to a simulated implementation. External browser WASM packages such as
`@rspack/browser` and `@rolldown/browser` are dependencies exercised by an
experiment, not replacements for the Vooya compilation path.

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

The public site derives component routes as `/cases/<category>/<slug>` and browser-tooling
experiments to routes such as `/bundlers/rspack`.

## Local development

The Lab pins the published `@vooya/vite` and `@vooya/vue` packages to
`0.2.0-alpha.0`. Their Rust provider/build facade are alpha.0 while compiler/core
remain beta.0; the lockfile preserves this exact dependency graph. Vite itself
is `8.2.1`. Source authoring requires Cargo, the `wasm32-unknown-unknown` target
and `wasm-bindgen-cli` `0.2.115`. No optional managed preset is enabled here.
The separately pinned browser-compiler research assets are unchanged.

```sh
pnpm install --frozen-lockfile
pnpm verify:vooya-registry
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
cross-origin resource headers, a path allowlist, a persistent daily request
quota, and an `ASSETS_ENABLED` kill switch. The Rspack Worker uses
`VITE_RSPACK_WASM_URL` when set and otherwise falls back to the package-local
WASM file for local development.

For a Pages upload, set `VITE_RSPACK_WASM_URL` to the deployed Worker URL and
run `pnpm build:pages`. The final command removes only the generated Rspack
binary from `dist/assets`; Rolldown, Vooya, and the application remain in Pages.

For the repeatable Cloudflare setup, GitHub Actions workflow, quota guard, and
rollback procedure, see [docs/cloudflare-wasm-assets.md](docs/cloudflare-wasm-assets.md).

## Architecture

Before changing the gallery information architecture, case layout, WebIDE,
compiler experiments, or shared packages, read
[docs/lab-architecture.md](docs/lab-architecture.md). It defines the Lab's
outcome-first product direction, filesystem-derived case routes, precompiled
WASM default, `editable` capability boundary, package extraction rules, and
development constraints for maintainers and coding agents.
