#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 4 ]]; then
  echo "Usage: build-browser-dom-dependencies.sh <exact-rustc> <target-sysroot> <vooya-core-package> <output.bundle>" >&2
  exit 2
fi

exact_rustc="$1"
target_sysroot="$2"
vooya_core_package="$3"
output_bundle="$4"
target="wasm32-unknown-unknown"
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d "${TMPDIR:-/tmp}/vooya-browser-dom-deps.XXXXXX")"
trap 'rm -rf "$work"' EXIT

test -x "$exact_rustc"
test -d "$target_sysroot/lib/rustlib/$target/lib"
test -f "$vooya_core_package/rust/src/lib.rs"

registry_root="${CARGO_HOME:-$HOME/.cargo}/registry/src"
wasm_bindgen_manifest="$(find "$registry_root" -path '*/wasm-bindgen-0.2.115/Cargo.toml' -print -quit)"
js_sys_manifest="$(find "$registry_root" -path '*/js-sys-0.3.92/Cargo.toml' -print -quit)"
web_sys_manifest="$(find "$registry_root" -path '*/web-sys-0.3.92/Cargo.toml' -print -quit)"
test -f "$wasm_bindgen_manifest"
test -f "$js_sys_manifest"
test -f "$web_sys_manifest"

export RUSTC="$exact_rustc"
export RUSTC_BOOTSTRAP=1
export CARGO_PROFILE_DEV_STRIP=false
export CARGO_PROFILE_RELEASE_STRIP=false

wasm_target="$work/wasm-bindgen-target"
js_target="$work/js-sys-target"
web_target="$work/web-sys-target"
scaffold_target="$work/scaffold-target"

CARGO_TARGET_DIR="$wasm_target" cargo rustc --locked --manifest-path "$wasm_bindgen_manifest" \
  --target "$target" --lib -- -Zunpretty=expanded > "$work/wasm-bindgen-expanded.rs"
node "$repo_root/scripts/sanitize-expanded-rust.mjs" wasm-bindgen \
  "$work/wasm-bindgen-expanded.rs" "$work/wasm-bindgen-runtime.rs"

cfg_if="$(find "$wasm_target/$target/debug/deps" -name 'libcfg_if-*.rlib' -print -quit)"
once_cell="$(find "$wasm_target/$target/debug/deps" -name 'libonce_cell-*.rlib' -print -quit)"
unicode_ident="$(find "$wasm_target/$target/debug/deps" -name 'libunicode_ident-*.rlib' -print -quit)"
wasm_bindgen_shared="$(find "$wasm_target/$target/debug/deps" -name 'libwasm_bindgen_shared-*.rlib' -print -quit)"

"$exact_rustc" --crate-name wasm_bindgen --edition=2021 "$work/wasm-bindgen-runtime.rs" \
  --crate-type lib --target "$target" --sysroot "$target_sysroot" -Copt-level=3 -Cdebuginfo=0 \
  -Cmetadata=vooya_browser_wasm_bindgen_0_2_115 -o "$work/libwasm_bindgen-browser.rlib" \
  --extern "cfg_if=$cfg_if" --extern "once_cell=$once_cell" \
  --extern "wasm_bindgen_shared=$wasm_bindgen_shared" \
  -L "dependency=$wasm_target/$target/debug/deps" \
  '-Zcrate-attr=feature(fmt_helpers_for_derive,coverage_attribute,derive_clone_copy_internals,derive_eq_internals,hint_must_use,panic_internals,structural_match,trivial_clone,liballoc_internals)'

CARGO_TARGET_DIR="$js_target" cargo rustc --locked --manifest-path "$js_sys_manifest" \
  --target "$target" --lib -- -Zunpretty=expanded > "$work/js-sys-expanded.rs"
node "$repo_root/scripts/sanitize-expanded-rust.mjs" js-sys \
  "$work/js-sys-expanded.rs" "$work/js-sys-runtime.rs"

"$exact_rustc" --crate-name js_sys --edition=2021 "$work/js-sys-runtime.rs" \
  --crate-type lib --target "$target" --sysroot "$target_sysroot" -Copt-level=3 -Cdebuginfo=0 \
  -Cmetadata=vooya_browser_js_sys_0_3_92 -o "$work/libjs_sys-browser.rlib" \
  --extern "wasm_bindgen=$work/libwasm_bindgen-browser.rlib" --extern "once_cell=$once_cell" \
  -L "dependency=$wasm_target/$target/debug/deps" \
  '-Zcrate-attr=feature(core_intrinsics,coverage_attribute,derive_clone_copy_internals,derive_eq_internals,fmt_helpers_for_derive,panic_internals,structural_match,trivial_clone)'

CARGO_TARGET_DIR="$web_target" cargo rustc --locked --manifest-path "$web_sys_manifest" \
  --target "$target" --lib \
  --features 'Document,Comment,Element,Event,EventTarget,HtmlCollection,CustomEvent,CustomEventInit,Node,Window' \
  -- -Zunpretty=expanded > "$work/web-sys-expanded.rs"

"$exact_rustc" --crate-name web_sys --edition=2021 "$work/web-sys-expanded.rs" \
  --crate-type lib --target "$target" --sysroot "$target_sysroot" -Copt-level=3 -Cdebuginfo=0 \
  -Cmetadata=vooya_browser_web_sys_0_3_92 -o "$work/libweb_sys-browser.rlib" \
  --extern "wasm_bindgen=$work/libwasm_bindgen-browser.rlib" \
  --extern "js_sys=$work/libjs_sys-browser.rlib" \
  -L "dependency=$wasm_target/$target/debug/deps" \
  '-Zcrate-attr=feature(coverage_attribute,derive_eq_internals,fmt_helpers_for_derive,structural_match)'

"$exact_rustc" --crate-name vooya_core --edition=2024 "$vooya_core_package/rust/src/lib.rs" \
  --crate-type lib --target "$target" --sysroot "$target_sysroot" -Copt-level=3 -Cdebuginfo=0 \
  -Cmetadata=vooya_browser_core_dom_alpha_10 -o "$work/libvooya_core-browser-dom.rlib" \
  --extern "wasm_bindgen=$work/libwasm_bindgen-browser.rlib" \
  --extern "web_sys=$work/libweb_sys-browser.rlib" \
  -L "dependency=$work" -L "dependency=$wasm_target/$target/debug/deps"

CARGO_TARGET_DIR="$scaffold_target" cargo rustc --locked \
  --manifest-path "$repo_root/tooling/browser-toolchain/vooya-dom-scaffold/Cargo.toml" \
  --target "$target" --release -- -Zunpretty=expanded > "$work/scaffold-expanded.rs"
node "$repo_root/scripts/sanitize-expanded-rust.mjs" scaffold \
  "$work/scaffold-expanded.rs" "$work/scaffold-runtime.rs"

"$exact_rustc" --crate-name vooya_gate_two_dom_scaffold --edition=2021 "$work/scaffold-runtime.rs" \
  --crate-type lib --target "$target" --sysroot "$target_sysroot" -Copt-level=3 -Cdebuginfo=0 \
  -Cmetadata=vooya_gate_two_dom_scaffold_0_2_115 -o "$work/libvooya_gate_two_dom_scaffold-browser.rlib" \
  --extern "wasm_bindgen=$work/libwasm_bindgen-browser.rlib" \
  --extern "js_sys=$work/libjs_sys-browser.rlib" \
  --extern "web_sys=$work/libweb_sys-browser.rlib" \
  --extern "vooya_core=$work/libvooya_core-browser-dom.rlib" \
  -L "dependency=$work" -L "dependency=$wasm_target/$target/debug/deps" \
  '-Zcrate-attr=feature(thread_local_internals,hint_must_use,liballoc_internals)'

cp "$cfg_if" "$once_cell" "$unicode_ident" "$wasm_bindgen_shared" "$work/"
node "$repo_root/scripts/package-browser-dependencies.mjs" "$work" "$target" "$output_bundle" \
  'libwasm_bindgen-,libjs_sys-,libweb_sys-,libvooya_core-,libvooya_gate_two_dom_scaffold-,libcfg_if-,libonce_cell-,libunicode_ident-,libwasm_bindgen_shared-'
