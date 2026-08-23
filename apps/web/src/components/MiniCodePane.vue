<script setup lang="ts">
import { computed } from "vue";

export type CodeFile = {
  path: string;
  language: string;
  content: string;
};

const props = withDefaults(defineProps<{
  title: string;
  files: CodeFile[];
  activePath: string;
  readonly?: boolean;
  emptyMessage?: string;
}>(), {
  readonly: false,
  emptyMessage: "Nothing to show yet.",
});

const emit = defineEmits<{
  "update:activePath": [path: string];
  "update:fileContent": [path: string, content: string];
}>();

const activeFile = computed(() => props.files.find((file) => file.path === props.activePath) ?? props.files[0]);

function selectFile(path: string) {
  emit("update:activePath", path);
}

function updateContent(event: Event) {
  if (!activeFile.value) return;
  emit("update:fileContent", activeFile.value.path, (event.target as HTMLTextAreaElement).value);
}
</script>

<template>
  <section class="mini-ide" :data-readonly="readonly">
    <header class="mini-ide-header">
      <div>
        <p class="section-kicker">{{ readonly ? "EMITTED RESULT" : "EDITABLE SOURCE" }}</p>
        <h3>{{ title }}</h3>
      </div>
      <span class="mini-ide-count">{{ files.length }} {{ files.length === 1 ? "file" : "files" }}</span>
    </header>

    <div v-if="files.length" class="mini-ide-tabs" role="tablist" :aria-label="`${title} files`">
      <button
        v-for="file in files"
        :key="file.path"
        class="mini-ide-tab"
        :class="{ active: activeFile?.path === file.path }"
        type="button"
        role="tab"
        :aria-selected="activeFile?.path === file.path"
        @click="selectFile(file.path)"
      >
        <span class="file-dot" :data-language="file.language"></span>
        {{ file.path }}
      </button>
    </div>

    <div class="mini-ide-body">
      <template v-if="activeFile">
        <textarea
          v-if="!readonly"
          class="mini-ide-textarea"
          :value="activeFile.content"
          :aria-label="`${activeFile.path} source`"
          spellcheck="false"
          @input="updateContent"
        />
        <pre v-else class="mini-ide-output" :aria-label="`${activeFile.path} output`">{{ activeFile.content }}</pre>
      </template>
      <p v-else class="mini-ide-empty">{{ emptyMessage }}</p>
    </div>

    <footer class="mini-ide-footer">
      <span>{{ activeFile?.language ?? "text" }}</span>
      <span v-if="readonly">read-only</span>
      <span v-else>in-memory file</span>
    </footer>
  </section>
</template>
