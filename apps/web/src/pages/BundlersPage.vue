<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { catalogFolders } from "../catalog";

const route = useRoute();
const isTreeOpen = ref(true);
const openFolders = ref<Record<string, boolean>>({
  bundlers: true,
  examples: false,
  graphics: false,
});

const activeFolder = computed(() => {
  const slug = route.path.split("/")[1] || "bundlers";
  return catalogFolders.find((folder) => folder.slug === slug) ?? catalogFolders[0];
});

const liveCount = computed(() => activeFolder.value.entries.filter((entry) => entry.status === "live").length);

watch(() => activeFolder.value.slug, (slug) => {
  openFolders.value[slug] = true;
}, { immediate: true });

function toggleFolder(slug: string) {
  openFolders.value[slug] = !openFolders.value[slug];
}

function statusLabel(status: string) {
  return status === "live" ? "live" : status === "catalogued" ? "catalogued" : "planned";
}
</script>

<template>
  <div class="lab-layout">
    <aside class="sidebar" aria-label="Lab directory">
      <div class="sidebar-intro">
        <p class="eyebrow">LAB CATALOG</p>
        <p class="sidebar-caption">Integration cases</p>
      </div>

      <nav class="sidebar-nav file-tree" aria-label="Case directory">
        <button class="tree-root-toggle" type="button" :aria-expanded="isTreeOpen" @click="isTreeOpen = !isTreeOpen">
          <span class="tree-chevron" :class="{ open: isTreeOpen }">›</span>
          <strong>cases/</strong>
        </button>
        <div v-show="isTreeOpen" class="tree-children">
          <div v-for="folder in catalogFolders" :key="folder.slug" class="category-group">
            <button
              class="category-link category-toggle"
              type="button"
              :aria-expanded="openFolders[folder.slug]"
              :aria-controls="`${folder.slug}-cases`"
              @click="toggleFolder(folder.slug)"
            >
              <span class="category-label">
                <span class="category-chevron" :class="{ open: openFolders[folder.slug] }">›</span>
                <span><strong>{{ folder.label }}</strong><small>{{ folder.description }}</small></span>
              </span>
              <span class="category-count">{{ folder.entries.length }}</span>
            </button>
            <div v-show="openFolders[folder.slug]" :id="`${folder.slug}-cases`" class="case-links" :aria-label="`${folder.label} cases`">
              <RouterLink v-for="(entry, index) in folder.entries" :key="entry.slug" class="case-link" :to="entry.to">
                <span class="case-link-index">{{ String(index + 1).padStart(2, "0") }}</span>
                <span><strong>{{ entry.name }}/</strong><small>{{ entry.detail }} · {{ statusLabel(entry.status) }}</small></span>
              </RouterLink>
            </div>
          </div>
        </div>
      </nav>

      <div class="sidebar-note">
        <span class="sidebar-note-mark">↗</span>
        <p>Navigation follows the <code>cases/&lt;category&gt;/&lt;case&gt;</code> source layout.</p>
      </div>
    </aside>

    <main class="case-main">
      <section class="page-heading">
        <div class="heading-row">
          <div>
            <p class="eyebrow">CASE CATEGORY / {{ activeFolder.label.replace("/", "").toUpperCase() }}</p>
            <h1>{{ activeFolder.title }}</h1>
          </div>
          <span class="heading-badge">{{ liveCount ? `${liveCount} live cases` : "catalogue" }}</span>
        </div>
        <p class="lede">{{ activeFolder.description }}. Each case keeps its source boundary, runtime, and evidence visible.</p>
      </section>

      <section class="case-panel">
        <RouterView />
      </section>
    </main>
  </div>
</template>
