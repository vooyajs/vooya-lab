<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import {
  createCompileRequest,
  type ArtifactManifest,
  type CompilerDiagnostic,
  type CompilerEvent,
  type CompilerRunner,
  type CompilerStage,
  isTerminalStage,
} from "@vooya-lab/compiler-protocol";
import VooyaIde from "./VooyaIde.vue";
import type { IdeFile } from "./types";

const props = withDefaults(defineProps<{
  files: IdeFile[];
  entryPath: string;
  title?: string;
  editable?: boolean;
  executionMode?: "precompiled" | "browser-compiler" | "remote-compiler";
  runner?: CompilerRunner;
  target?: "wasm32-unknown-unknown" | "wasm32-wasip1";
  actionLabel?: string;
  height?: string;
}>(), {
  title: "Source workbench",
  editable: false,
  executionMode: "precompiled",
  target: "wasm32-unknown-unknown",
  actionLabel: "Compile & preview",
  height: "560px",
});

const emit = defineEmits<{
  artifact: [manifest: ArtifactManifest];
  event: [event: CompilerEvent];
}>();

const workspace = ref<IdeFile[]>(props.files.map((file) => ({ ...file })));
const activePath = ref(props.entryPath);
const stage = ref<CompilerStage>("idle");
const requestId = ref("");
const statusMessage = ref("");
const diagnostics = ref<CompilerDiagnostic[]>([]);
const copyStatus = ref<"idle" | "copied" | "failed">("idle");
let copyStatusTimer: ReturnType<typeof window.setTimeout> | undefined;

const canCompile = computed(() => props.editable && props.executionMode === "browser-compiler" && Boolean(props.runner));
const isRunning = computed(() => stage.value !== "idle" && !isTerminalStage(stage.value));
const activeFile = computed(() => workspace.value.find((file) => file.path === activePath.value) ?? workspace.value[0]);
const activeFileName = computed(() => activeFile.value?.path.split("/").pop() ?? "file");
const copyLabel = computed(() => copyStatus.value === "copied" ? `Copied · ${activeFileName.value}` : copyStatus.value === "failed" ? "Copy failed" : "Copy active file");
const compilerRequested = computed(() => props.executionMode !== "precompiled");
const compilerSteps: Array<{ stage: CompilerStage; label: string }> = [
  { stage: "queued", label: "Queue" },
  { stage: "preparing", label: "Prepare" },
  { stage: "compiling", label: "Compile" },
  { stage: "linking", label: "Link" },
  { stage: "emitting", label: "Emit" },
  { stage: "succeeded", label: "Ready" },
];
const stageOrder = computed(() => compilerSteps.findIndex((step) => step.stage === stage.value));
const capabilityLabel = computed(() => {
  if (!props.editable) return "PRECOMPILED · SOURCE LOCKED";
  if (props.executionMode !== "browser-compiler") return `${props.executionMode.toUpperCase()} · RUNNER REQUIRED`;
  if (!props.runner) return "BROWSER COMPILER · CAPABILITY GATED";
  return `${props.runner.id} · ${props.runner.version}`;
});

function updateFile(path: string, content: string) {
  const file = workspace.value.find((item) => item.path === path);
  if (file) file.content = content;
}

async function copyActiveFile() {
  if (!activeFile.value) return;
  let copied = false;
  try {
    await navigator.clipboard.writeText(activeFile.value.content);
    copied = true;
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = activeFile.value.content;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    fallback.style.pointerEvents = "none";
    document.body.append(fallback);
    fallback.select();
    try {
      copied = document.execCommand("copy");
    } finally {
      fallback.remove();
    }
  }
  copyStatus.value = copied ? "copied" : "failed";
  if (copyStatusTimer) window.clearTimeout(copyStatusTimer);
  copyStatusTimer = window.setTimeout(() => { copyStatus.value = "idle"; }, 1600);
}

function handleEvent(event: CompilerEvent) {
  if (event.requestId !== requestId.value) return;
  emit("event", event);
  if (event.type === "state") {
    stage.value = event.stage;
    statusMessage.value = event.message ?? "";
  } else if (event.type === "diagnostic") {
    diagnostics.value.push(event.diagnostic);
  } else if (event.type === "complete") {
    stage.value = event.stage;
    statusMessage.value = event.stage === "succeeded" ? `Compilation succeeded in ${(event.elapsedMs / 1000).toFixed(2)} s` : event.stage === "failed" ? `Compilation failed in ${(event.elapsedMs / 1000).toFixed(2)} s` : "Compilation cancelled";
  }
}

async function compile() {
  if (!canCompile.value || !props.runner) return;
  diagnostics.value = [];
  statusMessage.value = "Preparing virtual workspace";
  const request = createCompileRequest({
    compilerId: props.runner.id,
    workspace: workspace.value.map(({ path, content }) => ({ path, content })),
    entryPath: props.entryPath,
    target: props.target,
    profile: "release",
  });
  requestId.value = request.requestId;
  handleEvent({
    type: "state",
    requestId: request.requestId,
    compilerVersion: props.runner.version,
    stage: "queued",
    message: "Virtual workspace queued for the browser compiler",
  });
  try {
    const artifact = await props.runner.compile(request, handleEvent);
    if (artifact) emit("artifact", artifact);
  } catch (error) {
    stage.value = "failed";
    statusMessage.value = error instanceof Error ? error.message : String(error);
  }
}

function cancel() {
  if (!requestId.value || !props.runner) return;
  props.runner.cancel(requestId.value);
  if (!isTerminalStage(stage.value)) {
    stage.value = "cancelled";
    statusMessage.value = "Cancellation requested";
  }
}

watch(() => props.files, (files) => {
  workspace.value = files.map((file) => ({ ...file }));
}, { deep: true });

watch(() => props.entryPath, (path) => {
  activePath.value = path;
});

onBeforeUnmount(() => {
  if (copyStatusTimer) window.clearTimeout(copyStatusTimer);
  if (requestId.value && !["idle", "succeeded", "failed", "cancelled", "terminated"].includes(stage.value)) {
    props.runner?.cancel(requestId.value);
  }
});
</script>

<template>
  <section class="vooya-workbench" :data-stage="stage" :data-editable="editable">
    <header class="vooya-workbench-toolbar">
      <div><span class="vooya-workbench-signal"></span><strong>{{ capabilityLabel }}</strong><small v-if="statusMessage">{{ statusMessage }}</small></div>
      <div class="vooya-workbench-actions">
        <button type="button" :disabled="!activeFile" :title="`Copy ${activeFileName}`" data-copy-action :data-copy-state="copyStatus" @click="copyActiveFile">{{ copyLabel }}</button>
        <button v-if="isRunning" type="button" @click="cancel">Cancel</button>
        <button v-if="compilerRequested" type="button" :disabled="!canCompile || isRunning" :title="canCompile ? 'Compile the current virtual workspace' : 'This compiler capability is not available in the current environment'" @click="compile">{{ actionLabel }}</button>
      </div>
    </header>
    <div v-if="canCompile" class="vooya-compile-progress" role="status" :aria-label="statusMessage || `Compiler ${stage}`">
      <span
        v-for="(step, index) in compilerSteps"
        :key="step.stage"
        :data-state="stage === 'failed' && index === Math.max(stageOrder, 0) ? 'failed' : index < stageOrder || stage === 'succeeded' ? 'complete' : index === stageOrder ? 'active' : 'pending'"
      ><i></i>{{ step.label }}</span>
    </div>
    <VooyaIde :title="title" :files="workspace" :active-path="activePath" :readonly="!editable" :height="height" @update:active-path="activePath = $event" @update:file-content="updateFile" />
    <footer class="vooya-workbench-output" aria-live="polite">
      <div><span>DIAGNOSTICS</span><b>{{ diagnostics.length }}</b></div>
      <p v-if="!diagnostics.length">{{ editable ? 'No diagnostics yet.' : 'Rust editing is disabled. This page mounts the repository-built artifact; the compiler control is intentionally unavailable.' }}</p>
      <ol v-else><li v-for="(diagnostic, index) in diagnostics" :key="`${diagnostic.message}-${index}`" :data-severity="diagnostic.severity"><b>{{ diagnostic.severity }}</b><span>{{ diagnostic.location?.path }}{{ diagnostic.location ? `:${diagnostic.location.start.line}:${diagnostic.location.start.column}` : '' }}</span>{{ diagnostic.message }}</li></ol>
    </footer>
  </section>
</template>
