<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";
import ScatterPlot from "./src/ScatterPlot.rs";
import ScatterBaseline from "./ScatterBaseline.vue";
import { VooyaIde } from "@vooya-lab/ide";
import GallerySidebar from "@lab-web/components/GallerySidebar.vue";
import GalleryRail from "@lab-web/components/GalleryRail.vue";
import { sourceFiles } from "./sourceFiles";
import "./src/ScatterPlot.css";

const view = ref<"preview" | "source">("preview");
const implementation = ref<"vooya" | "javascript">("vooya");
const points = ref(150_000);
const zoom = ref(1);
const rustEntryPath = "cases/examples/scatter-plot/src/ScatterPlot.rs";

</script>

<template>
  <div class="demo-page">
    <GallerySidebar />

    <main class="demo-content">
      <header class="demo-title">
        <div><p class="demo-breadcrumb"><RouterLink to="/">Gallery</RouterLink> / Graphics</p><h1>R-tree Scatter Explorer</h1></div>
      </header>

      <div class="demo-action-row">
        <div class="demo-workbench-tabs" role="tablist" aria-label="Demo view">
          <button type="button" role="tab" :aria-selected="view === 'preview'" :class="{ active: view === 'preview' }" @click="view = 'preview'">◉ Preview</button>
          <button type="button" role="tab" :aria-selected="view === 'source'" :class="{ active: view === 'source' }" @click="view = 'source'">‹› Code</button>
        </div>
        <a href="https://github.com/vooyajs/vooya-lab/tree/main/cases/examples/scatter-plot" target="_blank" rel="noreferrer">View source ↗</a>
      </div>

      <section class="demo-workbench">

        <template v-if="view === 'preview'">
          <div class="implementation-bar">
            <div><span>Nearest-neighbor engine</span><strong>{{ implementation === 'vooya' ? 'Rust rstar R-tree via Vooya' : 'JavaScript linear scan' }}</strong></div>
            <div class="implementation-switch" role="group" aria-label="Choose implementation">
              <button type="button" :class="{ active: implementation === 'javascript' }" @click="implementation = 'javascript'">JavaScript</button>
              <button type="button" :class="{ active: implementation === 'vooya' }" @click="implementation = 'vooya'">Vooya · WASM</button>
            </div>
          </div>
          <div class="demo-stage">
            <ScatterPlot v-if="implementation === 'vooya'" :points="points" :zoom="zoom" />
            <ScatterBaseline v-else :points="points" :zoom="zoom" />
          </div>
          <p class="comparison-note">Move across the plot to query the nearest point. The comparison intentionally contrasts a mature Rust spatial-index crate with a straightforward JavaScript scan; timings describe this browser session, not every Rust or JavaScript program.</p>
        </template>
        <VooyaIde v-else title="Example source" :files="sourceFiles" :active-path="rustEntryPath" readonly height="590px" />
      </section>

      <template v-if="view === 'preview'">
        <h2 class="customize-heading">Customize</h2>
        <div class="demo-controls">
          <label><span>Points <output>{{ points.toLocaleString() }}</output></span><input v-model.number="points" type="range" min="50000" max="200000" step="10000" /></label>
          <label><span>Zoom <output>{{ Math.round(zoom * 100) }}%</output></span><input v-model.number="zoom" type="range" min="0.45" max="3" step="0.05" /></label>
          <button type="button" @click="points = 150_000; zoom = 1">Reset</button>
        </div>
      </template>

      <section class="demo-documentation">
        <h2>About</h2>
        <p>This example builds a spatial index over up to 200,000 deterministic points and performs a nearest-neighbor query whenever the pointer moves across the plot. Vue still owns the page and controls; the Rust component owns the indexed capability and its Canvas surface.</p>
        <p>The Vooya implementation reuses the production Rust <code>rstar</code> crate instead of porting its R-tree into application JavaScript. The baseline is intentionally a transparent linear scan. This demonstrates library reuse and integration cost—not a claim that every Rust implementation beats an optimized JavaScript spatial index.</p>

        <h2>Props</h2>
        <div class="props-table-wrap">
          <table class="props-table">
            <thead><tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>points</code></td><td><code>number</code></td><td><code>150000</code></td><td>Number of deterministic points rendered on the canvas.</td></tr>
              <tr><td><code>zoom</code></td><td><code>number</code></td><td><code>1</code></td><td>Canvas zoom factor, clamped between 0.45 and 5.</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
    <GalleryRail />
  </div>
</template>
