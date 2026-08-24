<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <RouterLink class="brand" to="/">
        <span class="brand-mark" aria-hidden="true">V</span>
        <span class="brand-wordmark">Vooya <em>Lab</em></span>
      </RouterLink>
      <nav class="topnav" aria-label="Main navigation">
        <RouterLink class="nav-docs" to="/">Gallery</RouterLink>
      </nav>
      <div class="topbar-actions">
        <RouterLink class="global-search" to="/"><span>⌕</span> Search demos… <kbd>/</kbd></RouterLink>
        <a class="nav-github" href="https://github.com/vooyajs/vooya-lab" target="_blank" rel="noreferrer">GitHub</a>
      </div>
    </header>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>
