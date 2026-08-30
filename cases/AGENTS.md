# Case Authoring Contract

This file applies to everything under `cases/`.

## Independent unit

Each case is an independently understandable and potentially extractable unit:

```text
cases/<category>/<slug>/
  SPEC.md
  case.json
  index.ts
  DemoPage.vue
  src/
  host/
  assets/
  tests/
```

Only files needed by the case should exist. Optional directories may be
omitted. Keep case-specific behavior inside the case until extraction is
justified by two consumers or an independent lifecycle.

## Dependency rules

- A case may import published Vooya packages and shared `packages/*` APIs.
- A case must not import `apps/web` components, gallery types, styles, or other
  private application internals in the target architecture.
- A case must not reach into another case's private files. Shared behavior moves
  to a package with a narrow public API.
- Host-framework examples belong under `host/<framework>` when more than one
  host is meaningful. Do not duplicate frameworks solely to claim coverage.

Existing violations are migration work. List them under **Known gaps** in the
owning `SPEC.md` and remove them while restructuring; do not copy the pattern.

## Spec-first workflow

1. Copy `cases/_template/SPEC.md` into the new case directory.
2. Complete the outcome, portfolio class, question, boundary proof,
   distribution mode, execution mode, evidence plan, and non-goals.
3. Add a matching `case.json` that validates against `cases/case.schema.json`.
4. Implement the case as an ordinary Vooya consumer.
5. Update the spec, evidence, and focused tests when behavior changes.

Run `pnpm validate:cases` after changing a manifest, schema, or case directory.

`SPEC.md` is normative for human decisions. `case.json` is normative for
registry generation and validation. Resolve disagreements by correcting both in
the same change.

## Public claims

- `live` means the visible result runs through the declared Vooya path and its
  lifecycle evidence passes.
- `flagship` additionally requires the public **Why this boundary?** proof from
  `docs/case-portfolio.md`.
- `copy` means the exported bundle is complete. Otherwise use `package` or
  `demo-only` honestly.
- `editable: true` requires a working declared Rust compilation path. Parameter
  controls for a precompiled case do not make its source editable.
- Generated artwork may provide atmosphere or a cover. It cannot impersonate
  the case result.

## Required evidence

Record the applicable install, development, production build, mount, update,
event, failure, reset, and dispose evidence. Record browser capabilities,
headers, assets, artifact/loading characteristics, temporary workarounds, and
linked upstream issues.

Baseline comparisons must test the stated question. Do not add an intentionally
weak JavaScript baseline merely to produce a favorable number.
