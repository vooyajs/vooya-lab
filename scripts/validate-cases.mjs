import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import Ajv from "ajv";

const root = process.cwd();
const casesRoot = path.join(root, "cases");
const schema = JSON.parse(await readFile(path.join(casesRoot, "case.schema.json"), "utf8"));
const ajv = new Ajv({ allErrors: true, strict: true });
const validate = ajv.compile(schema);
const failures = [];
let caseCount = 0;

for (const category of await readdir(casesRoot, { withFileTypes: true })) {
  if (!category.isDirectory() || category.name.startsWith("_")) continue;
  const categoryPath = path.join(casesRoot, category.name);
  for (const entry of await readdir(categoryPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const caseDirectory = path.join(categoryPath, entry.name);
    const manifestPath = path.join(caseDirectory, "case.json");
    const specPath = path.join(caseDirectory, "SPEC.md");
    let manifest;
    try {
      manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      await readFile(specPath, "utf8");
    } catch (error) {
      failures.push(`${path.relative(root, caseDirectory)}: ${error.message}`);
      continue;
    }
    caseCount += 1;
    if (!validate(manifest)) {
      const details = ajv.errorsText(validate.errors, { dataVar: path.relative(root, manifestPath) });
      failures.push(details);
    }
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Validated ${caseCount} case specification units.\n`);
}
