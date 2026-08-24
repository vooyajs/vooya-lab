import { scatterPlotDemo } from "@lab-cases/examples/scatter-plot";
import { plannedDemos } from "./roadmap";
import type { GalleryEntry } from "./types";

export const galleryEntries: GalleryEntry[] = [scatterPlotDemo, ...plannedDemos];

export const galleryCategories = ["All", "Graphics", "Data"] as const;
