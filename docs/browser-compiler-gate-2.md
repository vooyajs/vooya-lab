# Browser Compiler Gate 2 Working Report

Date: 2026-08-30. Status: **controlled Gate 2 passed locally**. The hidden
experiment route compiles an editable, fixed-ABI Rust unit, links it into a
trusted Vooya DOM scaffold, runs official wasm-bindgen in a browser Worker, and
mounts the exact emitted glue and WASM through the isolated preview host.

This report is the handoff boundary for future agents. “Gate 2” here means one
reviewed `vooya-dom` profile, not arbitrary Cargo projects, editable procedural
macros, arbitrary component APIs, or a production untrusted-code service.

## What is working now

`#/experiments/browser-compiler` has one real local path:

```text
editable main.rs
  -> rustc.wasm in a dedicated Worker
  -> changed wasm32-wasip1 command artifact
  -> fresh constrained WASI Worker
  -> stdout / exit status
  -> precompiled Vooya summary component in a sandboxed iframe
```

The dynamic artifact is the WASI command in the middle. The final Vooya summary
is a repository-built shell that receives its result; this older Gate 1.5 path
is not the Gate 2 proof.

The route also has a second constrained path:

```text
editable ordinary Rust function
  -> fixed pre-expanded wasm-bindgen ABI scaffold rlib
  -> patched rustc.wasm + RIWL in a dedicated Worker
  -> raw wasm32-unknown-unknown module with preserved bindgen metadata
  -> official wasm-bindgen-cli-support 0.2.115 in a fresh WASI Worker
  -> generated JavaScript glue + transformed WASM
  -> generated glue imported and invoked in a fresh runtime Worker
  -> numeric result passed to the precompiled Vooya summary shell
```

This is **Gate 1.97**, not Gate 2. The editable region cannot alter the ABI,
use procedural macros, or define a DOM component. The visible summary remains
repository-built.

The accepted controlled Gate 2 path is:

```text
editable fixed-ABI Rust function
  -> exact-toolchain DOM dependency profile + trusted Vooya scaffold
  -> patched rustc.wasm + RIWL in a dedicated Worker
  -> raw wasm32-unknown-unknown component module
  -> official wasm-bindgen-cli-support 0.2.115 in a fresh WASI Worker
  -> generated JavaScript glue + transformed WASM
  -> packages/preview-host mounts those exact bytes in a new sandboxed iframe
  -> actual Vooya DOM lifecycle renders the edited Rust result
```

Local Chrome evidence on 2026-08-30:

| Observation | Result |
| --- | --- |
| Edited message | `changed through gate 1.5` |
| Browser-emitted artifact | `output.wasm`, 561,113 bytes |
| Artifact SHA-256 | `3fd63fe1b45af07a2ce9af3bbde265f79ccfb5c8d25977db0a0a21bd0aeab3ea` |
| Compile | succeeded in approximately 1.66 seconds with cached assets |
| Fresh Worker execution | stdout matched the edited message; exit `0`; approximately 1.5 ms |
| Preview | isolated Vooya iframe mounted and reflected the execution result |
| Console | zero errors and zero warnings |

This passes a useful **Gate 1.5**: edited Rust can become a new executable WASM
artifact and affect the page without a compiler server. It does not satisfy the
Gate 2 component contract below.

The same route now also passes a narrower **Gate 1.75 target probe**. The
browser compiler emitted and linked an import-free `wasm32-unknown-unknown`
`cdylib` from a `#![no_core]` source. The first valid source produced 129 bytes,
SHA-256 `12952c9e3d5a0706fee2f034d6d1f8c2b1dec12b37c1d489252b81281f749fde`,
and returned `42` from `vooya_gate_two_answer` in a fresh Worker. Editing the
constant to `73` produced 130 bytes, SHA-256
`05a2bfe0b791510474e6961c5817b8716dcd14b6f10653771b295f79a3c6e2b0`,
and the Worker returned `73`.

This proves that the compiler backend and in-process linker can emit Vooya's
target. It deliberately avoids `core`, allocation, dependencies, macros, and
wasm-bindgen, so it does not prove a usable Rust or Vooya sysroot.

The route now also passes **Gate 1.9** with a compiler and target sysroot built
from the same exact Rust revision, `abc48c0b8aba37d3f3862a9d5c76eb4e78f90e88`.
The linker fork already calculated the target's `__heap_base` and `__data_end`
values but rejected rustc's request to export them. The reviewed patch in
`tooling/browser-toolchain/riwl-export-absolute-globals.patch` emits those
linker-provided values as immutable WebAssembly globals.

Local Chrome evidence on 2026-08-30:

| Observation | First source | Edited source |
| --- | ---: | ---: |
| Rust path | `std` + `Vec` + allocation + iterator | changed `push(31)` to `push(32)` |
| Browser-emitted artifact | 450,732 bytes | 450,732 bytes |
| Artifact SHA-256 | `cc3eb25725157bb333d121d301a08c33b6b4a7fc7761aaa8265995aaeebba271` | `74c69e775b24608ffc45e261b16371889292373dda7d36b22e3ec83f45ca09dc` |
| Warm compile | 0.73 seconds | 0.71 seconds |
| Fresh Worker result | `73` | `74` |
| Runtime | 0.9 ms | 0.9 ms |
| Imports | none | none |

Both artifacts were compiled and linked inside the browser compiler Worker,
validated as WebAssembly, executed in a separate terminating Worker, and then
reflected through the isolated preview shell. The changed hash and result rule
out a lookup of a fixed prebuilt artifact. This proves a usable standard-library
foundation for the target; it still does not prove Vooya dependencies, macros,
Cargo semantics, or wasm-bindgen.

The route now also passes **Gate 1.95** with one real Vooya ecosystem
dependency. `tooling/browser-toolchain/vooya-core-dom-feature.patch` makes the
existing DOM runtime a default Cargo feature, leaving the reactive runtime
available without `web-sys`, `wasm-bindgen`, or their host procedural macros.
It does not copy reactive behavior into a case or replace Vooya Core.

Local Chrome evidence on 2026-08-30:

| Observation | First source | Edited source |
| --- | ---: | ---: |
| Vooya path | `vooya_core::signal(40)` then `+2` | `signal(41)` then `+3` |
| Browser-emitted artifact | 581,899 bytes | 581,899 bytes |
| Artifact SHA-256 | `12cd1c74830f170021b9aee88072ac3adae1656d751bd9f8e45ccc5be7faea63` | `d110c7ac5a6ea352f4c9179f295de8120154c182aa16aa62c6ce1dc67c48e53c` |
| Warm compile | 0.80 seconds | 0.81 seconds |
| Fresh Worker result | `42` | `44` |
| Runtime | 1.1 ms | fresh terminating Worker |

The dependency bundle contains one exact-toolchain `vooya-core` rlib and is
274,693 bytes. This proves a constrained Vooya runtime dependency and validates
the proposed Core feature split. It does not prove DOM APIs, component macros,
wasm-bindgen macros, Cargo resolution, or browser-side binding generation.

The route now passes **Gate 1.97** with a reviewed, fixed binding scaffold and
the official wasm-bindgen implementation running entirely in browser Workers.
RIWL previously dropped every custom section, including
`__wasm_bindgen_unstable`; the reviewed
`tooling/browser-toolchain/riwl-preserve-wasm-bindgen-section.patch` retains and
concatenates that linker metadata. The editable source itself contains no macro
and is not rewritten by the host.

Local Chrome evidence on 2026-08-30:

| Observation | First source | Edited source |
| --- | ---: | ---: |
| Editable function | `value + 2` | `value + 3` |
| Browser-emitted raw artifact | 438,039 bytes | 438,039 bytes |
| Artifact SHA-256 | `ace50188c229eaa0ba13c88bf408c5714d73c65d83fa41c127e7d05203852124` | `e9aa9b5dc8e6d381a321010581c6e5a6ae37357b1c1a1ad8ff836e1592ce71d8` |
| Warm rustc compile | 0.66 seconds | 0.64 seconds |
| Browser wasm-bindgen | 55.9 ms | 55.7 ms |
| Generated glue / transformed WASM | 3,281 UTF-16 code units / 86,113 bytes | same shape |
| Generated export result | `42` | `43` |
| Fresh runtime Worker | 0.9 ms | 0.9 ms |
| Console | zero errors and warnings | zero errors and warnings |

The changed source, raw artifact digest, and generated export result prove that
this is not a fixed prebuilt output. `packages/bindgen-browser` owns the binding
Worker, and `BrowserGeneratedGlueRunner` owns the terminating generated-glue
runtime Worker. `tooling/browser-toolchain/vooya-bindgen-scaffold.rs` is pinned
to one reviewed `i32 -> i32` ABI and wasm-bindgen `0.2.115`; changing either
requires regeneration and review.

## Controlled Gate 2 evidence

The committed `scripts/build-browser-dom-dependencies.sh` reproduced the
profile from the exact stage-1 compiler, target sysroot, pinned registry
sources, pinned `@vooya/core@0.1.0-alpha.10`, and the trusted scaffold. The
result contains nine target rlibs, is 23,654,447 bytes, and has SHA-256
`42427a60a1bc59d548f16e47ca9d892288e406172326c508c45088f107aa0364`.

That reproduced bundle—not the earlier hand-built trial bundle—then passed the
following local Chrome run on 2026-08-30:

| Observation | First source | Edited source |
| --- | ---: | ---: |
| Editable function | `value + 2` | `value + 3` |
| Browser-emitted raw artifact | 1,358,217 bytes | 1,358,217 bytes |
| Artifact SHA-256 | `e8b5597ebf3e670d03790873e49afd57ecc7e687b37a52ced43079637b72bbea` | `07c9c0020c5b7ea0227c160636451a8cbab140ae111ec19276a13e748308929d` |
| Warm rustc compile | 0.74 seconds | 0.73 seconds |
| Browser wasm-bindgen | 100.4 ms | same pipeline |
| Generated glue / transformed WASM | 30,222 UTF-16 code units / 226,449 bytes | same ABI shape |
| Isolated iframe DOM | `Rust answer: 42` | `Rust answer: 43` |
| Console | zero errors and warnings | zero errors and warnings |

Failure and lifecycle evidence was also exercised against the same route:

- `value +` produced the real rustc diagnostic `expected expression, found
  '}'` at `main.rs:4:1`; the previous realm was destroyed and no failed
  artifact remained.
- A subsequent valid edit mounted `Rust answer: 44`, proving clean recovery.
- Cancel during compilation terminated the compiler Worker, reported
  `Compilation cancelled`, and left no artifact or mounted preview.
- Reset replaced the iframe realm while preserving the last successful props;
  dispose removed the iframe and moved the preview host to `disposed`.

Chrome reported 29,018,086 bytes of used main-page JavaScript heap and
38,179,642 bytes allocated after a successful warm run on a machine exposing
32 GiB device memory. `performance.memory` excludes terminated Worker peaks,
WebAssembly/native module memory, and browser process overhead, so this is only
an observation—not a production memory bound. The decoded executable inputs
are approximately 241 MB before transient compile memory: 129.3 MB compiler,
84.8 MB target sysroot, 23.7 MB DOM profile, and 3.1 MB wasm-bindgen command.

An earlier full dependency bundle failed with `E0463`. Rust metadata showed
that `vooya-core -> wasm-bindgen -> wasm-bindgen-macro` required a host
proc-macro artifact. The WASI-hosted compiler accepts host proc macros only as
WASM/rlib artifacts and cannot load the native `.dylib`. Renaming native bytes
does not make them executable. Gate 2 therefore uses a macro-free runtime
profile plus controlled pre-expansion as the next experiment; native plugins
must never be disguised as browser support.

## Preview-host boundary

`packages/preview-host` now owns the component lifecycle independently from the
IDE and compiler implementation. It accepts raw wasm-bindgen JavaScript glue,
WASM bytes, an explicit Vooya ABI contract, props, and optional CSS.

Each mount creates a sandboxed iframe with scripts enabled but no same-origin
capability. Its CSP blocks network connections. Reset destroys and replaces the
whole iframe realm; disposal releases the component, object URL, pending
commands, listeners, and frame. A browser test verifies that reset produces a
different realm name and disposal removes the iframe.

This is a constrained preview lifecycle, not an untrusted-code security
boundary. Arbitrary public code still requires separate-origin isolation,
quotas, capability policy, provenance, and abuse controls.

## Exact current Vooya build contract

The repository build currently performs these stages:

1. Cargo compiles the generated Vooya application for
   `wasm32-unknown-unknown`.
2. The source uses Vooya procedural macros and the wasm-bindgen macro/runtime
   dependency chain.
3. A native `wasm-bindgen` CLI transforms the linked WASM with `--target web`.
4. The build emits JavaScript glue, the final WASM, schema data, and generated
   declarations.
5. The preview calls ABI version `1` exports following this shape:
   `voo_<stem>_mount`, `voo_<stem>_update_props`, and
   `voo_<stem>_dispose`.

A Gate 2 artifact must be compatible with this contract. Producing a WASI
command and passing its text through a precompiled component is not equivalent.

## Gap inventory

| Required Vooya stage | Current browser toolchain | Gate 2 requirement |
| --- | --- | --- |
| Rust target | `wasm32-unknown-unknown` passed at Gate 1.9 | preserve this target or approve a reviewed Core contract that changes it |
| Standard library | exact-revision `std`, `alloc`, and target runtime passed at Gate 1.9 | package as immutable release assets with provenance and rollback metadata |
| Dependencies | exact `vooya-dom` profile passed for the fixed component | immutable publication, provenance, cache policy, and a review process for new profiles |
| Procedural macros | trusted dependencies are pre-expanded during packaging; editable proc macros are unsupported | keep this explicit or design a separate reviewed host-proc-macro architecture |
| Cargo semantics | single direct rustc invocation | enough manifest/features/dependency behavior for the fixed template |
| Binding stage | official wasm-bindgen `0.2.115` passed for one fixed scaffold at Gate 1.97 | extend only through reviewed template ABIs; do not infer general macro or Cargo support |
| Vooya outputs | fixed DOM lifecycle glue + WASM from the same browser request | schema/declaration outputs and broader reviewed template contracts remain |
| Preview | exact browser-emitted glue + WASM mounted; reset/dispose passed | separate-origin untrusted-code security and production resource policy remain |

## Toolchain compatibility finding

The selected immutable source revisions are:

- Weblings `d0cd7a9f3af7d8249b3948ac0e19d2afc0d01633`;
- wasm-rustc `d7c1a08a60816ed824bb04f75fe79fa797996deb`.

The currently served, extracted experiment assets are also Fetch-SRI pinned:

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| `rustc.wasm` | 87,871,387 | `41412081eefc3e08ec5664ed0748902a7e575e1f267898dcc64d412702df7e83` |
| `sysroot-wasip1.bundle` | 71,313,335 | `6dba13d6077cb7936ed6661cd1087bc9e92dc1d8b35903ecf22881c97ac3980b` |

The locally reproduced, metadata-aligned Gate 1.9/1.95 toolchain set is:

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| patched `rustc.wasm` with bindgen metadata and export-root fixes | 129,252,357 | `d616ad3073ae929671e46d28d6e2e2cccf0cb6c524a42d0e2160e43b83ba5988` |
| `sysroot-wasm32-unknown-unknown.bundle` | 84,844,745 | `41038d3bdcc41c20248ee4a8706a1b18b0b8a0cc620b6c5ef4fb1969aae6acc5` |
| `vooya-reactive-dependencies.bundle` | 274,693 | `7c637f6b99a96f970c5e6480c160ae1685fe3f7fa6c6dd7c4fbb3b4367586068` |
| reproduced Gate 1.97 dependency bundle | 293,162 | `89c93a50537873c65f9329d5581cf0399f9da7c215e3f35709d2a9af49c039fa` |
| reproduced controlled Gate 2 DOM bundle | 23,654,447 | `42427a60a1bc59d548f16e47ca9d892288e406172326c508c45088f107aa0364` |
| wasm-bindgen WASI command | 3,098,366 | `f1887cba553b81444395d742c9dee27b29e8d98c0b304caf0b531b460c49a4ea` |

The local assets are ignored development symlinks, not committed binaries or a
published release. Their SRI values were supplied to Vite explicitly for the
Chrome acceptance run.

These digests prevent changed bytes at the mutable demo URLs from executing.
They do not replace Vooya-owned hosting, release provenance, or an update and
rollback policy.

The downloaded compiler identifies itself as `1.96.0-dev`; this repository's
current native compiler identifies itself as stable `1.94.0`. Rust library
metadata is compiler-specific. The wasm-rustc packaging script explicitly
avoids stage-0 libraries because their metadata version does not match the
packaged `rustc.wasm`. Therefore, copying this repository's locally built
`.rlib` files into the browser filesystem is not a valid dependency strategy.

The current Weblings artifact bundle provides a matching `wasm32-wasip1`
sysroot. It does not provide the `wasm32-unknown-unknown` sysroot and Vooya
dependency set required by the current build contract. See the pinned
[Weblings source](https://github.com/AngelOnFira/weblings),
[wasm-rustc source](https://github.com/AngelOnFira/wasm-rustc), and
[wasm-bindgen source](https://github.com/rustwasm/wasm-bindgen).

## Chosen next route

Gate 2 implementation is complete for the controlled profile. Proceed in
narrow, falsifiable release stages:

1. Publish the reproduced compiler and sysroot as immutable, Vooya-owned assets
   with provenance and rollback metadata. Do not depend on mutable demo hosts.
2. Run the prepared workflow in CI and compare its digest manifest with the
   locally reproduced profile. Preserve compiler commit, target, crate source
   digests, features, and artifact digests.
3. Add schema/declaration emission and a case-level spec for the first public
   controlled template. Case-local glue generation remains forbidden.
4. Add repeatable peak Worker/WebAssembly memory and cold-cache timing
   instrumentation before deciding whether mobile or low-memory browsers are
   eligible.
5. Enable `editable` only for a case whose spec explicitly selects the
   `vooya-dom` profile and records recovery, cancellation, copy, accessibility,
   and compatibility evidence.

The reproducible compiler-and-sysroot build is prepared in
`.github/workflows/browser-rustc-unknown-sysroot.yml`. It pins the exact Rust
revision, applies all three reviewed RIWL patches, builds the target at stage 1, builds
the WASI-hosted compiler at stage 2, and packages a digest manifest plus a
Weblings-compatible `RIWB1` bundle. It also packages the Gate 1.97 scaffold,
the controlled Gate 2 DOM profile, and the pinned browser wasm-bindgen WASI
command. The same stages were run locally and passed the Chrome evidence above;
the workflow itself has not yet run in CI, and publication/release provenance
remain open.

If publication or the first public-case profile fails at acceptable
payload/memory/latency, record the
failure before considering a remote compiler fallback. A fallback is a separate
execution mode and does not fulfill browser-resident Gate 2.

## Controlled DOM template profile

Gate 2 does not require arbitrary Cargo projects or browser execution of native
procedural macros. Its first accepted profile is deliberately narrower:

- the editable compilation unit supplies a reviewed Rust function with a fixed
  Rust ABI;
- `tooling/browser-toolchain/vooya-dom-scaffold.rs` owns the Vooya component
  lifecycle and the version-1 `voo_browser_probe_*` exports;
- Vooya and wasm-bindgen macros run once in the trusted toolchain packaging
  job, never against public input in the browser;
- packaging compiles the expanded `wasm-bindgen`, `js-sys`, selected `web-sys`,
  `vooya-core`, and scaffold sources into pure `wasm32-unknown-unknown` rlibs;
- the browser compiler links the editable unit against those exact rlibs and
  then runs the pinned official wasm-bindgen post-processor; and
- the preview host receives the JavaScript glue and transformed WASM produced
  by that same request and invokes the declared component ABI directly.

Pre-expansion is an immutable dependency-packaging technique, not a source
rewrite service. The Worker must compile the user's submitted bytes as-is and
must return rustc's source diagnostics. Adding another editable ABI, Web API
feature, dependency, or template requires a reviewed profile and a new
content-addressed bundle manifest. Arbitrary proc macros and manifests remain
out of scope.

The fixed component intentionally renders a value computed by the editable
Rust function. This makes changed source, changed raw-WASM digest, generated
glue, transformed WASM, and changed DOM one auditable chain. A repository-built
component that merely receives the numeric result does not satisfy this
profile.

## Gate 2 acceptance test

Controlled Gate 2 passed because one request on the hidden route:

- begins with edited Rust inside a fixed Vooya template;
- performs no remote compile request;
- emits real rustc diagnostics for that same template;
- produces ABI-compatible Vooya JavaScript glue and WASM;
- mounts those exact emitted bytes through `packages/preview-host`;
- visibly changes the component when the Rust source changes;
- supports failure, cancellation, retry, reset, and deterministic disposal; and
- records payload, warm timing, and a deliberately limited memory observation without claiming
  production readiness.

Normal cases remain `precompiled` and `editable: false` until a case-specific
spec opts into the controlled profile. CI publication, cold-cache and peak
memory measurement, schema/declaration output, and the first public editable
case remain open work; they do not invalidate the local fixed-template proof.
