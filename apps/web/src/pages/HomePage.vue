<script setup lang="ts">
import { RouterLink } from "vue-router";
import { prefetchCase, registeredCases } from "../cases/registry";

const publicCases = registeredCases.filter((entry) => entry.manifest.portfolioClass !== "experiment");
const portfolio = [
  { index: "01", title: "Log Atlas", kind: "ECOSYSTEM PORT", summary: "Parse, index, and search large logs with mature Rust crates while the host owns filters and accessible result views.", tone: "acid", route: "/cases/data/log-atlas", status: "LIVE FLAGSHIP" },
  { index: "02", title: "Mesh Clinic", kind: "CPU + GPU", summary: "Rust validates and repairs irregular topology; WebGPU renders the result. The boundary is the product.", tone: "violet", status: "PROPOSAL · DISCUSSION #104" },
  { index: "03", title: "Workflow Replay", kind: "STATE MACHINE", summary: "Replay deterministic domain state locally and inspect every transition without moving the application shell into WASM.", tone: "cyan", status: "PROPOSAL · DISCUSSION #104" },
  { index: "04", title: "Source Surgeon", kind: "DEVELOPER TOOL", summary: "Reuse parser and AST ecosystems in the browser, then return structured edits instead of a black-box transform.", tone: "hot", status: "PROPOSAL · DISCUSSION #104" },
  { index: "05", title: "Vector Tile Forge", kind: "CPU + GPU", summary: "Decode and simplify geospatial data in Rust, then hand compact buffers to the renderer that is best at drawing them.", tone: "violet", status: "PROPOSAL · DISCUSSION #104" },
];
</script>

<template>
  <div class="catalog-home">
    <section class="catalog-hero">
      <div><span class="catalog-kicker">A CASE LIBRARY FOR RUST ON THE WEB</span><span class="catalog-route">/cases</span></div>
      <h1>See the effect.<br /><em>Understand the boundary.</em></h1>
      <div class="catalog-hero-copy">
        <p>Vooya Lab is where reusable Rust capabilities become copyable web experiences. The visuals earn attention; every case then shows what Rust/WASM owns, what the host keeps, and where a GPU should collaborate.</p>
        <p><b>{{ publicCases.length }} cases live</b><span>1 flagship live · 4 queued</span><span>Browser compiler: controlled Gate 2</span></p>
      </div>
    </section>

    <section class="catalog-section" aria-labelledby="live-heading">
      <header><span id="live-heading">01 — Run the proof</span><span>PRECOMPILED · INTERACTIVE</span></header>
      <div class="live-case-grid">
        <RouterLink v-for="entry in publicCases" :key="entry.route" :to="entry.route" class="live-case-card" @pointerenter="prefetchCase(entry.route)" @focus="prefetchCase(entry.route)" @touchstart.passive="prefetchCase(entry.route)">
          <div class="live-card-field" aria-hidden="true"><i v-for="dot in 36" :key="dot" :style="{ left: `${8 + (dot * 17) % 83}%`, top: `${5 + (dot * 29) % 86}%` }"></i><span>RUST / WASM · LIVE</span></div>
          <div class="live-card-copy"><span>{{ entry.manifest.portfolioClass }}</span><h2>{{ entry.manifest.title }}</h2><p>{{ entry.manifest.summary }}</p><div><code v-for="tag in entry.manifest.tags" :key="tag">{{ tag }}</code></div></div>
        </RouterLink>
      </div>
    </section>

    <section class="catalog-section" aria-labelledby="portfolio-heading">
      <header><span id="portfolio-heading">02 — Flagship portfolio</span><span>ATTENTION + DURABLE VALUE</span></header>
      <div class="portfolio-grid">
        <article v-for="item in portfolio" :key="item.title" :data-tone="item.tone">
          <div><span>{{ item.index }}</span><code>{{ item.kind }}</code></div>
          <h2>{{ item.title }}</h2>
          <p>{{ item.summary }}</p>
          <RouterLink v-if="item.route" :to="item.route" @pointerenter="prefetchCase(item.route)" @focus="prefetchCase(item.route)" @touchstart.passive="prefetchCase(item.route)">OPEN LIVE CASE →</RouterLink>
          <small v-else>{{ item.status }}</small>
        </article>
      </div>
    </section>

    <section class="catalog-manifesto">
      <span>THE RULE</span>
      <p>GPU demos are welcome when the GPU is genuinely the right renderer. Vooya earns its place through ecosystem reuse, irregular CPU work, deterministic state, portability, and a typed lifecycle boundary—not through pretending WASM replaces every part of the web stack.</p>
      <a href="https://github.com/vooyajs/vooya/discussions/104#discussioncomment-18201895" target="_blank" rel="noreferrer">Read the case strategy ↗</a>
    </section>
  </div>
</template>
