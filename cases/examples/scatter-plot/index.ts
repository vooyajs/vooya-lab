import type { GalleryEntry } from "@lab-web/gallery/types";

export const scatterPlotDemo = {
  slug: "scatter-plot",
  name: "R-tree Scatter Explorer",
  summary: "Query nearest neighbors across 150,000 points with Rust's rstar spatial index.",
  category: "Graphics",
  status: "live",
  route: "/showcase/scatter-plot",
  tags: ["R-tree", "150k points", "Vue"],
  visual: "scatter",
} satisfies GalleryEntry;

export { default as ScatterPlotDemoPage } from "./DemoPage.vue";
