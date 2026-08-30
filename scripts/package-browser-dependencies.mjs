#!/usr/bin/env node
import { createHash } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync, readdirSync, statSync, writeFileSync, writeSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const [targetDependencyDirectory, target, outputPath, requiredPrefixList = "libvooya_core-"] = process.argv.slice(2);
if (!targetDependencyDirectory || !target || !outputPath) {
  throw new Error("Usage: package-browser-dependencies.mjs <target-dependency-directory> <target> <output.bundle> [required-prefixes]");
}
if (!statSync(targetDependencyDirectory).isDirectory()) throw new Error(`Target dependency directory does not exist: ${targetDependencyDirectory}`);

const targetPaths = readdirSync(targetDependencyDirectory)
  .filter((name) => name.endsWith(".rlib"))
  .map((name) => join(targetDependencyDirectory, name))
  .sort();
const requiredPrefixes = requiredPrefixList.split(",").map((value) => value.trim()).filter(Boolean);
for (const required of requiredPrefixes) {
  if (!targetPaths.some((path) => basename(path).startsWith(required))) {
    throw new Error(`Required dependency ${required}*.rlib is missing from ${targetDependencyDirectory}`);
  }
}

let offset = 0;
const files = targetPaths.map((path) => ({ path, bundlePath: `target/${basename(path)}`, role: "target-rlib" })).map(({ path, bundlePath, role }) => {
  const bytes = readFileSync(path);
  const file = {
    source: path,
    p: bundlePath,
    role,
    o: offset,
    l: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  offset += file.l;
  return file;
});
const index = Buffer.from(JSON.stringify({
  format: "RIWB1",
  kind: "dependencies",
  target,
  rustRef: process.env.VOOYA_RUST_REF ?? "unknown",
  files: files.map(({ p, role, o, l, sha256 }) => ({ p, role, o, l, sha256 })),
  total: offset,
}));
const header = Buffer.alloc(10);
header.write("RIWB1\n", 0, "ascii");
header.writeUInt32LE(index.byteLength, 6);

mkdirSync(dirname(outputPath), { recursive: true });
const descriptor = openSync(outputPath, "w");
try {
  writeSync(descriptor, header);
  writeSync(descriptor, index);
  for (const file of files) writeSync(descriptor, readFileSync(file.source));
} finally {
  closeSync(descriptor);
}

const bundle = readFileSync(outputPath);
const manifest = {
  schema: "vooya.browser-dependencies/0.1",
  target,
  rustRef: process.env.VOOYA_RUST_REF ?? "unknown",
  bundle: {
    file: basename(outputPath),
    byteLength: bundle.byteLength,
    sha256: createHash("sha256").update(bundle).digest("hex"),
  },
  fileCount: files.length,
  payloadBytes: offset,
  files: files.map(({ p, role, l, sha256 }) => ({ path: p, role, byteLength: l, sha256 })),
};
writeFileSync(`${outputPath}.json`, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
