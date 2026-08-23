<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import MiniCodePane, { type CodeFile } from "../components/MiniCodePane.vue";
import RspackSummary from "@lab-cases/bundlers/rspack/src/RspackSummary.rs";

type BuildMessage = {
  type: "result" | "error";
  output?: string;
  assetCount?: number;
  durationMs?: number;
  error?: string;
  artifacts?: CodeFile[];
};

const DEFAULT_SOURCE = 'export const message = "hello from the Vooya Lab fixture";';
const status = ref("ready");
const output = ref("Ready to run. Edit the virtual file, then start a browser build.");
const sourceFiles = ref<CodeFile[]>([{ path: "/src/main.js", language: "JavaScript", content: DEFAULT_SOURCE }]);
const activeSourcePath = ref("/src/main.js");
const outputFiles = ref<CodeFile[]>([{ path: "/build.log", language: "Build log", content: "No build has run yet." }]);
const activeOutputPath = ref("/build.log");
const assetCount = ref(0);
const durationMs = ref(0);
let worker: Worker | undefined;

function setBuildLog(content: string) {
  outputFiles.value = [{ path: "/build.log", language: "Build log", content }];
  activeOutputPath.value = "/build.log";
}

function updateSource(path: string, content: string) {
  const file = sourceFiles.value.find((item) => item.path === path);
  if (file) file.content = content;
}

function checkEnvironment() {
  if (!crossOriginIsolated) {
    status.value = "needs-isolation";
    output.value = "Rspack Browser needs a cross-origin-isolated deployment for SharedArrayBuffer.";
    setBuildLog(output.value);
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
  setBuildLog("Starting Rspack Browser…");
  worker.onmessage = (event: MessageEvent<BuildMessage>) => {
    const message = event.data;
    if (message.type === "error") {
      status.value = "error";
      output.value = message.error ?? "Rspack build failed.";
      setBuildLog(output.value);
      return;
    }
    status.value = "success";
    output.value = message.output ?? "Build completed.";
    assetCount.value = message.assetCount ?? 0;
    durationMs.value = message.durationMs ?? 0;
    outputFiles.value = [
      { path: "/build.log", language: "Build log", content: output.value },
      ...(message.artifacts ?? []),
    ];
    activeOutputPath.value = message.artifacts?.find((file) => file.path === "/dist/main.js")?.path
      ?? message.artifacts?.[0]?.path
      ?? "/build.log";
  };
  worker.onerror = (event) => {
    status.value = "error";
    output.value = event.message || "Rspack Worker failed to start.";
    setBuildLog(output.value);
  };
  worker.postMessage({
    entry: "/src/main.js",
    files: Object.fromEntries(sourceFiles.value.map((file) => [file.path, file.content])),
  });
}

function resetSource() {
  sourceFiles.value = [{ path: "/src/main.js", language: "JavaScript", content: DEFAULT_SOURCE }];
  activeSourcePath.value = "/src/main.js";
  status.value = "ready";
  output.value = "Ready to run. Edit the virtual file, then start a browser build.";
  outputFiles.value = [{ path: "/build.log", language: "Build log", content: "No build has run yet." }];
  activeOutputPath.value = "/build.log";
  assetCount.value = 0;
  durationMs.value = 0;
}

onBeforeUnmount(() => worker?.terminate());
</script>

<template>
  <div class="case-header">
    <div>
      <p class="eyebrow">BUNDLERS / RSPACK</p>
      <h2>Rspack Browser</h2>
      <p class="case-copy">A real Rspack compiler runs inside a Worker. The result pane shows the files it actually emits; the status card is rendered by a Rust component compiled through Vooya.</p>
    </div>
    <div class="case-header-actions">
      <a class="source-link" href="https://github.com/vooyajs/vooya-lab/tree/main/cases/bundlers/rspack" target="_blank" rel="noreferrer">Open source ↗</a>
      <span class="status-pill" :data-status="status">{{ status }}</span>
    </div>
  </div>

  <div class="runtime-strip" aria-label="Rspack runtime details">
    <span><b>Runtime</b> @rspack/browser</span>
    <span><b>Boundary</b> Worker + WASM</span>
    <span><b>Input</b> in-memory files</span>
  </div>

  <RspackSummary :status="status" :output="output" :asset_count="assetCount" :duration_ms="durationMs" />
  <p v-if="status === 'needs-isolation'" class="notice notice-block">This host does not expose <code>crossOriginIsolated</code>. Use the deployed lab or a server with COOP/COEP headers.</p>

  <div class="mini-ide-workspace">
    <MiniCodePane
      title="Source files"
      :files="sourceFiles"
      :active-path="activeSourcePath"
      @update:active-path="activeSourcePath = $event"
      @update:file-content="updateSource"
    />
    <MiniCodePane
      title="Bundle result"
      :files="outputFiles"
      :active-path="activeOutputPath"
      readonly
      @update:active-path="activeOutputPath = $event"
    />
  </div>

  <div class="workspace-toolbar">
    <span>Source runs in a Worker with an in-memory file system.</span>
    <div class="editor-actions">
      <button class="button subtle" type="button" @click="resetSource">Reset</button>
      <button class="button primary" type="button" @click="runBuild">{{ status === "building" ? "Building…" : "Run browser build" }}</button>
    </div>
  </div>
</template>
