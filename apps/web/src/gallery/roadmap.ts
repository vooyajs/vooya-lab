import type { GalleryEntry } from "./types";

export const plannedDemos: GalleryEntry[] = [
  {
    slug: "data-grid",
    name: "100k Row Data Grid",
    summary: "Filtering, sorting and virtualization across a typed WASM boundary.",
    category: "Data",
    status: "planned",
    tags: ["Virtual list", "Benchmark"],
    visual: "grid",
  },
  {
    slug: "trace-waterfall",
    name: "Trace Waterfall",
    summary: "Explore thousands of spans without blocking the host interface.",
    category: "Data",
    status: "planned",
    tags: ["Timeline", "Events"],
    visual: "trace",
  },
  {
    slug: "image-pipeline",
    name: "Image Pipeline",
    summary: "Compare a browser image transform implemented in JavaScript and Rust.",
    category: "Graphics",
    status: "planned",
    tags: ["Pixels", "Compare"],
    visual: "image",
  },
];
