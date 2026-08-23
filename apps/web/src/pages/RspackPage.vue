<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import RspackSummary from "@lab-cases/bundlers/rspack/src/RspackSummary.rs";

type BuildMessage = {
  type: "result" | "error";
  output?: string;
  assetCount?: number;
  durationMs?: number;
  error?: string;
};

const status = ref("ready");
const output = ref("No browser build has run yet.");
const assetCount = ref(0);
const durationMs = ref(0);
let worker: Worker | undefined;

function checkEnvironment() {
  if (!crossOriginIsolated) {
    status.value = "needs-isolation";
    output.value = "Rspack Browser needs a cross-origin-isolated deployment for SharedArrayBuffer.";
    return false;
  }
  return true;
}

function runBuild() {
  if (!checkEnvironment()) return;
  worker?.terminate();
  worker = new Worker(new URL("../../../../cases/bundlers/rspack/src/rspack.worker.ts", import.meta.url), { type: "module" });
  status.value = "building";
  output.value = "Running Rspack Browser in a Worker…";
  worker.onmessage = (event: MessageEvent<BuildMessage>) => {
    const message = event.data;
    if (message.type === "error") {
      status.value = "error";
      output.value = message.error ?? "Rspack build failed.";
      return;
    }
    status.value = "success";
    output.value = message.output ?? "Build completed.";
    assetCount.value = message.assetCount ?? 0;
    durationMs.value = message.durationMs ?? 0;
  };
  worker.onerror = (event) => {
    status.value = "error";
    output.value = event.message || "Rspack Worker failed to start.";
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
      <p class="eyebrow">BUNDLERS / RSPACK</p>
      <h2>Rspack Browser</h2>
    </div>
    <span class="status-pill" :data-status="status">{{ status }}</span>
  </div>

  <p class="case-copy">
    The Worker uses the official <code>@rspack/browser</code> package. The result
    summary below is rendered by <code>RspackSummary.rs</code>, compiled through
    Vooya before this page is built.
  </p>
  <div class="toolbar">
    <button class="button primary" type="button" @click="runBuild">Run browser build</button>
    <span v-if="status === 'needs-isolation'" class="notice">This host does not expose <code>crossOriginIsolated</code>.</span>
  </div>
  <RspackSummary :status="status" :output="output" :asset_count="assetCount" :duration_ms="durationMs" />
</template>
