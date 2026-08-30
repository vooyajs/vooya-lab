<script setup lang="ts">
import { nextTick, ref } from "vue";
import type { LabCaseManifest } from "@vooya-lab/case-schema";
import { CaseLiveWorkbench, VooyaWorkbench } from "@vooya-lab/ide";
import manifestData from "./case.json";
import SourceSurgeon from "./src/SourceSurgeon.rs";
import { sourceFiles } from "./sourceFiles";
import "./src/SourceSurgeon.css";

const fixture = `use std::collections::BTreeMap;

struct TraceIndex {
    rows: BTreeMap<String, Vec<u32>>,
}

impl TraceIndex {
    fn insert(&mut self, service: String, offset: u32) {
        self.rows.entry(service).or_default().push(offset);
    }
}

fn summarize(index: &TraceIndex) -> usize {
    index.rows.values().map(Vec::len).sum()
}

fn main() {
    let index = TraceIndex { rows: BTreeMap::new() };
    let total = summarize(&index);
    println!("{}", total);
}
`;
const invalidFixture = `fn parse_trace(input: &str) -> usize {
    input.lines().count()
// missing closing brace on purpose`;
const manifest = manifestData as LabCaseManifest;
const rustEntryPath = "cases/tools/source-surgeon/src/SourceSurgeon.rs";
const draft = ref(fixture);
const submittedSource = ref(fixture);
const renameTo = ref("summarize_local");
const submittedRename = ref("summarize_local");
const copyState = ref("COPY TRANSFORMED");
function analyze() { submittedSource.value = draft.value; submittedRename.value = renameTo.value; }
function loadInvalid() { draft.value = invalidFixture; submittedSource.value = invalidFixture; }
function reset() { draft.value = fixture; submittedSource.value = fixture; renameTo.value = "summarize_local"; submittedRename.value = "summarize_local"; copyState.value = "COPY TRANSFORMED"; }
async function copyTransformed() {
  await nextTick();
  const text = document.querySelector<HTMLElement>(".source-surgeon-engine [data-surgeon-output]")?.innerText;
  if (!text) { copyState.value = "NOTHING TO COPY"; return; }
  await navigator.clipboard.writeText(text);
  copyState.value = "COPIED";
}
</script>

<template>
  <article class="case-detail source-surgeon-page">
    <header class="case-intro"><div><span class="case-kicker">FLAGSHIP CANDIDATE · DEVELOPER TOOL</span><span class="case-route">/cases/tools/source-surgeon</span></div><div class="case-title-row"><h1>Source <em>Surgeon</em></h1><span>SYN AST · PRETTYPLEASE · HOST EDITOR</span></div><div class="case-intro-copy"><p>{{ manifest.summary }}</p><p><b>WHY VOOYA</b>Bring a mature Rust parser and rewrite engine into an ordinary WebIDE without moving keyboard, focus, or editor ownership into WASM.</p></div></header>
    <div class="case-content">
      <div class="case-section-title"><span>01 — Live surgery</span><span>HOST DRAFT · RUST AST · STRUCTURED RESULT</span></div>
      <CaseLiveWorkbench title="Source Surgeon" capability="SYN 3.0.4" detail="Edit a draft, submit one coarse analysis request, and inspect the implementation." compiler-href="#/experiments/browser-compiler">
        <template #preview-status><small>PRECOMPILED ANALYZER · LOCAL MEMORY</small></template>
        <template #preview>
          <section class="source-surgeon" aria-label="Interactive Source Surgeon Rust analysis tool">
            <header class="source-surgeon-topline"><div><i></i><span>workspace://scratch/main.rs</span></div><div><b>LOCAL AST</b><span>NO EXECUTION</span><span>0 NETWORK</span></div></header>
            <div class="source-surgeon-layout">
              <section class="surgeon-draft"><header><span>HOST DRAFT</span><code>{{ draft.length }} BYTES</code></header><textarea v-model="draft" aria-label="Rust source draft" spellcheck="false"></textarea><div><label><span>RENAME FIRST FUNCTION TO</span><input v-model="renameTo" aria-label="Replacement function name" spellcheck="false" /></label><button type="button" @click="analyze">ANALYZE AST</button></div></section>
              <section class="surgeon-result"><SourceSurgeon :source="submittedSource" :rename_to="submittedRename" /></section>
            </div>
            <footer class="source-surgeon-controls"><span><b>BOUNDARY</b>Draft stays in Vue until Analyze. Rust receives one source string and returns component-owned analysis DOM.</span><div><button type="button" @click="loadInvalid">LOAD INVALID FIXTURE</button><button type="button" @click="copyTransformed">{{ copyState }}</button><button type="button" @click="reset">RESET</button></div></footer>
          </section>
        </template>
        <template #source><VooyaWorkbench title="Source Surgeon case" :files="sourceFiles" :entry-path="rustEntryPath" :editable="manifest.execution.editable" :execution-mode="manifest.execution.mode" height="100%" /></template>
      </CaseLiveWorkbench>
      <div class="under-preview"><p><b>Not rust-analyzer.</b> This proves parser reuse, structural traversal, update, diagnostics, and source output. Semantic types, workspace indexing, spans, and code execution are separate products.</p><div><a href="https://github.com/vooyajs/vooya-lab/tree/main/cases/tools/source-surgeon" target="_blank" rel="noreferrer">View repository ↗</a></div></div>
      <div class="case-section-title"><span>02 — Why this boundary?</span><span>RUST ECOSYSTEM · WEBIDE OWNERSHIP</span></div>
      <section class="case-boundary" aria-label="Source Surgeon responsibility boundary"><div class="boundary-lead"><strong>PORT THE CAPABILITY</strong><p>{{ manifest.question }} The editor remains conventional Web UI; `syn` and `prettyplease` remain ordinary Rust dependencies.</p></div><div class="boundary-flow"><section><span>01 · VUE / HOST</span><h2>Editor surface</h2><p>{{ manifest.proof.hostOwns.join(' · ') }}</p></section><section><span>02 · RUST / WASM</span><h2>Analysis engine</h2><p>{{ manifest.proof.rustOwns.join(' · ') }}</p></section><section><span>03 · GPU</span><h2>Not applicable</h2><p>Parsing, AST traversal, and structural rewriting are branch-heavy CPU work. A GPU does not improve this boundary.</p></section></div><div class="boundary-foot"><span><b>Crossing:</b> {{ manifest.proof.boundary.inputs.join(' + ') }} → {{ manifest.proof.boundary.outputs.join(' + ') }}</span><span>{{ manifest.proof.boundary.updatePattern }}</span></div></section>
    </div>
  </article>
</template>
