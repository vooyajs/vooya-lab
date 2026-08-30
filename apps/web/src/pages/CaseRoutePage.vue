<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, type Component } from "vue";
import type { LabCaseManifest } from "@vooya-lab/case-schema";
import type { CasePageLoader } from "../cases/registry";

const props = defineProps<{
  manifest: LabCaseManifest;
  loadPage: CasePageLoader;
}>();

const loadedPage = shallowRef<Component>();
const loadError = ref("");
let active = true;

async function loadCase() {
  loadError.value = "";
  try {
    const page = await props.loadPage();
    if (active) loadedPage.value = page.default;
  } catch (error) {
    if (active) loadError.value = error instanceof Error ? error.message : String(error);
  }
}

onMounted(() => void loadCase());
onBeforeUnmount(() => { active = false; });
</script>

<template>
  <component :is="loadedPage" v-if="loadedPage" />
  <article v-else class="case-detail case-route-pending" :aria-busy="!loadError">
    <header class="case-intro">
      <div><span class="case-kicker">{{ manifest.portfolioClass }} · {{ manifest.category }}</span><span class="case-route">/cases/{{ manifest.category }}/{{ manifest.slug }}</span></div>
      <div class="case-title-row"><h1>{{ manifest.title }}</h1><span>LOADING CASE MODULE</span></div>
      <div class="case-intro-copy">
        <p>{{ manifest.summary }}</p>
        <p><b>LOADING STRATEGY</b>The page shell is ready. Its code-split case module and precompiled WASM remain on demand.</p>
      </div>
    </header>

    <div class="case-content">
      <div class="case-section-title"><span>01 — Live workbench</span><span>ASYNC CASE ASSETS</span></div>
      <section class="case-live-workbench case-route-loading-workbench" data-view="split" aria-label="Case workbench loading">
        <header class="case-live-toolbar">
          <div class="case-live-identity"><span>LIVE WORKBENCH</span><strong>{{ manifest.title }}</strong><small>The work surface stays stable while this case arrives.</small></div>
          <div class="case-live-actions"><code>{{ loadError ? 'LOAD INTERRUPTED' : 'FETCHING MODULE' }}</code></div>
        </header>
        <div class="case-live-grid">
          <section class="case-live-pane case-live-preview" aria-label="Preview pane">
            <header><span>RESULT</span><small>{{ loadError ? 'Case module unavailable' : 'Loading preview resources…' }}</small></header>
            <div class="case-live-pane-body case-route-preview-stage">
              <div class="compiler-preview-loading" role="status" aria-live="polite" aria-label="Case preview loading">
                <div class="compiler-preview-loading-panel">
                  <div class="compiler-preview-loading-orbit" aria-hidden="true"><i></i><i></i></div>
                  <div class="compiler-preview-loading-copy">
                    <span>{{ loadError ? 'CASE LOAD · FAILED' : 'CASE LOAD · ASYNCHRONOUS' }}</span>
                    <strong>{{ loadError ? 'The case module did not arrive' : 'Preparing the interactive preview' }}</strong>
                    <p>{{ loadError || 'Fetching only this case’s JavaScript, source payload, and WASM binding. The rest of the library stays deferred.' }}</p>
                  </div>
                  <div v-if="!loadError" class="compiler-preview-loading-track" aria-hidden="true"><i v-for="step in 7" :key="step"></i></div>
                  <footer>
                    <span>{{ loadError ? 'Check the connection and retry.' : 'Navigation and the case directory remain available.' }}</span>
                    <button v-if="loadError" type="button" @click="loadCase">Retry load</button>
                  </footer>
                </div>
              </div>
            </div>
          </section>
          <section class="case-live-pane case-live-source" aria-label="Source pane">
            <header><span>SOURCE</span><small>Source explorer will mount with the case.</small></header>
            <div class="case-live-pane-body case-route-source-skeleton" aria-hidden="true">
              <div><span></span><span></span><span></span><span></span><span></span></div>
              <div><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
            </div>
          </section>
        </div>
      </section>
    </div>
  </article>
</template>
