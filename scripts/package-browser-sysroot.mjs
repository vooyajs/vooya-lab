#!/usr/bin/env node
import { createHash } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync, readdirSync, statSync, writeFileSync, writeSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const [targetLibDirectory, target, outputPath] = process.argv.slice(2);
if (!targetLibDirectory || !target || !outputPath) {
  throw new Error("Usage: package-browser-sysroot.mjs <target-lib-directory> <target> <output.bundle>");
}
if (!statSync(targetLibDirectory).isDirectory()) throw new Error(`Target library directory does not exist: ${targetLibDirectory}`);

function visit(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => entry.isDirectory() ? visit(join(directory, entry.name)) : [join(directory, entry.name)])
    .sort();
}

const files = visit(targetLibDirectory).map((path) => {
  const bytes = readFileSync(path);
  return {
    source: path,
    p: `lib/rustlib/${target}/lib/${relative(targetLibDirectory, path).replaceAll("\\", "/")}`,
    o: 0,
    l: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
});
if (!files.some((file) => basename(file.source).startsWith("libcore-") && file.source.endsWith(".rlib"))) {
  throw new Error(`No libcore rlib found in ${targetLibDirectory}`);
}

let offset = 0;
for (const file of files) {
  file.o = offset;
  offset += file.l;
}
const index = Buffer.from(JSON.stringify({
  format: "RIWB1",
  target,
  rustRef: process.env.VOOYA_RUST_REF ?? "unknown",
  files: files.map(({ p, o, l, sha256 }) => ({ p, o, l, sha256 })),
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
  schema: "vooya.browser-sysroot/0.1",
  target,
  rustRef: process.env.VOOYA_RUST_REF ?? "unknown",
  compilerArtifact: process.env.VOOYA_COMPILER_ARTIFACT ?? "unknown",
  bundle: {
    file: basename(outputPath),
    byteLength: bundle.byteLength,
    sha256: createHash("sha256").update(bundle).digest("hex"),
  },
  fileCount: files.length,
  payloadBytes: offset,
};
writeFileSync(`${outputPath}.json`, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
