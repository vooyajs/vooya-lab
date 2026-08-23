<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import ScatterPlot from "@lab-cases/examples/scatter-plot/src/ScatterPlot.rs";

type RenderKind = "scatter" | "grid" | "trace" | "threejs";

const props = defineProps<{ kind: RenderKind; title: string }>();

const canvas = ref<HTMLCanvasElement>();
const scatterPoints = ref(150_000);
const scatterZoom = ref(1);
const gridQuery = ref("");
const gridDescending = ref(false);
const gridStart = ref(0);
const gridViewport = ref<HTMLElement>();
const gridBenchmark = ref<{ median: number; p95: number }>();
const gridBenchmarkRunning = ref(false);
const traceService = ref("all");
const traceZoom = ref(1);
const traceStart = ref(0);
const traceViewport = ref<HTMLElement>();
const traceBenchmark = ref<{ median: number; p95: number }>();
const traceBenchmarkRunning = ref(false);
const scenePaused = ref(false);
const sceneComplexity = ref(18);
const sceneFrameMs = ref(0);
const sceneComputeMs = ref(0);
let animationFrame = 0;
let animationStarted = 0;

const gridRows = Array.from({ length: 100_000 }, (_, id) => ({
  id,
  name: `item-${String(id).padStart(6, "0")}`,
  score: (id * 17) % 100_003,
}));
const gridMatchingRows = computed(() => {
  const values = gridRows.filter((row) => row.name.includes(gridQuery.value));
  values.sort((left, right) => left.score - right.score);
  return gridDescending.value ? values.reverse() : values;
});
const gridVisibleRows = computed(() => gridMatchingRows.value.slice(gridStart.value, gridStart.value + 18));

const traceServices = ["api", "auth", "catalog", "checkout"];
const traceSpans = computed(() => Array.from({ length: 12_000 }, (_, id) => {
  const service = traceServices[id % traceServices.length];
  return { id, service, name: `${service}.operation.${id % 48}`, start: (id * 37) % 1200, duration: 8 + ((id * 29) % 170) + (id === 6_000 ? 760 : 0) };
}));
const traceCritical = computed(() => traceSpans.value.reduce((best, span) => span.duration > best.duration ? span : best));
const traceMatchingSpans = computed(() => traceSpans.value.filter((span) => traceService.value === "all" || span.service === traceService.value));
const traceVisibleSpans = computed(() => traceMatchingSpans.value.slice(traceStart.value, traceStart.value + 24));

const renderLabel = computed(() => {
  if (props.kind === "scatter") return "150,000 points · Rust/WASM target";
  if (props.kind === "grid") return "100,000 rows · virtualized target";
  if (props.kind === "trace") return "12,000 spans · event target";
  return "procedural scene · Three.js target";
});

function context() {
  const element = canvas.value;
  if (!element) return;
  const ctx = element.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, element.width, element.height);
  ctx.fillStyle = "#081119";
  ctx.fillRect(0, 0, element.width, element.height);
  return { element, ctx };
}

function drawThree() {
  const frame = context();
  if (!frame) return;
  const { element, ctx } = frame;
  const now = performance.now();
  const elapsed = (now - animationStarted) / 1000;
  const centerX = element.width / 2;
  const centerY = element.height / 2;
  ctx.strokeStyle = "#76e3ba";
  ctx.globalAlpha = 0.7;
  for (let ring = 0; ring < sceneComplexity.value; ring += 1) {
    ctx.beginPath();
    for (let point = 0; point <= 80; point += 1) {
      const angle = (point / 80) * Math.PI * 2;
      const radius = 28 + ring * 8;
      const wobble = Math.sin(elapsed * 1.5 + ring * 0.32) * 12;
      const x = centerX + Math.cos(angle + elapsed * 0.35) * (radius + wobble);
      const y = centerY + Math.sin(angle) * (radius * 0.45 + wobble);
      if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  sceneFrameMs.value = Math.round(performance.now() - now);
  if (!scenePaused.value) animationFrame = requestAnimationFrame(drawThree);
}

function drawCanvas() {
  cancelAnimationFrame(animationFrame);
  if (props.kind === "threejs") {
    animationStarted = performance.now();
    drawThree();
  }
}

function resetScatter() {
  scatterPoints.value = 150_000;
  scatterZoom.value = 1;
}

function onGridScroll(event: Event) { gridStart.value = Math.floor((event.target as HTMLElement).scrollTop / 28); }

async function runGridBenchmark() {
  if (gridBenchmarkRunning.value) return;
  gridBenchmarkRunning.value = true;
  const samples: number[] = [];
  const queries = ["item-000", "item-001", "item-010", "item-020", "item-030", "item-040", "item-050", "item-060"];
  const originalQuery = gridQuery.value;
  for (let round = 0; round < 4; round += 1) {
    const started = performance.now();
    for (const query of queries) {
      gridQuery.value = query;
      gridStart.value = 0;
      await nextTick();
    }
    samples.push(performance.now() - started);
  }
  samples.sort((left, right) => left - right);
  gridQuery.value = originalQuery;
  gridStart.value = 0;
  gridBenchmark.value = { median: samples[2], p95: samples[3] };
  gridBenchmarkRunning.value = false;
}

function onTraceScroll(event: Event) { traceStart.value = Math.floor((event.target as HTMLElement).scrollTop / 25); }

function focusTraceCritical() {
  traceService.value = "all";
  traceStart.value = Math.max(0, traceCritical.value.id - 7);
  nextTick(() => { if (traceViewport.value) traceViewport.value.scrollTop = traceStart.value * 25; });
}

async function runTraceBenchmark() {
  if (traceBenchmarkRunning.value) return;
  traceBenchmarkRunning.value = true;
  const samples: number[] = [];
  for (const service of ["all", "api", "auth", "catalog"]) {
    const started = performance.now();
    for (let round = 0; round < 6; round += 1) {
      traceService.value = service;
      traceStart.value = 0;
      await nextTick();
    }
    samples.push(performance.now() - started);
  }
  samples.sort((left, right) => left - right);
  traceService.value = "all";
  traceStart.value = 0;
  traceBenchmark.value = { median: samples[2], p95: samples[3] };
  traceBenchmarkRunning.value = false;
}

function runCpuPass() {
  const started = performance.now();
  let value = 0;
  const iterations = sceneComplexity.value * 35_000;
  for (let index = 0; index < iterations; index += 1) value = Math.sin(value + index * 0.001) * 0.999;
  sceneComputeMs.value = Math.round(performance.now() - started);
  if (value === Number.POSITIVE_INFINITY) sceneComputeMs.value = -1;
}

onMounted(drawCanvas);
watch(() => props.kind, drawCanvas);
watch([sceneComplexity, scenePaused], () => { if (props.kind === "threejs") drawCanvas(); });
onBeforeUnmount(() => cancelAnimationFrame(animationFrame));
</script>

<template>
  <section class="render-stage">
    <header class="render-stage-header">
      <div><p class="section-kicker">RENDERED PREVIEW</p><h3>{{ title }}</h3></div>
      <span class="render-stage-badge">{{ renderLabel }}</span>
    </header>

    <div v-if="kind === 'scatter'" class="render-canvas-wrap">
      <div class="case-form-toolbar scatter-form">
        <label>Points <input v-model.number="scatterPoints" type="range" min="50000" max="200000" step="10000" aria-label="Points" /></label>
        <output>{{ scatterPoints.toLocaleString() }} points · {{ Math.round(scatterZoom * 100) }}% zoom</output>
        <div class="render-controls-inline"><button type="button" aria-label="Zoom out" @click="scatterZoom = Math.max(.45, scatterZoom * .75)">−</button><button type="button" @click="resetScatter">Reset</button><button type="button" aria-label="Zoom in" @click="scatterZoom = Math.min(5, scatterZoom * 1.25)">+</button></div>
      </div>
      <ScatterPlot :points="scatterPoints" :zoom="scatterZoom" />
    </div>

    <div v-else-if="kind === 'grid'" class="grid-preview">
      <div class="grid-toolbar case-form-toolbar">
        <input v-model="gridQuery" aria-label="Filter preview rows" placeholder="Filter rows…" @input="gridStart = 0" />
        <button type="button" @click="gridDescending = !gridDescending; gridStart = 0">Sort score {{ gridDescending ? "↓" : "↑" }}</button>
        <button type="button" :disabled="gridBenchmarkRunning" @click="runGridBenchmark">{{ gridBenchmarkRunning ? "Measuring…" : "Run filter benchmark" }}</button>
        <output>{{ gridMatchingRows.length }} matching rows<template v-if="gridBenchmark"> · median {{ gridBenchmark.median.toFixed(1) }} ms · p95 {{ gridBenchmark.p95.toFixed(1) }} ms</template></output>
      </div>
      <div ref="gridViewport" class="grid-table" role="table" aria-label="Data grid preview" @scroll="onGridScroll">
        <div class="grid-spacer" :style="{ height: `${gridMatchingRows.length * 28}px` }"></div>
        <div class="grid-rows" :style="{ transform: `translateY(${gridStart * 28}px)` }">
          <div class="grid-row grid-row-head" role="row"><span>ID</span><span>Name</span><span>Score</span></div>
          <div v-for="row in gridVisibleRows" :key="row.id" class="grid-row" role="row"><span>{{ row.id }}</span><span>{{ row.name }}</span><span>{{ row.score }}</span></div>
        </div>
      </div>
    </div>

    <div v-else-if="kind === 'trace'" class="trace-preview">
      <div class="trace-toolbar case-form-toolbar">
        <label>Service <select v-model="traceService" aria-label="Filter preview services" @change="traceStart = 0"><option value="all">All services</option><option v-for="service in traceServices" :key="service" :value="service">{{ service }}</option></select></label>
        <button type="button" aria-label="Zoom out" @click="traceZoom = Math.max(.5, traceZoom * .75)">−</button><button type="button" @click="traceZoom = 1">Reset zoom</button><button type="button" aria-label="Zoom in" @click="traceZoom = Math.min(3, traceZoom * 1.25)">+</button><button type="button" @click="focusTraceCritical">Focus critical path</button><button type="button" :disabled="traceBenchmarkRunning" @click="runTraceBenchmark">{{ traceBenchmarkRunning ? "Measuring…" : "Measure workload" }}</button>
      </div>
      <output class="trace-summary">{{ traceMatchingSpans.length }} matching spans<template v-if="traceBenchmark"> · median {{ traceBenchmark.median.toFixed(1) }} ms · p95 {{ traceBenchmark.p95.toFixed(1) }} ms</template><template v-else> · {{ Math.round(traceZoom * 100) }}% zoom · critical path {{ traceCritical.duration }} ms</template></output>
      <div class="trace-axis"><span>0 ms</span><span>600 ms</span><span>1200 ms</span></div>
      <div ref="traceViewport" class="trace-viewport" @scroll="onTraceScroll"><div class="trace-spacer" :style="{ height: `${traceMatchingSpans.length * 25}px` }"></div><div class="trace-rows" :style="{ transform: `translateY(${traceStart * 25}px)` }"><div v-for="span in traceVisibleSpans" :key="span.id" class="trace-row" :class="{ critical: span.id === traceCritical.id }"><strong>{{ span.service }} · {{ span.name }}</strong><span class="trace-track"><i :style="{ marginLeft: `${span.start / 12 * traceZoom}%`, width: `${Math.max(2, span.duration / 12 * traceZoom)}%` }"></i></span><small>{{ span.duration }} ms</small></div></div></div>
    </div>

    <div v-else class="render-canvas-wrap">
      <div class="case-form-toolbar scene-form"><label>Scene complexity <input v-model.number="sceneComplexity" type="range" min="6" max="36" step="2" aria-label="Scene complexity" /></label><output>{{ sceneComplexity }} rings · {{ sceneFrameMs }} ms/frame<template v-if="sceneComputeMs"> · CPU pass {{ sceneComputeMs }} ms</template></output><div class="render-controls-inline"><button type="button" @click="scenePaused = !scenePaused">{{ scenePaused ? "Resume" : "Pause" }}</button><button type="button" @click="runCpuPass">Run CPU pass</button></div></div>
      <canvas ref="canvas" class="render-canvas" width="900" height="360" aria-label="Three.js CPU preview"></canvas>
      <div class="render-controls"><span>Procedural scene preview</span><span class="preview-pending">Three.js + Rust/WASM integration pending</span></div>
    </div>
  </section>
</template>
