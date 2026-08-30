# `@vooya-lab/runtime-wasi`

Constrained execution runner for Gate 1 browser-compiled `wasm32-wasip1`
commands. Every run receives a fresh Worker and in-memory WASI environment.
There are no network bindings, persistent files, or inherited browser globals.

This is a lifecycle boundary for trusted experiment artifacts, not a public
untrusted-code sandbox. Public execution still needs quotas, a separate origin,
abuse controls, and a threat model.
