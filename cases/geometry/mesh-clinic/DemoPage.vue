<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { LabCaseManifest } from "@vooya-lab/case-schema";
import { CaseLiveWorkbench, VooyaWorkbench } from "@vooya-lab/ide";
import { useVooyaStore } from "@vooya/vue";
import manifestData from "./case.json";
import createMeshClinicStore from "./src/MeshClinic.rs";
import { sourceFiles } from "./sourceFiles";
import "./src/MeshClinic.css";

type TriangleProjection = { points: string; status: string; depth: number };
type MeshSnapshot = {
  specimen: string;
  health: string;
  vertex_count: number;
  triangle_count: number;
  degenerate_count: number;
  duplicate_count: number;
  boundary_edges: number;
  nonmanifold_edges: number;
  components: number;
  removed_faces: number;
  rotation: number;
  triangles: TriangleProjection[];
};

const manifest = manifestData as LabCaseManifest;
const rustEntryPath = "cases/geometry/mesh-clinic/src/MeshClinic.rs";
const rotation = ref(28);
const { snapshot: state, dispatch } = useVooyaStore(createMeshClinicStore(), { disposeOnUnmount: true });
const initial: MeshSnapshot = { specimen: "INITIALIZING", health: "LOADING", vertex_count: 0, triangle_count: 0, degenerate_count: 0, duplicate_count: 0, boundary_edges: 0, nonmanifold_edges: 0, components: 0, removed_faces: 0, rotation: 28, triangles: [] };
const mesh = computed(() => (state.value as MeshSnapshot | undefined) ?? initial);
const ready = computed(() => state.value !== undefined);

watch(rotation, (degrees) => { if (ready.value) dispatch("rotate", degrees); });
watch(() => mesh.value.rotation, (degrees) => { rotation.value = degrees; });

function loadDamaged() { dispatch("load_damaged"); }
function loadClean() { dispatch("load_clean"); }
function repair() { dispatch("repair"); }
function reset() { dispatch("reset"); rotation.value = 28; }
</script>

<template>
  <article class="case-detail mesh-clinic-page">
    <header class="case-intro">
      <div><span class="case-kicker">FLAGSHIP CANDIDATE · CPU/GPU BOUNDARY</span><span class="case-route">/cases/geometry/mesh-clinic</span></div>
      <div class="case-title-row"><h1>Mesh <em>Clinic</em></h1><span>TOBJ · RUST TOPOLOGY · HOST SVG</span></div>
      <div class="case-intro-copy"><p>{{ manifest.summary }}</p><p><b>WHY VOOYA</b>Keep a real Rust mesh parser and irregular topology walk behind one Store boundary; let the Web host choose SVG today and WebGPU tomorrow.</p></div>
    </header>

    <div class="case-content">
      <div class="case-section-title"><span>01 — Live clinic</span><span>RUST DIAGNOSTICS + HOST RENDERER</span></div>
      <CaseLiveWorkbench title="Mesh Clinic" capability="TOBJ 4.0.5" detail="Inspect the Rust-owned topology snapshot beside the complete case source." compiler-href="#/experiments/browser-compiler">
        <template #preview-status><small>{{ ready ? `${mesh.health} · ${mesh.triangle_count} FACES` : 'PARSING OBJ' }}</small></template>
        <template #preview>
          <section class="mesh-clinic" aria-label="Interactive Mesh Clinic topology inspector">
            <header class="mesh-clinic-topline"><div><i :data-ready="ready"></i><span>specimen://{{ mesh.specimen.toLowerCase().replaceAll(' ', '-') }}</span></div><div><b>{{ mesh.health }}</b><span>0 NETWORK</span><span>HOST SVG</span></div></header>
            <div class="mesh-clinic-layout">
              <section class="mesh-clinic-stage">
                <header><span>DIAGNOSTIC PROJECTION</span><code>{{ mesh.rotation }}° YAW</code></header>
                <svg viewBox="0 0 720 440" role="img" aria-label="Host-rendered projection of Rust mesh diagnostics">
                  <defs><pattern id="mesh-grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M 36 0 L 0 0 0 36" /></pattern></defs>
                  <rect width="720" height="440" fill="url(#mesh-grid)" />
                  <polygon v-for="(triangle, index) in mesh.triangles" :key="`${triangle.points}-${index}`" :points="triangle.points" :class="`mesh-face is-${triangle.status}`" />
                  <circle cx="360" cy="220" r="164" class="mesh-orbit" />
                </svg>
                <div class="mesh-legend"><span><i></i>healthy</span><span><i></i>duplicate</span><span><i></i>degenerate</span><span><i></i>non-manifold</span></div>
              </section>
              <aside class="mesh-clinic-inspector">
                <span>RUST TOPOLOGY REPORT</span><h2>{{ mesh.specimen }}</h2>
                <dl><div><dt>VERTICES</dt><dd>{{ mesh.vertex_count }}</dd></div><div><dt>TRIANGLES</dt><dd>{{ mesh.triangle_count }}</dd></div><div><dt>COMPONENTS</dt><dd>{{ mesh.components }}</dd></div><div><dt>REMOVED</dt><dd>{{ mesh.removed_faces }}</dd></div></dl>
                <ol><li :data-alert="mesh.degenerate_count > 0"><span>DEGENERATE FACES</span><b>{{ mesh.degenerate_count }}</b></li><li :data-alert="mesh.duplicate_count > 0"><span>DUPLICATE FACES</span><b>{{ mesh.duplicate_count }}</b></li><li :data-alert="mesh.nonmanifold_edges > 0"><span>NON-MANIFOLD EDGES</span><b>{{ mesh.nonmanifold_edges }}</b></li><li :data-alert="mesh.boundary_edges > 0"><span>BOUNDARY EDGES</span><b>{{ mesh.boundary_edges }}</b></li></ol>
                <p><b>REPAIR SCOPE</b>Remove only zero-area and duplicate triangles. Open boundaries and non-manifold edges stay visible because guessing a surface is not a safe repair.</p>
              </aside>
            </div>
            <footer class="mesh-clinic-controls"><div role="group" aria-label="Mesh specimen"><button type="button" :disabled="!ready" @click="loadDamaged">DAMAGED</button><button type="button" :disabled="!ready" @click="loadClean">REFERENCE</button></div><label><span>ROTATION <output>{{ rotation }}°</output></span><input v-model.number="rotation" type="range" min="0" max="360" step="4" :disabled="!ready" /></label><button class="repair" type="button" :disabled="!ready || (mesh.degenerate_count === 0 && mesh.duplicate_count === 0)" @click="repair">APPLY SAFE REPAIR</button><button type="button" :disabled="!ready" @click="reset">RESET</button></footer>
          </section>
        </template>
        <template #source><VooyaWorkbench title="Mesh Clinic case" :files="sourceFiles" :entry-path="rustEntryPath" :editable="manifest.execution.editable" :execution-mode="manifest.execution.mode" height="100%" /></template>
      </CaseLiveWorkbench>
      <div class="under-preview"><p><b>No GPU replacement claim.</b> Rust parses and reasons about topology. Vue renders a bounded projection; a WebGPU renderer can consume the same contract when scale justifies it.</p><div><a href="https://github.com/vooyajs/vooya-lab/tree/main/cases/geometry/mesh-clinic" target="_blank" rel="noreferrer">View repository ↗</a></div></div>

      <div class="case-section-title"><span>02 — Why this boundary?</span><span>IRREGULAR CPU WORK · RENDERER FREEDOM</span></div>
      <section class="case-boundary" aria-label="Mesh Clinic responsibility boundary"><div class="boundary-lead"><strong>CPU/GPU COLLABORATION</strong><p>{{ manifest.question }} The proof is that changing renderers does not require rewriting `tobj`, edge incidence, defect classification, or repair policy.</p></div><div class="boundary-flow"><section><span>01 · VUE / HOST</span><h2>Product surface</h2><p>{{ manifest.proof.hostOwns.join(' · ') }}</p></section><section><span>02 · RUST / WASM</span><h2>Geometry clinic</h2><p>{{ manifest.proof.rustOwns.join(' · ') }}</p></section><section><span>03 · GPU</span><h2>Renderer option</h2><p>WebGPU/WebGL should shade, rasterize, and pick dense meshes. They complement rather than replace branch-heavy topology diagnostics.</p></section></div><div class="boundary-foot"><span><b>Crossing:</b> {{ manifest.proof.boundary.inputs.join(' + ') }} → {{ manifest.proof.boundary.outputs.join(' + ') }}</span><span>{{ manifest.proof.boundary.updatePattern }}</span></div></section>
    </div>
  </article>
</template>
