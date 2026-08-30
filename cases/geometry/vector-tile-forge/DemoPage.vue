<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { LabCaseManifest } from "@vooya-lab/case-schema";
import { CaseLiveWorkbench, VooyaWorkbench } from "@vooya-lab/ide";
import { useVooyaStore } from "@vooya/vue";
import manifestData from "./case.json";
import createVectorTileForgeStore from "./src/VectorTileForge.rs";
import { sourceFiles } from "./sourceFiles";
import "./src/VectorTileForge.css";

type TileSnapshot = { tolerance: number; original_vertices: number; simplified_vertices: number; reduction_percent: number; triangle_count: number; input_bytes: number; output_bytes: number; layers: Array<{ kind: string; path: string; vertices: number }>; triangles: Array<{ points: string }> };
const manifest = manifestData as LabCaseManifest;
const rustEntryPath = "cases/geometry/vector-tile-forge/src/VectorTileForge.rs";
const tolerance = ref(24);
const showTriangles = ref(false);
const { snapshot: state, dispatch } = useVooyaStore(createVectorTileForgeStore(), { disposeOnUnmount: true });
const initial: TileSnapshot = { tolerance: 24, original_vertices: 0, simplified_vertices: 0, reduction_percent: 0, triangle_count: 0, input_bytes: 0, output_bytes: 0, layers: [], triangles: [] };
const tile = computed(() => (state.value as TileSnapshot | undefined) ?? initial);
const ready = computed(() => state.value !== undefined);
watch(tolerance, (value) => { if (ready.value) dispatch("set_tolerance", value); });
watch(() => tile.value.tolerance, (value) => { tolerance.value = value; });
function reset() { dispatch("reset"); tolerance.value = 24; showTriangles.value = false; }
</script>

<template>
  <article class="case-detail vector-forge-page">
    <header class="case-intro"><div><span class="case-kicker">FLAGSHIP CANDIDATE · CPU → RENDER PIPELINE</span><span class="case-route">/cases/geometry/vector-tile-forge</span></div><div class="case-title-row"><h1>Vector Tile <em>Forge</em></h1><span>GEOJSON · GEO · EARCUTR</span></div><div class="case-intro-copy"><p>{{ manifest.summary }}</p><p><b>WHY VOOYA</b>Port the browser-compatible Rust geometry pipeline once; keep the product UI and renderer replaceable.</p></div></header>
    <div class="case-content">
      <div class="case-section-title"><span>01 — Live forge</span><span>DECODE · SIMPLIFY · TRIANGULATE · RENDER</span></div>
      <CaseLiveWorkbench title="Vector Tile Forge" capability="GEO 0.33.1" detail="Tune the CPU geometry stage and inspect the exact Rust source beside it." compiler-href="#/experiments/browser-compiler">
        <template #preview-status><small>{{ ready ? `${tile.simplified_vertices} VERTICES · ${tile.triangle_count} TRIANGLES` : 'DECODING TILE' }}</small></template>
        <template #preview>
          <section class="vector-forge" aria-label="Interactive Vector Tile Forge geometry pipeline">
            <header class="vector-forge-topline"><div><i></i><span>tile://local/14-8573-5732</span></div><div><b>RUST CPU STAGE</b><span>HOST SVG</span><span>0 NETWORK</span></div></header>
            <div class="vector-forge-stage">
              <svg viewBox="0 0 100 100" role="img" aria-label="Host-rendered simplified vector tile"><defs><pattern id="forge-grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M 5 0 L 0 0 0 5" /></pattern></defs><rect width="100" height="100" fill="url(#forge-grid)" /><path v-for="(layer,index) in tile.layers" :key="`${layer.kind}-${index}`" :d="layer.path" :class="`forge-layer is-${layer.kind}`" /><polygon v-if="showTriangles" v-for="(triangle,index) in tile.triangles" :key="index" :points="triangle.points" class="forge-triangle" /></svg>
              <div class="forge-pipeline"><span><b>01</b>GEOJSON DECODE</span><i></i><span><b>02</b>GEO SIMPLIFY</span><i></i><span><b>03</b>EARCUT</span><i></i><span><b>04</b>HOST RENDER</span></div>
            </div>
            <aside class="vector-forge-metrics"><div><span>INPUT</span><b>{{ tile.input_bytes.toLocaleString() }}</b><small>GEOJSON BYTES</small></div><div><span>VERTICES</span><b>{{ tile.original_vertices }} → {{ tile.simplified_vertices }}</b><small>{{ tile.reduction_percent }}% REDUCTION</small></div><div><span>TRIANGLES</span><b>{{ tile.triangle_count }}</b><small>EARCUT OUTPUT</small></div><div><span>PROJECTION</span><b>{{ tile.output_bytes.toLocaleString() }}</b><small>SVG PATH BYTES</small></div></aside>
            <footer class="vector-forge-controls"><label><span>SIMPLIFICATION TOLERANCE <output>{{ (tolerance / 10).toFixed(1) }}</output></span><input v-model.number="tolerance" type="range" min="0" max="28" step="1" :disabled="!ready" /></label><button type="button" :aria-pressed="showTriangles" :disabled="!ready" @click="showTriangles = !showTriangles">{{ showTriangles ? 'HIDE' : 'SHOW' }} TRIANGLES</button><button type="button" :disabled="!ready" @click="reset">RESET TILE</button></footer>
          </section>
        </template>
        <template #source><VooyaWorkbench title="Vector Tile Forge case" :files="sourceFiles" :entry-path="rustEntryPath" :editable="manifest.execution.editable" :execution-mode="manifest.execution.mode" height="100%" /></template>
      </CaseLiveWorkbench>
      <div class="under-preview"><p><b>No transfer or speed claim yet.</b> This slice makes the ownership and payload shape observable. Binary MVT input, typed buffers, Workers, and WebGPU require their own evidence.</p><div><a href="https://github.com/vooyajs/vooya-lab/tree/main/cases/geometry/vector-tile-forge" target="_blank" rel="noreferrer">View repository ↗</a></div></div>
      <div class="case-section-title"><span>02 — Why this boundary?</span><span>CPU PREPARATION · GPU-READY OUTPUT</span></div>
      <section class="case-boundary" aria-label="Vector Tile Forge responsibility boundary"><div class="boundary-lead"><strong>USE BOTH DELIBERATELY</strong><p>{{ manifest.question }} The Rust stage remains valuable whether the host chooses SVG, Canvas, WebGL, or WebGPU.</p></div><div class="boundary-flow"><section><span>01 · VUE / HOST</span><h2>Map product</h2><p>{{ manifest.proof.hostOwns.join(' · ') }}</p></section><section><span>02 · RUST / WASM</span><h2>Geometry forge</h2><p>{{ manifest.proof.rustOwns.join(' · ') }}</p></section><section><span>03 · GPU</span><h2>Dense presentation</h2><p>WebGPU/WebGL should rasterize large prepared buffers. Decode, feature rules, simplification, and triangulation remain the CPU capability.</p></section></div><div class="boundary-foot"><span><b>Crossing:</b> {{ manifest.proof.boundary.inputs.join(' + ') }} → {{ manifest.proof.boundary.outputs.join(' + ') }}</span><span>{{ manifest.proof.boundary.updatePattern }}</span></div></section>
    </div>
  </article>
</template>
