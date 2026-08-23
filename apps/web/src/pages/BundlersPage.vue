<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <section class="page-heading">
    <p class="eyebrow">CASE CATEGORY / BUNDLERS</p>
    <h1>Browser bundlers</h1>
    <p class="lede">The bundler is the external runtime under test. The visible summary is still a Vooya-compiled Rust island.</p>
  </section>

  <div class="case-layout">
    <aside class="case-nav" aria-label="Bundler cases">
      <RouterLink to="/bundlers/rspack">Rspack Browser</RouterLink>
      <RouterLink to="/bundlers/rolldown">Rolldown Browser</RouterLink>
    </aside>
    <section class="case-panel">
      <RouterView />
    </section>
  </div>
</template>
