<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import RolldownSummary from "@lab-cases/bundlers/rolldown/src/RolldownSummary.rs";

const status = ref("ready");
const output = ref("No browser build has run yet.");
const assetCount = ref(0);
const durationMs = ref(0);
let worker: Worker | undefined;

function checkEnvironment() {
  if (!crossOriginIsolated) {
    status.value = "needs-isolation";
    output.value = "Rolldown Browser needs a cross-origin-isolated deployment for shared WebAssembly memory.";
    return false;
  }
  return true;
}

function runBuild() {
  if (!checkEnvironment()) return;
  worker?.terminate();
  worker = new Worker(new URL("../../../../cases/bundlers/rolldown/src/rolldown.worker.ts", import.meta.url), { type: "module" });
  status.value = "building";
  output.value = "Running Rolldown Browser in a Worker…";
  worker.onmessage = (event) => {
    const message = event.data as { type: string; output?: string; assetCount?: number; durationMs?: number; error?: string };
    status.value = message.type === "result" ? "success" : "error";
    output.value = message.output ?? message.error ?? "Rolldown build failed.";
    assetCount.value = message.assetCount ?? 0;
    durationMs.value = message.durationMs ?? 0;
  };
  worker.onerror = (event) => {
    status.value = "error";
    output.value = event.message || "Rolldown Worker failed to start.";
  };
  worker.postMessage({
    entry: "/src/main.js",
    files: {
      "/src/main.js": 'export const message = "hello from the Vooya Lab fixture";',
    },
  });
}

onBeforeUnmount(() => worker?.terminate());
</script>

<template>
  <div class="case-header">
    <div>
      <p class="eyebrow">BUNDLERS / ROLLDOWN</p>
      <h2>Rolldown Browser</h2>
    </div>
    <span class="status-pill" :data-status="status">{{ status }}</span>
  </div>
  <p class="case-copy">
    Rolldown is the browser bundler under test. The visible result summary is a
    separate Rust component compiled through Vooya.
  </p>
  <div class="toolbar">
    <button class="button primary" type="button" @click="runBuild">Run browser build</button>
    <span v-if="status === 'needs-isolation'" class="notice">This host does not expose <code>crossOriginIsolated</code>.</span>
  </div>
  <RolldownSummary :status="status" :output="output" :asset_count="assetCount" :duration_ms="durationMs" />
</template>
