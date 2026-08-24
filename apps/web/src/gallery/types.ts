export type GalleryCategory = "Graphics" | "Data" | "Media" | "Compute";

export type GalleryEntry = {
  slug: string;
  name: string;
  summary: string;
  category: GalleryCategory;
  status: "live" | "planned";
  route?: string;
  tags: string[];
  visual: "scatter" | "grid" | "trace" | "image";
};
