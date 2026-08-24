export { default as VooyaIde } from "./VooyaIde.vue";
export { default as IdeFileTree } from "./IdeFileTree.vue";
export type { IdeFile, IdeSourceEnumerationOptions, IdeTreeNode } from "./types";

import type { IdeFile, IdeSourceEnumerationOptions } from "./types";

const languageByExtension: Record<string, string> = {
  css: "CSS",
  html: "HTML",
  js: "JavaScript",
  json: "JSON",
  jsx: "JSX",
  rs: "Rust",
  ts: "TypeScript",
  tsx: "TSX",
  vue: "Vue",
};

export function enumerateIdeFiles(
  sources: Record<string, string>,
  options: IdeSourceEnumerationOptions = {},
): IdeFile[] {
  const basePath = options.basePath?.replace(/^\/+|\/+$/g, "");

  return Object.entries(sources)
    .filter(([path]) => !options.exclude?.test(path))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([sourcePath, content]) => {
      const relativePath = sourcePath.replace(/^\.\//, "");
      const extension = relativePath.split(".").pop()?.toLowerCase() ?? "";
      return {
        path: basePath ? `${basePath}/${relativePath}` : relativePath,
        language: languageByExtension[extension] ?? "Text",
        content,
      };
    });
}
