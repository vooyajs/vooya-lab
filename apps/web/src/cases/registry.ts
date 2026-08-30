import { caseRoute, type LabCaseManifest } from "@vooya-lab/case-schema";
import type { Component } from "vue";

export type CasePageModule = { default: Component };
export type CasePageLoader = () => Promise<CasePageModule>;

export interface RegisteredCase {
  manifest: LabCaseManifest;
  route: string;
  sourcePath: string;
  loadPage?: CasePageLoader;
}

const manifests = import.meta.glob<LabCaseManifest>("/cases/*/*/case.json", {
  eager: true,
  import: "default",
});

const pages = import.meta.glob<CasePageModule>("/cases/*/*/DemoPage.vue");

export const registeredCases = Object.entries(manifests)
  .map(([sourcePath, manifest]): RegisteredCase => {
    const caseDirectory = sourcePath.slice(0, -"/case.json".length);
    const pageLoader = pages[`${caseDirectory}/DemoPage.vue`];
    let pagePromise: Promise<CasePageModule> | undefined;
    return {
      manifest,
      route: caseRoute(manifest),
      sourcePath,
      loadPage: pageLoader
        ? () => (pagePromise ??= pageLoader().catch((error) => {
            pagePromise = undefined;
            throw error;
          }))
        : undefined,
    };
  })
  .sort((left, right) => left.manifest.title.localeCompare(right.manifest.title));

export const runnableCases = registeredCases.filter(
  (entry): entry is RegisteredCase & { loadPage: CasePageLoader } => Boolean(entry.loadPage),
);

export const caseGroups = Object.entries(
  registeredCases.reduce<Record<string, RegisteredCase[]>>((groups, entry) => {
    (groups[entry.manifest.category] ??= []).push(entry);
    return groups;
  }, {}),
).map(([category, entries]) => ({ category, entries }));

export const caseByRoute = new Map(registeredCases.map((entry) => [entry.route, entry]));

export function prefetchCase(route?: string) {
  const loadPage = route ? caseByRoute.get(route)?.loadPage : undefined;
  if (loadPage) void loadPage().catch(() => undefined);
}
