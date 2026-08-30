<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

type WorkbenchView = "split" | "preview" | "source";

withDefaults(defineProps<{
  title: string;
  capability: string;
  detail?: string;
  compilerHref?: string;
  compilerLabel?: string;
}>(), {
  detail: "Interactive result and inspectable source",
  compilerHref: "",
  compilerLabel: "Try Browser Compiler α",
});

const view = ref<WorkbenchView>("split");
const userSelectedView = ref(false);
let compactQuery: MediaQueryList | undefined;

function selectView(nextView: WorkbenchView) {
  userSelectedView.value = true;
  view.value = nextView;
}

function syncDefaultView(event: MediaQueryListEvent | MediaQueryList) {
  if (!userSelectedView.value) view.value = event.matches ? "preview" : "split";
}

function showPreview() {
  view.value = "preview";
}

function showSource() {
  view.value = "source";
}

function showSplit() {
  view.value = "split";
}

function revealPreview() {
  if (compactQuery?.matches) view.value = "preview";
}

onMounted(() => {
  compactQuery = window.matchMedia("(max-width: 1100px)");
  syncDefaultView(compactQuery);
  compactQuery.addEventListener("change", syncDefaultView);
});

onBeforeUnmount(() => compactQuery?.removeEventListener("change", syncDefaultView));

defineExpose({ showPreview, showSource, showSplit, revealPreview });
</script>

<template>
  <section class="case-live-workbench" :data-view="view">
    <header class="case-live-toolbar">
      <div class="case-live-identity">
        <span>LIVE WORKBENCH</span>
        <strong>{{ title }}</strong>
        <small>{{ detail }}</small>
      </div>
      <div class="case-live-actions">
        <code>{{ capability }}</code>
        <a v-if="compilerHref" :href="compilerHref">{{ compilerLabel }} <b>↗</b></a>
        <div class="case-live-view-switch" role="group" aria-label="Workbench view">
          <button type="button" :aria-pressed="view === 'split'" @click="selectView('split')">SPLIT</button>
          <button type="button" :aria-pressed="view === 'preview'" @click="selectView('preview')">PREVIEW</button>
          <button type="button" :aria-pressed="view === 'source'" @click="selectView('source')">SOURCE</button>
        </div>
      </div>
    </header>

    <div class="case-live-grid">
      <section class="case-live-pane case-live-preview" aria-label="Preview pane">
        <header><span>RESULT</span><slot name="preview-status"><small>Updates immediately from the controls below.</small></slot></header>
        <div class="case-live-pane-body"><slot name="preview" /></div>
      </section>
      <section class="case-live-pane case-live-source" aria-label="Source pane">
        <header><span>SOURCE</span><slot name="source-status"><small>Browse, select, and copy the real case files.</small></slot></header>
        <div class="case-live-pane-body"><slot name="source" /></div>
      </section>
    </div>
  </section>
</template>
