# `@vooya-lab/preview-host`

Framework-independent lifecycle host for trusted or constrained Vooya artifact
previews. Each artifact runs in a sandboxed iframe without same-origin access.
Reset and disposal remove the whole iframe realm rather than pretending that a
WASM instance can be unloaded from the main application realm.

The package is not an untrusted-code security boundary. The current iframe CSP
blocks network access and top-level capabilities, but public arbitrary-code
execution still requires a separate origin, quotas, build isolation, and a
threat model.
