<script setup lang="ts">
import { computed, ref } from "vue";
import type { LabCaseManifest } from "@vooya-lab/case-schema";
import { VooyaWorkbench } from "@vooya-lab/ide";
import manifestData from "./case.json";
import ScatterBaseline from "./ScatterBaseline.vue";
import ScatterPlot from "./src/ScatterPlot.rs";
import { sourceFiles } from "./sourceFiles";
import "./src/ScatterPlot.css";

const manifest = manifestData as LabCaseManifest;
const implementation = ref<"vooya" | "javascript">("vooya");
const points = ref(150_000);
const zoom = ref(1);
const copyState = ref("Copy component");
const rustEntryPath = "cases/examples/scatter-plot/src/ScatterPlot.rs";
const rustSource = computed(() => sourceFiles.find((file) => file.path === rustEntryPath)?.content ?? "");

function resetPreview() {
  points.value = 150_000;
  zoom.value = 1;
  implementation.value = "vooya";
}

async function copyComponent() {
  await navigator.clipboard.writeText(rustSource.value);
  copyState.value = "Copied";
  window.setTimeout(() => { copyState.value = "Copy component"; }, 1600);
}
</script>

<template>
  <article class="case-detail">
    <header class="case-intro">
      <div><span class="case-kicker">{{ manifest.portfolioClass }} · {{ manifest.proof.reusedCrates.join(' + ') }}</span><span class="case-route">/cases/{{ manifest.category }}/{{ manifest.slug }}</span></div>
      <div class="case-title-row"><h1>R-tree <em>scatter</em></h1><span>LIVE FOUNDATION</span></div>
      <div class="case-intro-copy">
        <p>{{ manifest.summary }}</p>
        <p><b>WHY VOOYA</b>Reuse a production Rust spatial-index crate behind typed props and a component-owned lifecycle, while Vue keeps the product interface.</p>
      </div>
    </header>

    <div class="case-content">
      <div class="case-section-title"><span>01 — Interactive preview</span><span>PRECOMPILED WASM · EDITABLE = FALSE</span></div>
      <section class="case-preview" aria-label="Interactive R-tree scatter preview">
        <div class="preview-runtime"><b>NEAREST-NEIGHBOR ENGINE</b><span>{{ implementation === 'vooya' ? 'Rust rstar R-tree via Vooya' : 'JavaScript linear scan' }}</span></div>
        <div class="preview-stage">
          <ScatterPlot v-if="implementation === 'vooya'" :points="points" :zoom="zoom" />
          <ScatterBaseline v-else :points="points" :zoom="zoom" />
          <div class="preview-watermark"><b>PROOF</b><span>Move across the field to query the nearest point.</span></div>
        </div>
        <div class="preview-controls">
          <div class="implementation-switch" role="group" aria-label="Choose implementation">
            <button type="button" :aria-pressed="implementation === 'javascript'" @click="implementation = 'javascript'">JAVASCRIPT</button>
            <button type="button" :aria-pressed="implementation === 'vooya'" @click="implementation = 'vooya'">VOOYA · WASM</button>
          </div>
          <label><span>POINTS <output>{{ points.toLocaleString() }}</output></span><input v-model.number="points" type="range" min="50000" max="200000" step="10000" /></label>
          <label><span>ZOOM <output>{{ Math.round(zoom * 100) }}%</output></span><input v-model.number="zoom" type="range" min="0.45" max="3" step="0.05" /></label>
          <button type="button" @click="resetPreview">RESET</button>
        </div>
      </section>
      <div class="under-preview">
        <p><b>Honest comparison.</b> A mature Rust R-tree is compared with a transparent JavaScript scan; this is not a universal Rust-versus-JavaScript benchmark.</p>
        <div><a href="https://github.com/vooyajs/vooya-lab/tree/main/cases/examples/scatter-plot" target="_blank" rel="noreferrer">View source ↗</a><button type="button" @click="copyComponent">{{ copyState }}</button></div>
      </div>

      <div class="case-section-title"><span>02 — Why this boundary?</span><span>CPU INDEX · HOST UI</span></div>
      <section class="case-boundary" aria-label="Host, Rust, and GPU responsibility boundary">
        <div class="boundary-lead"><strong>ECOSYSTEM REUSE</strong><p>{{ manifest.question }} The value is not “WASM draws dots faster”; it is keeping <code>rstar</code>, its data model, and pointer-query loop inside one bounded component.</p></div>
        <div class="boundary-flow">
          <section><span>01 · VUE / HOST</span><h2>Product surface</h2><p>{{ manifest.proof.hostOwns.join(' · ') }}</p></section>
          <section><span>02 · RUST / WASM</span><h2>Spatial capability</h2><p>{{ manifest.proof.rustOwns.join(' · ') }}</p></section>
          <section><span>03 · GPU</span><h2>Not required here</h2><p>Canvas 2D presents the points. A future GPU renderer could collaborate without taking ownership of the R-tree.</p></section>
        </div>
        <div class="boundary-foot"><span><b>Crossing:</b> {{ manifest.proof.boundary.inputs.join(' + ') }} → {{ manifest.proof.boundary.outputs.join(' + ') }}</span><span>{{ manifest.proof.boundary.updatePattern }}</span></div>
      </section>

      <div class="case-section-title"><span>03 — Source workbench</span><span>{{ sourceFiles.length }} FILES · READ ONLY</span></div>
      <section class="source-workbench" aria-label="Read-only source workbench">
        <div class="workbench-heading"><div><span>REAL CASE UNIT</span><h2>Inspect every layer</h2></div><p>The Rust artifact is precompiled. Props and preview stay interactive; source editing remains gated until the browser compiler produces real artifacts.</p></div>
        <VooyaWorkbench title="R-tree scatter case" :files="sourceFiles" :entry-path="rustEntryPath" :editable="manifest.execution.editable" :execution-mode="manifest.execution.mode" height="590px" />
      </section>

      <section class="case-notes">
        <div><span>ABOUT</span><p>This case builds an index over up to 200,000 deterministic points and performs nearest-neighbor queries on pointer movement. The Rust component owns its Canvas surface and disposal; the host owns page state and comparison controls.</p></div>
        <div><span>ALTERNATIVES CONSIDERED</span><p>{{ manifest.proof.alternatives.join(' · ') }}</p></div>
      </section>
    </div>
  </article>
</template>
