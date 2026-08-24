<script setup lang="ts">
import { onMounted, ref, watch } from "vue";

// Kept beside the Rust component so this demo owns both implementations.

const props = defineProps<{ points: number; zoom: number }>();
const canvas = ref<HTMLCanvasElement>();
const marker = ref<HTMLElement>();
const duration = ref(0);
const querySummary = ref("move to query");
let pointCloud: Array<{ x: number; y: number; group: number }> = [];

function draw() {
  const element = canvas.value;
  const context = element?.getContext("2d");
  if (!element || !context) return;
  const started = performance.now();
  const width = element.width;
  const height = element.height;
  const zoom = Math.min(5, Math.max(.45, props.zoom));
  context.fillStyle = "#081119";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#213644";
  for (const ratio of [.25, .5, .75]) {
    context.beginPath();
    context.moveTo(width * ratio, 0); context.lineTo(width * ratio, height);
    context.moveTo(0, height * ratio); context.lineTo(width, height * ratio);
    context.stroke();
  }
  const colors = ["#76e3ba", "#8ea4ff", "#f3c96b"];
  const seed = (value: number) => {
    const result = Math.sin(value * 12.9898) * 43_758.5453;
    return result - Math.floor(result);
  };
  pointCloud = [];
  for (let index = 0; index < props.points; index += 1) {
    const group = index % 3;
    const x = (([.30, .55, .74][group] + (seed(index) - .5) * .30 - .5) * zoom + .5) * width;
    const y = (([.65, .35, .60][group] + (seed(index + 1) - .5) * .36 - .5) * zoom + .5) * height;
    if (x >= 0 && x < width && y >= 0 && y < height) {
      pointCloud.push({ x, y, group });
      context.fillStyle = colors[group]; context.globalAlpha = .42; context.fillRect(x, y, 1.7, 1.7);
    }
  }
  context.globalAlpha = 1;
  duration.value = performance.now() - started;
  querySummary.value = "move to query";
  if (marker.value) marker.value.style.opacity = "0";
}

function queryNearest(event: MouseEvent) {
  const element = canvas.value;
  const target = marker.value;
  if (!element || !target || !pointCloud.length) return;
  const rect = element.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width * element.width;
  const y = (event.clientY - rect.top) / rect.height * element.height;
  const started = performance.now();
  let nearest = pointCloud[0];
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const point of pointCloud) {
    const distance = (point.x - x) ** 2 + (point.y - y) ** 2;
    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }
  const elapsed = performance.now() - started;
  target.style.left = `${nearest.x / element.width * 100}%`;
  target.style.top = `${nearest.y / element.height * 100}%`;
  target.style.opacity = "1";
  querySummary.value = `nearest ${elapsed.toFixed(3)} ms`;
}

onMounted(draw);
watch(() => [props.points, props.zoom], draw);
</script>

<template>
  <section class="scatter-shell baseline-scatter">
    <div class="scatter-toolbar"><strong>JS linear scan</strong><span>{{ pointCloud.length.toLocaleString() }} visible points · draw {{ duration.toFixed(1) }} ms</span><span class="scatter-query">{{ querySummary }}</span></div>
    <div class="scatter-surface">
      <canvas ref="canvas" width="960" height="360" aria-label="JavaScript scatter plot canvas" @mousemove="queryNearest"></canvas>
      <i ref="marker" class="scatter-nearest-marker"></i>
    </div>
  </section>
</template>
