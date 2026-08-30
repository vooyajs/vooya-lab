import { caseRoute, type LabCaseManifest } from "@vooya-lab/case-schema";
import type { Component } from "vue";

type PageModule = { default: Component };

export interface RegisteredCase {
  manifest: LabCaseManifest;
  route: string;
  sourcePath: string;
  loadPage?: () => Promise<PageModule>;
}

const manifests = import.meta.glob<LabCaseManifest>("/cases/*/*/case.json", {
  eager: true,
  import: "default",
});

const pages = import.meta.glob<PageModule>("/cases/*/*/DemoPage.vue");

export const registeredCases = Object.entries(manifests)
  .map(([sourcePath, manifest]): RegisteredCase => {
    const caseDirectory = sourcePath.slice(0, -"/case.json".length);
    return {
      manifest,
      route: caseRoute(manifest),
      sourcePath,
      loadPage: pages[`${caseDirectory}/DemoPage.vue`],
    };
  })
  .sort((left, right) => left.manifest.title.localeCompare(right.manifest.title));

export const runnableCases = registeredCases.filter(
  (entry): entry is RegisteredCase & { loadPage: () => Promise<PageModule> } => Boolean(entry.loadPage),
);

export const caseGroups = Object.entries(
  registeredCases.reduce<Record<string, RegisteredCase[]>>((groups, entry) => {
    (groups[entry.manifest.category] ??= []).push(entry);
    return groups;
  }, {}),
).map(([category, entries]) => ({ category, entries }));

export const caseByRoute = new Map(registeredCases.map((entry) => [entry.route, entry]));
