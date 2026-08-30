# `@vooya-lab/runtime-module`

Minimal Worker lifecycle for invoking a numeric export from a browser-compiled
`wasm32-unknown-unknown` module. The runner rejects every imported capability,
creates a fresh Worker for each invocation, enforces a timeout, and terminates
the Worker after success or failure.

This package proves target and artifact behavior for the hidden compiler
experiment. It is not a Vooya component host and is not an untrusted-code
sandbox. Vooya component lifecycle belongs to `packages/preview-host`.
