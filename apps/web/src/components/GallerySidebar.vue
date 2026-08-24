<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { galleryCategories, galleryEntries } from "../gallery/registry";

const route = useRoute();
const groups = computed(() => galleryCategories.filter((category) => category !== "All").map((category) => ({
  category,
  entries: galleryEntries.filter((entry) => entry.category === category),
})));
</script>

<template>
  <aside class="gallery-sidebar" aria-label="Demo navigation">
    <nav>
      <p>Browse</p>
      <RouterLink class="gallery-sidebar-all" to="/" :class="{ active: route.path === '/' }">All demos</RouterLink>
      <template v-for="group in groups" :key="group.category">
        <p>{{ group.category }}</p>
        <component
          :is="entry.route ? RouterLink : 'span'"
          v-for="entry in group.entries"
          :key="entry.slug"
          class="gallery-sidebar-entry"
          :class="{ active: entry.route === route.path, muted: !entry.route }"
          :to="entry.route"
        >
          <span>{{ entry.name }}</span>
          <small v-if="entry.status === 'planned'">Soon</small>
        </component>
      </template>
    </nav>
  </aside>
</template>
