<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <RouterLink class="brand" to="/">Vooya <span>Lab</span></RouterLink>
      <nav class="topnav" aria-label="Main navigation">
        <RouterLink to="/bundlers">Bundlers</RouterLink>
      </nav>
    </header>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>
