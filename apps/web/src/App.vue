<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { caseByRoute, registeredCases } from "./cases/registry";

type LibrarySection = "all" | "data" | "graphics" | "tools";
type DirectoryItem = {
  title: string;
  route?: string;
  section: Exclude<LibrarySection, "all">;
  group: string;
  badge: string;
  search: string;
};

const route = useRoute();
const directoryExpanded = ref(true);
const mobileOpen = ref(false);
const activeSection = ref<LibrarySection>("all");
const query = ref("");
const directoryElement = ref<HTMLElement>();
const mainElement = ref<HTMLElement>();

const sectionLabels: Record<LibrarySection, string> = { all: "ALL", data: "DAT", graphics: "GFX", tools: "DEV" };

const implementedItems = registeredCases
  .filter((entry) => entry.manifest.portfolioClass !== "experiment")
  .map<DirectoryItem>((entry) => {
    const haystack = [entry.manifest.title, entry.manifest.summary, ...entry.manifest.tags].join(" ").toLowerCase();
    const section = /canvas|graphic|image|mesh|geometry|spatial/.test(haystack) ? "graphics" : "data";
    return {
      title: entry.manifest.title,
      route: entry.loadPage ? entry.route : undefined,
      section,
      group: entry.manifest.portfolioClass === "flagship" ? "Flagships" : "Foundations",
      badge: entry.manifest.status === "live" ? "LIVE" : entry.manifest.status.toUpperCase(),
      search: haystack,
    };
  });

const plannedItems: DirectoryItem[] = [
  { title: "Workflow Replay", section: "data", group: "State & rules", badge: "STATE", search: "workflow replay state rules event sourcing" },
  { title: "Mesh Clinic", section: "graphics", group: "Geometry systems", badge: "CPU+GPU", search: "mesh clinic geometry repair webgpu" },
  { title: "Vector Tile Forge", section: "graphics", group: "Geometry systems", badge: "CPU+GPU", search: "vector tile forge map geometry webgpu" },
  { title: "Source Surgeon", section: "tools", group: "Developer tools", badge: "DEV", search: "source surgeon parser ast developer tools" },
];

const visibleGroups = computed(() => {
  const needle = query.value.trim().toLowerCase();
  const items = [...implementedItems, ...plannedItems].filter((item) => {
    const inSection = activeSection.value === "all" || item.section === activeSection.value;
    return inSection && (!needle || `${item.title} ${item.search}`.toLowerCase().includes(needle));
  });
  const groups = new Map<string, DirectoryItem[]>();
  for (const item of items) {
    const entries = groups.get(item.group) ?? [];
    entries.push(item);
    groups.set(item.group, entries);
  }
  return [...groups.entries()].map(([name, entries]) => ({ name, entries }));
});

const activeCase = computed(() => caseByRoute.get(route.path));
const activeCaseIndex = computed(() => implementedItems.findIndex((item) => item.route === route.path));

function chooseSection(section: LibrarySection) {
  activeSection.value = section;
  directoryExpanded.value = true;
}

async function syncRouteViewport() {
  await nextTick();
  mainElement.value?.scrollTo({ top: 0, left: 0 });
  directoryElement.value
    ?.querySelector<HTMLElement>('.directory-case[aria-current="page"]')
    ?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

watch(() => route.path, () => {
  mobileOpen.value = false;
  void syncRouteViewport();
}, { immediate: true });
</script>

<template>
  <div class="lab-shell" :data-directory="directoryExpanded ? 'expanded' : 'collapsed'">
    <header class="lab-topbar">
      <RouterLink class="lab-mark" to="/" aria-label="Vooya Lab home">V/</RouterLink>
      <RouterLink class="lab-brand" to="/">VOOYA LAB <span>α.01</span></RouterLink>
      <div class="lab-global">
        <nav aria-label="Global navigation"><RouterLink to="/">Cases</RouterLink><RouterLink class="compiler-alpha-link" to="/experiments/browser-compiler">Compiler <sup>α</sup></RouterLink><a href="https://vooyajs.com" target="_blank" rel="noreferrer">Docs</a><a href="https://github.com/vooyajs/vooya/discussions/104" target="_blank" rel="noreferrer">Roadmap</a></nav>
        <div class="lab-global-actions">
          <button class="lab-mobile-trigger" type="button" :aria-expanded="mobileOpen" @click="mobileOpen = !mobileOpen">Browse · {{ implementedItems.length + plannedItems.length }}</button>
          <a class="lab-github" href="https://github.com/vooyajs/vooya-lab" target="_blank" rel="noreferrer">GitHub <b>↗</b></a>
        </div>
      </div>
    </header>

    <div v-if="mobileOpen" class="lab-mobile-drawer" aria-label="Mobile case directory">
      <label class="directory-search"><span>⌕</span><input v-model="query" type="search" placeholder="Search cases…" aria-label="Search cases" /></label>
      <template v-for="group in visibleGroups" :key="group.name">
        <p>{{ group.name }}</p>
        <component :is="item.route ? RouterLink : 'span'" v-for="item in group.entries" :key="item.title" :to="item.route" :class="{ planned: !item.route }"><span>{{ item.title }}</span><code>{{ item.badge }}</code></component>
      </template>
    </div>

    <div class="lab-body">
      <nav class="section-rail" aria-label="Library sections">
        <button
          v-if="!directoryExpanded"
          class="rail-open"
          type="button"
          aria-label="Expand case directory"
          aria-controls="case-directory"
          :aria-expanded="directoryExpanded"
          @click="directoryExpanded = true"
        ><span aria-hidden="true">›</span><small>CASES</small></button>
        <button v-for="(label, section) in sectionLabels" :key="section" type="button" :aria-pressed="activeSection === section" @click="chooseSection(section)">{{ label }}</button>
      </nav>

      <aside ref="directoryElement" id="case-directory" class="case-directory" aria-label="Case directory" :aria-hidden="!directoryExpanded" :inert="!directoryExpanded">
        <div class="directory-meta"><span>Case library</span><span>{{ implementedItems.length + plannedItems.length }}</span><button type="button" aria-label="Collapse case directory" aria-controls="case-directory" :aria-expanded="directoryExpanded" @click="directoryExpanded = false">‹</button></div>
        <label class="directory-search"><span>⌕</span><input v-model="query" type="search" placeholder="Search cases…" aria-label="Search cases" /></label>
        <div class="directory-groups">
          <section v-for="group in visibleGroups" :key="group.name" class="directory-group">
            <h2><span>{{ group.name }}</span><span>{{ group.entries.length }}</span></h2>
            <component
              :is="item.route ? RouterLink : 'span'"
              v-for="item in group.entries"
              :key="item.title"
              class="directory-case"
              :class="{ planned: !item.route }"
              :to="item.route"
              :aria-current="item.route === route.path ? 'page' : undefined"
            ><span>{{ item.title }}</span><code>{{ item.badge }}</code></component>
          </section>
          <p v-if="!visibleGroups.length" class="directory-empty">No matching cases.</p>
        </div>
      </aside>

      <main ref="mainElement" class="lab-main">
        <div v-if="activeCase" class="mobile-case-context"><span>Case library / <b>{{ activeCase.manifest.title }}</b></span><span>{{ String(activeCaseIndex + 1).padStart(2, '0') }} / {{ implementedItems.length }}</span></div>
        <RouterView />
      </main>
    </div>
  </div>
</template>
