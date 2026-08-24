<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";
import { galleryCategories, galleryEntries } from "../gallery/registry";
import GallerySidebar from "../components/GallerySidebar.vue";
import GalleryRail from "../components/GalleryRail.vue";
import ScatterPlot from "@lab-cases/examples/scatter-plot/src/ScatterPlot.rs";

const categories = galleryCategories;
const activeCategory = ref<(typeof categories)[number]>("All");
const query = ref("");
const filteredEntries = computed(() => galleryEntries.filter((entry) => {
  const inCategory = activeCategory.value === "All" || entry.category === activeCategory.value;
  const search = query.value.trim().toLowerCase();
  const matchesSearch = !search || [entry.name, entry.summary, entry.category, ...entry.tags].join(" ").toLowerCase().includes(search);
  return inCategory && matchesSearch;
}));
</script>

<template>
  <div class="gallery-docs-layout">
    <GallerySidebar />
    <section class="gallery-browser" aria-labelledby="gallery-heading">
      <div class="gallery-page-title">
        <div><h1 id="gallery-heading">Browse All</h1><p>Interactive Rust/WASM examples built with Vooya. Open a demo to run it, compare implementations, and read its source.</p></div>
      </div>
      <div class="gallery-toolbar">
        <label class="gallery-search"><span>⌕</span><input v-model="query" type="search" placeholder="Search demos…" aria-label="Search demos" /></label>
        <div class="gallery-filters" role="group" aria-label="Filter demos by category">
          <button v-for="category in categories" :key="category" type="button" :class="{ active: activeCategory === category }" @click="activeCategory = category">{{ category }}</button>
        </div>
      </div>

      <div class="gallery-grid">
        <component
          :is="entry.route ? RouterLink : 'article'"
          v-for="entry in filteredEntries"
          :key="entry.slug"
          class="gallery-card"
          :class="{ planned: entry.status === 'planned' }"
          :to="entry.route"
        >
          <div
            class="gallery-card-visual"
            :class="{ 'gallery-card-live-preview': entry.slug === 'scatter-plot' }"
            :data-visual="entry.visual"
          >
            <div v-if="entry.slug === 'scatter-plot'" class="card-live-stage" aria-hidden="true">
              <ScatterPlot :points="24_000" :zoom="0.92" />
              <span>Rust / WASM · live preview</span>
            </div>
            <div v-else-if="entry.visual === 'scatter'" class="card-scatter" aria-hidden="true"><i v-for="index in 24" :key="index" :style="{ '--i': index }"></i></div>
            <div v-else-if="entry.visual === 'grid'" class="card-grid-lines" aria-hidden="true"><i v-for="index in 8" :key="index"></i></div>
            <div v-else-if="entry.visual === 'trace'" class="card-traces" aria-hidden="true"><i v-for="index in 7" :key="index" :style="{ '--i': index }"></i></div>
            <div v-else-if="entry.visual === 'image'" class="card-pixels" aria-hidden="true"></div>
            <div v-else class="card-terminal" aria-hidden="true"><span>$ build</span><i></i><i></i><i></i><strong>{{ entry.visual }}</strong></div>
            <span class="gallery-status" :data-status="entry.status">{{ entry.status }}</span>
          </div>
          <div class="gallery-card-copy">
            <p>{{ entry.category }}</p>
            <h3>{{ entry.name }}</h3>
            <span>{{ entry.summary }}</span>
            <div class="gallery-tags"><small v-for="tag in entry.tags" :key="tag">{{ tag }}</small></div>
          </div>
        </component>
      </div>
      <p v-if="!filteredEntries.length" class="gallery-empty">No demos match that search yet.</p>
    </section>
    <GalleryRail />
  </div>
</template>
