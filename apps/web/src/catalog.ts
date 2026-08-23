export type CatalogEntry = {
  slug: string;
  name: string;
  detail: string;
  status: "live" | "catalogued" | "planned";
  to: string;
};

export type CatalogFolder = {
  slug: string;
  label: string;
  title: string;
  description: string;
  entries: CatalogEntry[];
};

export const catalogFolders: CatalogFolder[] = [
  {
    slug: "bundlers",
    label: "bundlers/",
    title: "Browser bundlers",
    description: "External compiler runtimes",
    entries: [
      { slug: "rspack", name: "rspack", detail: "WASM compiler", status: "live", to: "/bundlers/rspack" },
      { slug: "rolldown", name: "rolldown", detail: "Browser runtime", status: "live", to: "/bundlers/rolldown" },
      { slug: "rolldown-rs-plugin", name: "rolldown-rs-plugin", detail: "Vooya experiment", status: "planned", to: "/bundlers/rolldown-rs-plugin" },
    ],
  },
  {
    slug: "examples",
    label: "examples/",
    title: "Vooya examples",
    description: "Existing integration stories",
    entries: [
      { slug: "scatter-plot", name: "scatter-plot", detail: "150k point canvas", status: "live", to: "/examples/scatter-plot" },
      { slug: "data-grid-benchmark", name: "data-grid-benchmark", detail: "100k row benchmark", status: "catalogued", to: "/examples/data-grid-benchmark" },
      { slug: "trace-waterfall", name: "trace-waterfall", detail: "Interactive timeline", status: "catalogued", to: "/examples/trace-waterfall" },
    ],
  },
  {
    slug: "graphics",
    label: "graphics/",
    title: "Graphics workloads",
    description: "High-CPU browser scenes",
    entries: [
      { slug: "threejs-cpu", name: "threejs-cpu", detail: "Scene stress test", status: "planned", to: "/graphics/threejs-cpu" },
    ],
  },
];

export const catalogEntryByPath = new Map(
  catalogFolders.flatMap((folder) => folder.entries.map((entry) => [entry.to, { ...entry, folder }] as const)),
);
