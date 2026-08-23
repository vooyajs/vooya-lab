<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <section class="hero">
    <p class="eyebrow">BROWSER INTEGRATION LABORATORY</p>
    <h1>See the Vooya boundary working.</h1>
    <p class="lede">
      Each case starts with a Rust component compiled through Vooya, then
      exercises a real browser host, external WASM dependency, or integration
      boundary.
    </p>
    <div class="hero-actions">
      <RouterLink class="button primary" to="/bundlers">Explore bundlers</RouterLink>
    </div>
  </section>

  <section class="card-grid" aria-label="Lab principles">
    <article class="card">
      <span class="card-index">01</span>
      <h2>Own the compile path</h2>
      <p>Cases are not complete until their Rust island is built by Vooya.</p>
    </article>
    <article class="card">
      <span class="card-index">02</span>
      <h2>Keep scenarios independent</h2>
      <p>Bundlers are one category among editors, graphics, data, and WASM.</p>
    </article>
    <article class="card">
      <span class="card-index">03</span>
      <h2>Show the evidence</h2>
      <p>Every page exposes its runtime state, boundaries, and known limits.</p>
    </article>
  </section>
</template>
