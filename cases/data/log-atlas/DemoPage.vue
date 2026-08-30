<script setup lang="ts">
import { ref } from "vue";
import type { LabCaseManifest } from "@vooya-lab/case-schema";
import { CaseLiveWorkbench, VooyaWorkbench } from "@vooya-lab/ide";
import manifestData from "./case.json";
import LogAtlas from "./src/LogAtlas.rs";
import { sourceFiles } from "./sourceFiles";
import "./src/LogAtlas.css";

const manifest = manifestData as LabCaseManifest;
const query = ref(".*");
const minimumDuration = ref(300);
const windowSize = ref(8_000);
const rustEntryPath = "cases/data/log-atlas/src/LogAtlas.rs";
const presets = [
  { label: "ALL", value: ".*" },
  { label: "ERRORS", value: "error|5\\d\\d" },
  { label: "CHECKOUT", value: "checkout|orders" },
  { label: "SEARCH", value: "search|facets" },
];

function resetPreview() {
  query.value = ".*";
  minimumDuration.value = 300;
  windowSize.value = 8_000;
}

</script>

<template>
  <article class="case-detail log-atlas-page">
    <header class="case-intro">
      <div><span class="case-kicker">FLAGSHIP · ECOSYSTEM PORT</span><span class="case-route">/cases/data/log-atlas</span></div>
      <div class="case-title-row"><h1>Log <em>Atlas</em></h1><span>LIVE · LOCAL FIRST</span></div>
      <div class="case-intro-copy">
        <p>{{ manifest.summary }}</p>
        <p><b>WHY VOOYA</b>Keep the corpus, Rust parser, and regex engine on one side of a typed boundary; Vue sends three coarse controls and never owns 1,800 span objects.</p>
      </div>
    </header>

    <div class="case-content">
      <div class="case-section-title"><span>01 — Live workbench</span><span>RESULT + SOURCE · ONE CONTEXT</span></div>
      <CaseLiveWorkbench
        title="Log Atlas"
        capability="PRECOMPILED WASM"
        detail="Filter the retained Rust model while the matching source stays one pane away."
        compiler-href="#/experiments/browser-compiler"
      >
        <template #preview>
          <section class="atlas-preview" aria-label="Interactive Log Atlas trace preview">
            <header class="atlas-preview-topline"><div><i></i><span>trace://local/demo-session</span></div><div><b>0 NETWORK</b><span>RUST REGEX</span></div></header>
            <div class="atlas-stage">
              <LogAtlas :query="query" :minimum_duration="minimumDuration" :window="windowSize" />
            </div>
            <div class="atlas-controls">
              <div class="atlas-presets" role="group" aria-label="Trace query presets">
                <button v-for="preset in presets" :key="preset.label" type="button" :aria-pressed="query === preset.value" @click="query = preset.value">{{ preset.label }}</button>
              </div>
              <label class="atlas-query"><span>RUST REGEX QUERY</span><input v-model="query" aria-label="Rust regex query" spellcheck="false" /></label>
              <label><span>MIN DURATION <output>{{ minimumDuration }}ms</output></span><input v-model.number="minimumDuration" type="range" min="0" max="1000" step="50" /></label>
              <label><span>WINDOW <output>{{ (windowSize / 1000).toFixed(0) }}s</output></span><input v-model.number="windowSize" type="range" min="2000" max="12000" step="1000" /></label>
              <button type="button" @click="resetPreview">RESET</button>
            </div>
          </section>
        </template>
        <template #source>
          <VooyaWorkbench title="Log Atlas case" :files="sourceFiles" :entry-path="rustEntryPath" :editable="manifest.execution.editable" :execution-mode="manifest.execution.mode" height="100%" />
        </template>
      </CaseLiveWorkbench>
      <div class="under-preview">
        <p><b>No benchmark theatre.</b> This proves an integration shape and local-data ownership. It does not claim that Rust beats every JavaScript regex or log viewer.</p>
        <div><a href="https://github.com/vooyajs/vooya-lab/tree/main/cases/data/log-atlas" target="_blank" rel="noreferrer">View repository ↗</a></div>
      </div>

      <div class="case-section-title"><span>02 — Why this boundary?</span><span>IRREGULAR CPU WORK · HOST UI</span></div>
      <section class="case-boundary" aria-label="Host, Rust, and GPU responsibility boundary">
        <div class="boundary-lead"><strong>KEEP THE MODEL IN RUST</strong><p>{{ manifest.question }} The useful boundary is a compact query in and a visual projection out—not serializing the whole corpus on every filter change.</p></div>
        <div class="boundary-flow">
          <section><span>01 · VUE / HOST</span><h2>Product controls</h2><p>{{ manifest.proof.hostOwns.join(' · ') }}</p></section>
          <section><span>02 · RUST / WASM</span><h2>Trace capability</h2><p>{{ manifest.proof.rustOwns.join(' · ') }}</p></section>
          <section><span>03 · GPU</span><h2>Wrong tool here</h2><p>Regex, irregular parsing, and domain indexing are CPU work. A GPU could render millions of marks later; it would complement, not replace, this engine.</p></section>
        </div>
        <div class="boundary-foot"><span><b>Crossing:</b> {{ manifest.proof.boundary.inputs.join(' + ') }} → {{ manifest.proof.boundary.outputs.join(' + ') }}</span><span>{{ manifest.proof.boundary.updatePattern }}</span></div>
      </section>

      <section class="case-notes">
        <div><span>WHAT THIS PROVES</span><p>The Rust module retains a deterministic 1,800-span corpus, compiles user-facing regex queries, filters and aggregates locally, and projects only the visible waterfall through a Vooya component lifecycle.</p></div>
        <div><span>WHAT COMES NEXT</span><p>Real file streaming, cancellation, per-instance stores, binary transfer, dependency-complete copying, and measured workload evidence stay explicit gaps in the case spec.</p></div>
      </section>
    </div>
  </article>
</template>

<style scoped>
.log-atlas-page :deep(.case-title-row em) { color: var(--lab-cyan); }
.atlas-preview { overflow: hidden; border: 1px solid var(--lab-line-strong); background: var(--lab-deep); box-shadow: 0 30px 100px rgba(0,0,0,.3); }
.atlas-preview-topline { display: flex; flex: none; align-items: center; justify-content: space-between; min-height: 42px; padding: 0 13px; border-bottom: 1px solid var(--lab-line); background: #0d120f; color: var(--lab-faint); font: var(--lab-text-meta) ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .07em; }
.atlas-preview-topline > div { display: flex; align-items: center; gap: 10px; }
.atlas-preview-topline i { width: 6px; height: 6px; border-radius: 50%; background: var(--lab-cyan); box-shadow: 0 0 12px var(--lab-cyan); }
.atlas-preview-topline b { color: var(--lab-acid); font-weight: 500; }
.atlas-stage { height: 520px; overflow: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
.atlas-controls { display: grid; grid-template-columns: auto minmax(170px, 1fr) minmax(150px, .7fr) minmax(140px, .55fr) auto; gap: 10px; align-items: end; padding: 13px; border-top: 1px solid var(--lab-line-strong); background: #0d120f; }
.atlas-presets { display: flex; gap: 4px; }
.atlas-presets button, .atlas-controls > button { min-height: 36px; border: 1px solid var(--lab-line); padding: 0 10px; color: var(--lab-muted); background: #111813; cursor: pointer; font: var(--lab-text-control) ui-monospace, SFMono-Regular, Menlo, monospace; }
.atlas-presets button[aria-pressed="true"] { border-color: var(--lab-acid); color: #071009; background: var(--lab-acid); }
.atlas-controls label { display: grid; gap: 6px; color: var(--lab-faint); font: var(--lab-text-meta) ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .04em; }
.atlas-controls label > span { display: flex; justify-content: space-between; }
.atlas-controls output { color: var(--lab-ink); }
.atlas-controls input { min-width: 0; width: 100%; accent-color: var(--lab-cyan); }
.atlas-query input { box-sizing: border-box; min-height: 36px; border: 1px solid var(--lab-line); outline: 0; padding: 0 10px; color: var(--lab-cyan); background: #070b09; font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; }
.atlas-query input:focus { border-color: var(--lab-cyan); box-shadow: 0 0 0 2px rgba(91,245,218,.12); }
@media (max-width: 1100px) { .atlas-controls { grid-template-columns: 1fr 1fr; } .atlas-presets, .atlas-query { grid-column: 1 / -1; } }
@media (max-width: 640px) { .atlas-controls { grid-template-columns: 1fr; } .atlas-presets { grid-column: auto; overflow-x: auto; } .atlas-query { grid-column: auto; } }
</style>
