<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { LabCaseManifest } from "@vooya-lab/case-schema";
import { CaseLiveWorkbench, VooyaWorkbench } from "@vooya-lab/ide";
import { useVooyaStore } from "@vooya/vue";
import manifestData from "./case.json";
import createWorkflowReplayStore from "./src/WorkflowReplay.rs";
import { sourceFiles } from "./sourceFiles";
import "./src/WorkflowReplay.css";

type WorkflowSnapshot = {
  stage: string;
  stage_index: number;
  cursor: number;
  event_count: number;
  violation_count: number;
  can_advance: boolean;
  can_rewind: boolean;
  is_terminal: boolean;
  integrity: string;
  last_attempt: string;
  history: string[];
};

const manifest = manifestData as LabCaseManifest;
const stages = ["Draft", "Review", "Approved", "Scheduled", "Released"];
const rustEntryPath = "cases/state/workflow-replay/src/WorkflowReplay.rs";
const replayTarget = ref(0);
const { snapshot: state, dispatch } = useVooyaStore(createWorkflowReplayStore(), {
  disposeOnUnmount: true,
});

const initialSnapshot: WorkflowSnapshot = {
  stage: "Booting…",
  stage_index: 0,
  cursor: 0,
  event_count: 1,
  violation_count: 0,
  can_advance: false,
  can_rewind: false,
  is_terminal: false,
  integrity: "LOADING",
  last_attempt: "Loading the Rust Store",
  history: ["01 · Loading snapshot"],
};

// Temporary narrowing owned by upstream vooyajs/vooya#105. The generated
// action declarations are concrete today; the user-defined snapshot is not.
const workflow = computed(() => (state.value as WorkflowSnapshot | undefined) ?? initialSnapshot);
const ready = computed(() => state.value !== undefined);
const replayMaximum = computed(() => Math.max(0, workflow.value.event_count - 1));

watch(() => workflow.value.cursor, (cursor) => {
  replayTarget.value = cursor;
});

function runReplay() {
  dispatch("replay_to", replayTarget.value);
}

function resetWorkflow() {
  dispatch("reset");
  replayTarget.value = 0;
}

function advance() {
  dispatch("advance");
}

function rewind() {
  dispatch("rewind");
}

function attemptInvalid() {
  dispatch("attempt_invalid");
}
</script>

<template>
  <article class="case-detail workflow-replay-page">
    <header class="case-intro">
      <div><span class="case-kicker">FLAGSHIP CANDIDATE · STATE &amp; RULES</span><span class="case-route">/cases/state/workflow-replay</span></div>
      <div class="case-title-row"><h1>Workflow <em>Replay</em></h1><span>RUST STORE · VUE DOM</span></div>
      <div class="case-intro-copy">
        <p>{{ manifest.summary }}</p>
        <p><b>WHY VOOYA</b>Keep one tested workflow capability in Rust and reuse it behind a generated Store boundary. Vue still owns every button, label, focus state, and responsive layout.</p>
      </div>
    </header>

    <div class="case-content">
      <div class="case-section-title"><span>01 — Live workbench</span><span>STATE + SOURCE · ONE CONTEXT</span></div>
      <CaseLiveWorkbench
        title="Workflow Replay"
        capability="PRECOMPILED RUST STORE"
        detail="Trigger a domain action, see the Rust snapshot update beside its real source."
        compiler-href="#/experiments/browser-compiler"
      >
        <template #preview-status><small>{{ ready ? `${workflow.integrity} · EVENT ${String(workflow.cursor + 1).padStart(2, '0')}` : 'INITIALIZING WASM' }}</small></template>
        <template #preview>
          <section class="workflow-console" aria-label="Interactive approval workflow replay">
            <header class="workflow-topline">
              <div><i :data-ready="ready"></i><span>instance://approval-demo</span></div>
              <div><b>{{ workflow.integrity }}</b><span>0 NETWORK</span><span>HOST RENDERED</span></div>
            </header>

            <div class="workflow-body" aria-live="polite">
              <section class="workflow-state-card">
                <div class="workflow-state-orbit" :data-terminal="workflow.is_terminal">
                  <span>{{ String(workflow.stage_index + 1).padStart(2, '0') }}</span>
                  <i></i><i></i><i></i>
                </div>
                <div class="workflow-state-copy">
                  <span>CURRENT DOMAIN STATE</span>
                  <h2>{{ workflow.stage }}</h2>
                  <p>{{ workflow.last_attempt }}</p>
                </div>
                <dl>
                  <div><dt>CURSOR</dt><dd>{{ workflow.cursor + 1 }}/{{ workflow.event_count }}</dd></div>
                  <div><dt>REJECTED</dt><dd>{{ String(workflow.violation_count).padStart(2, '0') }}</dd></div>
                  <div><dt>INTEGRITY</dt><dd>{{ workflow.integrity }}</dd></div>
                </dl>
              </section>

              <ol class="workflow-stage-rail" aria-label="Approval stages">
                <li v-for="(stage, index) in stages" :key="stage" :data-state="index === workflow.stage_index ? 'current' : index < workflow.stage_index ? 'complete' : 'pending'">
                  <span>{{ String(index + 1).padStart(2, '0') }}</span><b>{{ stage }}</b><i></i>
                </li>
              </ol>

              <section class="workflow-ledger" aria-label="Rust audit event ledger">
                <header><div><span>AUDIT LEDGER</span><b>APPEND-ONLY · RUST OWNED</b></div><code>{{ workflow.event_count }} EVENTS</code></header>
                <ol>
                  <li v-for="event in workflow.history" :key="event" :class="{ current: event.includes('CURRENT') }"><i></i><span>{{ event.replace(' · CURRENT', '') }}</span><b v-if="event.includes('CURRENT')">CURSOR</b></li>
                </ol>
              </section>
            </div>

            <footer class="workflow-controls">
              <div class="workflow-primary-actions" role="group" aria-label="Workflow actions">
                <button type="button" :disabled="!ready || !workflow.can_rewind" @click="rewind">← REWIND</button>
                <button class="primary" type="button" :disabled="!ready || !workflow.can_advance" @click="advance">ADVANCE →</button>
                <button class="invalid" type="button" :disabled="!ready" @click="attemptInvalid">TRY INVALID</button>
              </div>
              <label class="workflow-replay-control">
                <span>REPLAY TARGET <output>{{ replayTarget + 1 }}/{{ workflow.event_count }}</output></span>
                <span><input v-model.number="replayTarget" aria-label="Replay target event" type="range" min="0" :max="replayMaximum" step="1" :disabled="!ready || replayMaximum === 0" /><button type="button" :disabled="!ready" @click="runReplay">REPLAY</button></span>
              </label>
              <button class="workflow-reset" type="button" :disabled="!ready" @click="resetWorkflow">RESET INSTANCE</button>
            </footer>
          </section>
        </template>
        <template #source>
          <VooyaWorkbench title="Workflow Replay case" :files="sourceFiles" :entry-path="rustEntryPath" :editable="manifest.execution.editable" :execution-mode="manifest.execution.mode" height="100%" />
        </template>
      </CaseLiveWorkbench>
      <div class="under-preview">
        <p><b>No reducer benchmark.</b> The proof is that a domain Store already written and tested in Rust can retain its invariants while the host framework keeps full ownership of product UI.</p>
        <div><a href="https://github.com/vooyajs/vooya/issues/105" target="_blank" rel="noreferrer">Snapshot typing gap #105 ↗</a><a href="https://github.com/vooyajs/vooya-lab/tree/main/cases/state/workflow-replay" target="_blank" rel="noreferrer">View repository ↗</a></div>
      </div>

      <div class="case-section-title"><span>02 — Why this boundary?</span><span>DOMAIN RULES · HOST UI</span></div>
      <section class="case-boundary" aria-label="Host, Rust, and GPU responsibility boundary">
        <div class="boundary-lead"><strong>REUSE THE DOMAIN, NOT THE DOM</strong><p>{{ manifest.question }} This is valuable when the Rust workflow already powers a CLI, desktop service, or backend—not because a five-step reducer is inherently difficult in JavaScript.</p></div>
        <div class="boundary-flow">
          <section><span>01 · VUE / HOST</span><h2>Product surface</h2><p>{{ manifest.proof.hostOwns.join(' · ') }}</p></section>
          <section><span>02 · RUST / WASM</span><h2>Domain capability</h2><p>{{ manifest.proof.rustOwns.join(' · ') }}</p></section>
          <section><span>03 · GPU</span><h2>Not relevant</h2><p>This work is branch-heavy state and audit logic. WebGPU would not improve the ownership boundary; it can remain available to another case that genuinely needs parallel rendering.</p></section>
        </div>
        <div class="boundary-foot"><span><b>Crossing:</b> {{ manifest.proof.boundary.inputs.join(' + ') }} → {{ manifest.proof.boundary.outputs.join(' + ') }}</span><span>{{ manifest.proof.boundary.updatePattern }}</span></div>
      </section>

      <section class="case-notes">
        <div><span>WHAT THIS PROVES</span><p>A generated, instance-scoped Rust Store owns transitions, history, cursor movement, rejected actions, cached snapshots, subscription, and disposal while Vue renders ordinary accessible DOM.</p></div>
        <div><span>WHAT COMES NEXT</span><p>Concrete generated snapshot types are tracked in Core #105. React parity and a packed precompiled Store contract are required before this becomes a genuinely portable copy-and-use case.</p></div>
      </section>
    </div>
  </article>
</template>
