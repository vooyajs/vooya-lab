<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import RenderCaseStage from "../components/RenderCaseStage.vue";
import { catalogEntryByPath } from "../catalog";

const route = useRoute();
const entry = computed(() => catalogEntryByPath.get(route.path));
const renderKind = computed(() => {
  const slug = entry.value?.slug;
  if (slug === "scatter-plot") return "scatter" as const;
  if (slug === "data-grid-benchmark") return "grid" as const;
  if (slug === "trace-waterfall") return "trace" as const;
  return "threejs" as const;
});
const sourcePath = computed(() => {
  if (!entry.value) return "cases/";
  return `cases/${entry.value.folder.slug}/${entry.value.slug}`;
});
const githubUrl = computed(() => {
  if (!entry.value) return "https://github.com/vooyajs/vooya-lab/tree/main/cases";
  if (entry.value.folder.slug === "examples") {
    if (entry.value.status === "live") return `https://github.com/vooyajs/vooya-lab/tree/main/cases/${entry.value.folder.slug}/${entry.value.slug}`;
    const references: Record<string, string> = {
      "scatter-plot": "https://github.com/vooyajs/vooya/blob/main/docs/guide/scatter-plot.md",
      "data-grid-benchmark": "https://github.com/vooyajs/vooya/blob/main/docs/benchmarks/data-grid.md",
      "trace-waterfall": "https://github.com/vooyajs/vooya/blob/main/docs/benchmarks/trace-waterfall.md",
    };
    return references[entry.value.slug] ?? "https://github.com/vooyajs/vooya/tree/main/docs";
  }
  return `https://github.com/vooyajs/vooya-lab/tree/main/cases/${entry.value.folder.slug}/${entry.value.slug}`;
});

const fileMap: Record<string, string[]> = {
  "scatter-plot": ["src/ScatterPlot.rs", "src/ScatterPlot.css", "case.json"],
  "data-grid-benchmark": ["src/DataGrid.rs", "src/DataGrid.css", "src/App.vue"],
  "trace-waterfall": ["src/TraceWaterfall.rs", "src/TraceWaterfall.css", "src/App.vue"],
  "rolldown-rs-plugin": ["src/rolldown-plugin.rs", "src/rolldown.worker.ts", "case.json"],
  "threejs-cpu": ["src/ThreeCpuScene.rs", "src/ThreeCpuScene.css", "case.json"],
};

const descriptionMap: Record<string, string> = {
  "scatter-plot": "A 150,000-point canvas workload where a Rust/WASM island owns generation, drawing, zoom, and live summary updates.",
  "data-grid-benchmark": "A 100,000-row virtualized grid that makes filtering, sorting, scrolling, and benchmark evidence observable in one case.",
  "trace-waterfall": "An interactive timeline example for checking dense visual updates and browser event integration across a Vooya boundary.",
  "threejs-cpu": "A future graphics stress case for measuring CPU-heavy scene preparation beside a Three.js render loop, with the expensive calculation isolated in Rust/WASM.",
};

const nextStepMap: Record<string, string> = {
  "scatter-plot": "Author a Rust-file component with explicit point-count props and preserve its 150k-point interaction evidence.",
  "data-grid-benchmark": "Author the grid as a Rust-file component and record filter, virtual-scroll, and median/p95 timings.",
  "trace-waterfall": "Author the timeline as a Rust-file component with explicit service filtering and event-heavy update measurements.",
  "threejs-cpu": "Start with a Rust-file deterministic CPU kernel and compare JS/WASM timings before adding a full Three.js scene.",
};

const description = computed(() => descriptionMap[entry.value?.slug ?? ""] ?? "This case is part of the lab catalogue.");
const nextStep = computed(() => nextStepMap[entry.value?.slug ?? ""] ?? "Define the first runnable boundary.");
const files = computed(() => fileMap[entry.value?.slug ?? ""] ?? ["case.json"]);
const statusLabel = computed(() => {
  if (entry.value?.status === "live") return "live · Rust-file component";
  if (entry.value?.status === "catalogued") return "reference available · Rust-file port pending";
  return "planned experiment · Rust-file target";
});
</script>

<template>
  <div v-if="entry" class="catalog-case">
    <div class="catalog-case-header">
      <div>
        <p class="eyebrow">{{ entry.folder.label.toUpperCase() }} / {{ entry.name.toUpperCase() }}</p>
        <h2>{{ entry.name }}</h2>
      </div>
      <a class="source-link" :href="githubUrl" target="_blank" rel="noreferrer">{{ entry.folder.slug === "examples" ? "Reference ↗" : "Open source ↗" }}</a>
    </div>

    <div class="catalog-status" :data-status="entry.status">
      <span class="catalog-status-dot"></span>
      <div><strong>{{ statusLabel }}</strong><span>{{ entry.detail }}</span></div>
    </div>

    <p class="case-copy catalog-description">{{ description }}</p>
    <RenderCaseStage :kind="renderKind" :title="entry.name" />

    <details class="implementation-details">
      <summary>Implementation boundary <span>source, runtime, and next integration step</span></summary>
      <div class="implementation-grid">
        <section>
          <p class="section-kicker">SOURCE DIRECTORY</p>
          <h3>{{ sourcePath }}/</h3>
          <div class="source-tree-list"><code v-for="file in files" :key="file">{{ file }}</code></div>
        </section>
        <section>
          <p class="section-kicker">NEXT INTEGRATION</p>
          <h3>Boundary evidence</h3>
          <p>{{ nextStep }}</p>
        </section>
      </div>
      <div class="catalog-callout" :data-status="entry.status">
        <strong>{{ entry.status === "live" ? "Vooya Rust component active" : entry.status === "catalogued" ? "Visual preview shown · Rust-file port pending" : "Visual shell shown · integration pending" }}</strong>
        <span>The rendered stage is intentionally visible first; source details describe the current Rust-file target without claiming that this case is already runnable.</span>
      </div>
    </details>
  </div>
</template>
