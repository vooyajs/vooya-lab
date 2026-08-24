export type ExperimentEntry = {
  slug: string;
  name: string;
  detail: string;
  status: "live" | "planned";
  to: string;
};

export type ExperimentFolder = {
  slug: string;
  label: string;
  title: string;
  description: string;
  entries: ExperimentEntry[];
};

export const experimentFolders: ExperimentFolder[] = [
  {
    slug: "bundlers",
    label: "bundlers/",
    title: "Browser bundlers",
    description: "External compiler runtimes",
    entries: [
      { slug: "rspack", name: "rspack", detail: "WASM compiler", status: "live", to: "/bundlers/rspack" },
      { slug: "rolldown", name: "rolldown", detail: "Browser runtime", status: "live", to: "/bundlers/rolldown" },
    ],
  },
];
