import { enumerateIdeFiles } from "@vooya-lab/ide";

const sourceModules = import.meta.glob("./**/*.{rs,vue,css,ts,json}", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

export const sourceFiles = enumerateIdeFiles(sourceModules, {
  basePath: "cases/examples/scatter-plot",
});
