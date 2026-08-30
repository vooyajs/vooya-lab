# Source Surgeon Specification

## Identity and status

- Portfolio class: `flagship`
- Maturity: `experimental`
- Execution: `precompiled`
- Source editable: `false`
- Distribution: `demo-only`
- Owning repository: `vooyajs/vooya-lab`
- Last verified: `2026-08-30`

## User outcome

Edit a Rust draft in familiar Web UI, submit it for local structural analysis,
inspect functions/types/unsafe usage, and preview a precise AST-backed function
rename or parser diagnostic without sending source to a server.

## Question

Can a mature Rust analysis capability become a typed, lifecycle-safe Vooya
component rather than a bespoke browser WASM wrapper?

## Why this boundary?

### Host owns

- textarea/editor behavior, keyboard/focus, controls, layout, and copy UI.

### Rust/WASM owns

- `syn` parse and traversal, identifier validation, AST mutation, structural
  inventory, parser diagnostics, and `prettyplease` output.

### GPU relationship

`not-applicable`

Parsing and source rewriting are irregular CPU work; a GPU adds no useful
ownership boundary.

### Boundary crossing

- Inputs: a submitted Rust source string and optional replacement identifier.
- Outputs: bounded AST inventory, diagnostic, and transformed source DOM.
- Update: the editor stays local to Vue; Rust runs only on explicit Analyze.

### Vooya value

- Typed props, component updates, scoped output, build integration, generated
  adapter, and disposal replace handwritten `wasm-bindgen` glue.

### Alternatives

- tree-sitter/TypeScript parser, server analysis, regex replacement, or a
  custom WASM wrapper.

## Experience and source

- Preview: draft editor beside Rust-owned analysis/transformed output.
- Controls/reset: Analyze, rename field, invalid fixture, reset, copy result.
- Source files: Rust component, CSS, Vue host, manifest, and spec.
- Props/events: submitted source and rename string props.
- Copy: host copies transformed output; Workbench copies implementation files.
- Responsive/reduced motion: editor/result stack on narrow preview; no motion.

## Execution and isolation

- Compiler/runtime: repository precompiled `wasm32-unknown-unknown` component.
- Boundary: trusted same-page component; not an untrusted code sandbox.
- Network/storage: source remains in memory; no runtime network/storage.
- Cancellation/disposal: explicit bounded submissions; component disposal.
- Headers: ordinary WASM only.

## Distribution

- Exported files: listed in `case.json`.
- npm: `@vooya/vue`.
- Rust: `syn 3.0.4` with full/visit/visit-mut, `prettyplease 0.3.0`.
- Assets: none.
- Deployment: static shared WASM hosting.

## Acceptance and evidence

- [x] Clean dependency path
- [x] Production build
- [x] Typed mount and prop update
- [x] Parser failure and reset presentation
- [ ] Rust-error recovery
- [ ] Dispose/remount evidence
- [x] Public **Why this boundary?**
- [x] Focused browser evidence

Evidence locations: Lab E2E, production build output, public route.

## Known gaps and upstream issues

- Shared artifact isolation remains `vooyajs/vooya#106`.
- The first slice analyzes one file and renames the first matching free
  function; workspace indexing, spans/source maps, multi-file diff, and patches
  remain future stages.
- `syn` deliberately preserves macro bodies as token streams; this structural
  rename does not claim semantic references hidden inside arbitrary macros.

## Extraction decision

Keep local until another developer-tool case needs the same analysis protocol
or a non-Lab consumer proves a versioned browser analysis package.

## Non-goals

- Full rust-analyzer, code execution, arbitrary Cargo, semantic type checking,
  or an untrusted-code sandbox.
