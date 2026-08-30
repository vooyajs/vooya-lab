#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";

const [mode, inputPath, outputPath] = process.argv.slice(2);
if (!mode || !inputPath || !outputPath) {
  throw new Error("Usage: sanitize-expanded-rust.mjs <wasm-bindgen|js-sys|scaffold> <input.rs> <output.rs>");
}

const source = readFileSync(inputPath, "utf8");

function sanitizeWasmBindgen(value) {
  const lines = value.split("\n");
  const removed = lines.filter((line) => line.includes("wasm_bindgen_macro")).length;
  if (removed < 4) throw new Error(`Expected wasm-bindgen macro re-exports, removed only ${removed} lines`);
  return lines.filter((line) => !line.includes("wasm_bindgen_macro")).join("\n");
}

function sanitizeJsSys(value) {
  const lines = value.split("\n");
  const output = [];
  let removed = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trimStart().startsWith("#[deprecated")) {
      output.push(line);
      continue;
    }
    let end = index;
    while (end < lines.length && !lines[end].trimEnd().endsWith("]")) end += 1;
    const following = lines.slice(end + 1, end + 4).map((entry) => entry?.trim());
    if (
      following[0] === "#[allow(deprecated)]"
      && following[1] === '#[link(wasm_import_module = "__wbindgen_placeholder__")]'
      && following[2] === 'extern "C" {'
    ) {
      removed += 1;
      index = end;
      continue;
    }
    output.push(...lines.slice(index, end + 1));
    index = end;
  }
  if (removed !== 10) throw new Error(`Expected 10 expanded js-sys foreign-module deprecations, removed ${removed}`);
  return output.join("\n");
}

function sanitizeScaffold(value) {
  const replacements = [
    ["extern crate std;\n", "extern crate std;\nextern crate alloc;\n"],
    ["use wasm_bindgen::{prelude::wasm_bindgen, JsValue};", "use wasm_bindgen::JsValue;"],
    ["std::prelude::rust_2024", "std::prelude::rust_2021"],
  ];
  let output = value;
  for (const [from, to] of replacements) {
    if (!output.includes(from)) throw new Error(`Expanded scaffold is missing expected fragment: ${from}`);
    output = output.replace(from, to);
  }
  return output;
}

const sanitizers = {
  "wasm-bindgen": sanitizeWasmBindgen,
  "js-sys": sanitizeJsSys,
  scaffold: sanitizeScaffold,
};
const sanitize = sanitizers[mode];
if (!sanitize) throw new Error(`Unsupported expanded Rust sanitizer mode: ${mode}`);
writeFileSync(outputPath, sanitize(source));
