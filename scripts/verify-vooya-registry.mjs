// Verify the actual installed public-package graph, not the Lab workspace aliases.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const nodeModules = realpathSync(join(root, "node_modules"));
const expected = new Map([
  ["@vooya/vite", "0.2.0-alpha.0"], ["@vooya/vue", "0.2.0-alpha.0"],
  ["@vooya/build-core", "0.2.0-alpha.0"], ["@vooya/provider-rust", "0.2.0-alpha.0"],
  ["@vooya/compiler", "0.1.0-beta.0"], ["@vooya/core", "0.1.0-beta.0"],
]);
const lock = readFileSync(join(root, "pnpm-lock.yaml"), "utf8");
const checked = new Map();
function inspect(name, from) {
  const req = createRequire(join(from, "package.json"));
  const manifestPath = req.resolve.paths(name)?.map(path => join(path, name, "package.json")).find(existsSync);
  assert.ok(manifestPath, `missing installed ${name}`);
  const path = realpathSync(manifestPath);
  const location = relative(nodeModules, path);
  assert.ok(!isAbsolute(location) && location !== ".." && !location.startsWith(`..${sep}`), `${name} must resolve inside this checkout's node_modules`);
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(manifest.name, name);
  assert.equal(manifest.version, expected.get(name), `unexpected installed version: ${name}`);
  if (checked.has(name)) {
    assert.equal(path, checked.get(name), `duplicate ${name} installation`);
    return;
  }
  checked.set(name, path);
  const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(command, ["view", `${name}@${manifest.version}`, "--json", "--registry=https://registry.npmjs.org"], {
    cwd: root, encoding: "utf8", timeout: 60_000, shell: process.platform === "win32",
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  const registry = JSON.parse(result.stdout);
  assert.equal(registry.name, name);
  assert.equal(registry.version, manifest.version);
  assert.equal(new URL(registry.dist.tarball).origin, "https://registry.npmjs.org");
  assert.match(registry.dist.integrity, /^sha512-/);
  const key = `  '${name}@${manifest.version}':\n`;
  const start = lock.indexOf(key);
  assert.notEqual(start, -1, `missing registry lock entry ${name}`);
  const remainder = lock.slice(start + key.length);
  const end = remainder.search(/\n  \S/);
  const entry = remainder.slice(0, end < 0 ? undefined : end);
  assert.ok(!/\btarball:/.test(entry), `${name}: explicit tarball resolutions are not registry adoption evidence`);
  assert.ok(entry.includes(`integrity: ${registry.dist.integrity}`), `${name}: lockfile integrity must match public registry`);
  for (const field of ["dependencies", "optionalDependencies"]) {
    assert.deepEqual(manifest[field] ?? {}, registry[field] ?? {}, `${name}: installed ${field} mismatch`);
    for (const [dependency, version] of Object.entries(manifest[field] ?? {})) {
      if (!dependency.startsWith("@vooya/")) continue;
      assert.equal(version, expected.get(dependency), `${name}: internal dependency must be exact`);
      inspect(dependency, dirname(path));
    }
  }
  console.log(`Verified installed registry manifest and lock integrity: ${name}@${manifest.version}`);
}
const app = join(root, "apps/web");
inspect("@vooya/vite", app);
inspect("@vooya/vue", app);
assert.deepEqual([...checked.keys()].sort(), [...expected.keys()].sort());
console.log("Verified six installed Vooya registry packages; no workspace package fallback.");
