<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import type { LabCaseManifest } from "@vooya-lab/case-schema";
import { CaseLiveWorkbench, VooyaWorkbench } from "@vooya-lab/ide";
import { useVooyaStore } from "@vooya/vue";
import manifestData from "./case.json";
import createBevyWorldStore from "./src/BevyWorld.rs";
import { sourceFiles } from "./sourceFiles";
import "./src/BevyWorld.css";

type AgentProjection = {
  id: number;
  x: number;
  y: number;
  energy: number;
  faction: "ACID" | "CYAN" | "VIOLET";
  pulse: number;
  selected: boolean;
};

type BevyWorldSnapshot = {
  tick: number;
  running: boolean;
  entity_count: number;
  system_count: number;
  selected_id: number;
  selected_label: string;
  selected_energy: number;
  average_energy: number;
  checksum: number;
  agents: AgentProjection[];
};

const manifest = manifestData as LabCaseManifest;
const rustEntryPath = "cases/simulation/bevy-world-inspector/src/BevyWorld.rs";
const systems = ["MOVEMENT", "BOUNDARY", "ENERGY", "PULSE", "CLOCK"];
const { snapshot: state, dispatch } = useVooyaStore(createBevyWorldStore(), {
  disposeOnUnmount: true,
});

const initialSnapshot: BevyWorldSnapshot = {
  tick: 0,
  running: false,
  entity_count: 0,
  system_count: 5,
  selected_id: 0,
  selected_label: "INITIALIZING WORLD",
  selected_energy: 0,
  average_energy: 0,
  checksum: 0,
  agents: [],
};

// Temporary narrowing owned by vooyajs/vooya#105.
const world = computed(() => (state.value as BevyWorldSnapshot | undefined) ?? initialSnapshot);
const ready = computed(() => state.value !== undefined);
const selectedAgent = computed(() => world.value.agents.find((agent) => agent.id === world.value.selected_id));
let clock: ReturnType<typeof setInterval> | undefined;

function runAction(action: string, ...args: unknown[]) {
  if (ready.value) dispatch(action, ...args);
}

function agentStyle(agent: AgentProjection) {
  return {
    left: `${(agent.x + 100) / 2}%`,
    top: `${(agent.y + 100) / 2}%`,
    "--agent-pulse": String(0.72 + agent.pulse * 0.48),
  };
}

onMounted(() => {
  clock = setInterval(() => {
    if (ready.value && world.value.running) dispatch("tick", 1);
  }, 120);
});

onBeforeUnmount(() => {
  if (clock) clearInterval(clock);
});
</script>

<template>
  <article class="case-detail bevy-world-page">
    <header class="case-intro">
      <div><span class="case-kicker">SHOWCASE · HEAVY ECOSYSTEM</span><span class="case-route">/cases/simulation/bevy-world-inspector</span></div>
      <div class="case-title-row"><h1>Bevy World <em>Inspector</em></h1><span>HEADLESS ECS · VUE HOST</span></div>
      <div class="case-intro-copy">
        <p>{{ manifest.summary }}</p>
        <p><b>WHY VOOYA</b>Use Bevy's real World, components, resources, and Schedule without moving the surrounding application into a game engine or maintaining a handwritten WASM lifecycle bridge.</p>
      </div>
    </header>

    <div class="case-content">
      <div class="case-section-title"><span>01 — Live world</span><span>BEVY ECS + SOURCE · ONE CONTEXT</span></div>
      <CaseLiveWorkbench
        title="Bevy World Inspector"
        capability="BEVY ECS 0.18.1"
        detail="Inspect a real headless ECS schedule and its exact Rust source."
        compiler-href="#/experiments/browser-compiler"
      >
        <template #preview-status><small>{{ ready ? `TICK ${String(world.tick).padStart(5, '0')} · ${world.entity_count} ENTITIES` : 'CREATING BEVY WORLD' }}</small></template>
        <template #preview>
          <section class="bevy-console" aria-label="Interactive Bevy ECS world inspector">
            <header class="bevy-topline">
              <div><i :data-running="world.running"></i><span>world://headless/lab-01</span></div>
              <div><b>{{ world.running ? "SCHEDULE RUNNING" : "SCHEDULE PAUSED" }}</b><span>NO RENDERER</span><span>0 ASSETS</span></div>
            </header>

            <div class="bevy-layout">
              <section class="bevy-world-map" aria-label="Host-rendered Bevy entity projection">
                <header><span>VUE DOM PROJECTION</span><code>±100 WORLD UNITS</code></header>
                <div class="bevy-grid">
                  <span class="bevy-axis x">X</span><span class="bevy-axis y">Y</span>
                  <button
                    v-for="agent in world.agents"
                    :key="agent.id"
                    type="button"
                    class="bevy-agent"
                    :class="`faction-${agent.faction.toLowerCase()}`"
                    :style="agentStyle(agent)"
                    :aria-pressed="agent.selected"
                    :aria-label="`Agent ${agent.id}, ${agent.faction}, ${Math.round(agent.energy)} percent energy`"
                    @click="runAction('select', agent.id)"
                  ><i></i><span>{{ String(agent.id).padStart(2, "0") }}</span></button>
                  <p v-if="!ready">Allocating Bevy World…</p>
                </div>
              </section>

              <aside class="bevy-inspector" aria-label="Selected Bevy entity inspector">
                <header><span>ENTITY INSPECTOR</span><code>{{ world.selected_id ? `#${world.selected_id}` : "—" }}</code></header>
                <div class="bevy-selected">
                  <span>SELECTED ARCHETYPE</span>
                  <h2>{{ world.selected_label }}</h2>
                  <div class="bevy-energy"><span><b>ENERGY</b><output>{{ Math.round(world.selected_energy) }}%</output></span><i><b :style="{ width: `${world.selected_energy}%` }"></b></i></div>
                  <dl v-if="selectedAgent">
                    <div><dt>POSITION.X</dt><dd>{{ selectedAgent.x.toFixed(2) }}</dd></div>
                    <div><dt>POSITION.Y</dt><dd>{{ selectedAgent.y.toFixed(2) }}</dd></div>
                    <div><dt>FACTION</dt><dd>{{ selectedAgent.faction }}</dd></div>
                    <div><dt>PULSE</dt><dd>{{ selectedAgent.pulse.toFixed(2) }}</dd></div>
                  </dl>
                </div>
                <section class="bevy-schedule">
                  <header><span>FIXED SCHEDULE</span><b>{{ world.system_count }} SYSTEMS</b></header>
                  <ol><li v-for="(system, index) in systems" :key="system"><span>{{ String(index + 1).padStart(2, "0") }}</span><b>{{ system }}</b><i></i></li></ol>
                </section>
              </aside>
            </div>

            <section class="bevy-metrics" aria-label="Bevy world metrics">
              <div><span>WORLD TICK</span><strong>{{ String(world.tick).padStart(5, "0") }}</strong></div>
              <div><span>ENTITIES</span><strong>{{ String(world.entity_count).padStart(2, "0") }}<small>/48</small></strong></div>
              <div><span>AVG ENERGY</span><strong>{{ Math.round(world.average_energy) }}<small>%</small></strong></div>
              <div><span>CHECKSUM</span><strong>{{ world.checksum.toString(16).toUpperCase().padStart(6, "0") }}</strong></div>
            </section>

            <footer class="bevy-controls">
              <div role="group" aria-label="Bevy playback controls">
                <button class="primary" type="button" :disabled="!ready" @click="runAction('toggle_running')">{{ world.running ? "Ⅱ PAUSE" : "▶ RUN" }}</button>
                <button type="button" :disabled="!ready" @click="runAction('step')">STEP +1</button>
              </div>
              <div role="group" aria-label="Bevy entity controls">
                <button type="button" :disabled="!ready || world.entity_count >= 48" @click="runAction('spawn_agent')">+ SPAWN</button>
                <button class="danger" type="button" :disabled="!ready || world.entity_count <= 1" @click="runAction('despawn_selected')">− DESPAWN</button>
              </div>
              <button type="button" :disabled="!ready" @click="runAction('reset')">RESET WORLD</button>
            </footer>
          </section>
        </template>
        <template #source>
          <VooyaWorkbench title="Bevy World Inspector case" :files="sourceFiles" :entry-path="rustEntryPath" :editable="manifest.execution.editable" :execution-mode="manifest.execution.mode" height="100%" />
        </template>
      </CaseLiveWorkbench>

      <div class="under-preview">
        <p><b>Real Bevy, deliberately headless.</b> This uses Bevy ECS World and Schedule; it does not pretend to be the renderer, editor, asset server, or full DefaultPlugins stack.</p>
        <div><a href="https://bevy.org/news/bevy-0-18/" target="_blank" rel="noreferrer">Bevy 0.18 ↗</a><a href="https://github.com/vooyajs/vooya-lab/tree/main/cases/simulation/bevy-world-inspector" target="_blank" rel="noreferrer">View repository ↗</a></div>
      </div>

      <div class="case-section-title"><span>02 — Why this boundary?</span><span>HOST PRODUCT · BEVY WORLD · FUTURE GPU</span></div>
      <section class="case-boundary" aria-label="Host, Bevy ECS, and GPU responsibility boundary">
        <div class="boundary-lead"><strong>BRING THE WORLD, KEEP THE APP</strong><p>{{ manifest.question }} The point is ecosystem and lifecycle reuse—not rebuilding a small array animation with a much larger dependency.</p></div>
        <div class="boundary-flow">
          <section><span>01 · VUE / HOST</span><h2>Product inspector</h2><p>{{ manifest.proof.hostOwns.join(' · ') }}</p></section>
          <section><span>02 · BEVY / WASM</span><h2>Headless world</h2><p>{{ manifest.proof.rustOwns.join(' · ') }}</p></section>
          <section><span>03 · WEBGL2 / WEBGPU</span><h2>Next collaborator</h2><p>A later renderer may consume a compact world projection. It should own rasterization while Bevy ECS keeps simulation ownership.</p></section>
        </div>
        <div class="boundary-foot"><span><b>Crossing:</b> {{ manifest.proof.boundary.inputs.join(' + ') }} → {{ manifest.proof.boundary.outputs.join(' + ') }}</span><span>{{ manifest.proof.boundary.updatePattern }}</span></div>
      </section>

      <section class="case-notes">
        <div><span>WHAT THIS PROVES</span><p>An exact, feature-configured Bevy ECS crate compiles through the ordinary Vooya dependency path and runs World, Resource, Component, Query, Schedule, Store subscription, and disposal semantics in browser WASM.</p></div>
        <div><span>WHAT IT EXPOSED</span><p>Bevy ECS 0.19.x already requires a newer compiler than the selected toolchain, and adding one headless crate increased the shared WASM by roughly 506 KB raw. Many cases require per-case artifact isolation.</p></div>
      </section>
    </div>
  </article>
</template>
