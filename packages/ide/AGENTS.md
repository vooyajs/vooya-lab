# IDE Package Contract

This file applies to `packages/ide`.

The existing CodeMirror editor, file tree, tabs, read-only/editable modes, and
file update events are the base to evolve. Do not replace them solely to match a
new page design.

## Package boundary

- Keep the package language- and runner-neutral.
- The IDE owns virtual file presentation and edit events. It does not own Cargo,
  compiler download, build scheduling, preview isolation, or security policy.
- `CaseLiveWorkbench` may own responsive Preview/Source layout and view state,
  but preview content, runtime lifecycle, compiler truth, and case controls stay
  in supplied slots/owners. Do not import router, application, or case internals.
- Add runner, diagnostics, build output, and preview behavior through typed
  props/events or separately composed packages.
- Do not import application or case internals.
- Preserve a complete read-only experience: file tree, tabs, selection, copy,
  generated declarations, diagnostics, and reset where applicable.

## Capability rules

- Default Rust examples to read-only.
- `editable`/`readonly` controls affordances; it does not grant execution or
  create a sandbox.
- Omit compile/run actions for precompiled read-only cases. A separate Compiler
  alpha link must not imply that the current case workspace is editable.
- A compile action requires a declared compiler client and a real result state:
  queued, compiling, succeeded, failed, cancelled, or terminated.
- Dispose editor subscriptions, Workers, preview mounts, object URLs, and build
  artifacts deterministically through the owning composition layer.

Read `docs/browser-compiler.md` before adding any compiler-specific integration.
