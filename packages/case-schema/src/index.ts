export type CaseStatus = "live" | "experimental" | "catalogued" | "planned";
export type CasePortfolioClass = "flagship" | "showcase" | "foundation" | "experiment";
export type CaseExecutionMode = "precompiled" | "browser-compiler" | "remote-compiler";
export type CaseDistributionMode = "copy" | "package" | "demo-only";
export type CaseGpuRelationship = "alternative" | "complement" | "not-applicable";

export interface LabCaseManifest {
  $schema: "../../case.schema.json";
  category: string;
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  cover?: string;
  status: CaseStatus;
  portfolioClass: CasePortfolioClass;
  question: string;
  spec: "./SPEC.md";
  vooyaComponent: string;
  runner?: string;
  host?: string;
  interactions: string[];
  reference?: string;
  evidence?: string[];
  execution: {
    mode: CaseExecutionMode;
    editable: boolean;
  };
  distribution: {
    mode: CaseDistributionMode;
    files: string[];
    dependencies?: string[];
    installCommand?: string;
  };
  proof: {
    hostOwns: string[];
    rustOwns: string[];
    gpuRelationship: CaseGpuRelationship;
    boundary: {
      inputs: string[];
      outputs: string[];
      updatePattern: string;
    };
    reusedCrates: string[];
    vooyaContracts: string[];
    alternatives: string[];
    performanceClaim?: {
      statement: string;
      benchmark: string;
    };
  };
}

export function caseRoute(manifest: Pick<LabCaseManifest, "category" | "slug">) {
  return `/cases/${manifest.category}/${manifest.slug}`;
}

export function caseSourceUrl(manifest: Pick<LabCaseManifest, "category" | "slug">) {
  return `https://github.com/vooyajs/vooya-lab/tree/main/cases/${manifest.category}/${manifest.slug}`;
}
