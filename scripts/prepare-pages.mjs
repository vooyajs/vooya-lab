import { readdir, unlink } from "node:fs/promises";
import { join } from "node:path";

const assetDir = join(process.cwd(), "dist", "assets");
const names = await readdir(assetDir);
const rspackAssets = names.filter((name) => name.startsWith("rspack.wasm32-wasi-") && name.endsWith(".wasm"));

if (rspackAssets.length === 0) {
  throw new Error("Expected a generated Rspack WASM asset in dist/assets.");
}

for (const asset of rspackAssets) {
  await unlink(join(assetDir, asset));
  console.log(`Removed large Pages-external asset: ${asset}`);
}
