# @vooya-lab/bindgen-browser

Runs the pinned official `wasm-bindgen-cli-support` transformation as a
`wasm32-wasip1` command in a dedicated browser Worker. It accepts one raw
wasm-bindgen module and returns JavaScript glue plus transformed WASM bytes.

This package is a binding stage, not a Rust compiler, Cargo implementation, or
runtime sandbox. Tool bytes must be immutable and Fetch-SRI pinned. Cancellation
terminates the Worker and discards its in-memory filesystem.

The current Gate 1.97 proof accepts only metadata from the reviewed
`tooling/browser-toolchain/vooya-bindgen-scaffold.rs`. Supporting another ABI or
wasm-bindgen version requires a regenerated scaffold and an explicit contract;
this package must not synthesize bindings by rewriting editable user source.
