<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { basicSetup, EditorView } from "codemirror";
import { EditorState } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { rust } from "@codemirror/lang-rust";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { tags } from "@lezer/highlight";
import IdeFileTree from "./IdeFileTree.vue";
import type { IdeFile } from "./types";
import "./ide.css";

const props = withDefaults(defineProps<{
  files: IdeFile[];
  activePath?: string;
  title?: string;
  readonly?: boolean;
  height?: string;
}>(), {
  activePath: "",
  title: "Source",
  readonly: false,
  height: "560px",
});

const emit = defineEmits<{
  "update:activePath": [path: string];
  "update:fileContent": [path: string, content: string];
}>();

const editorHost = ref<HTMLElement>();
const internalPath = ref(props.activePath || props.files[0]?.path || "");
const activeFile = computed(() => props.files.find((file) => file.path === internalPath.value) ?? props.files[0]);
const openPaths = ref<string[]>(activeFile.value ? [activeFile.value.path] : []);
let editor: EditorView | undefined;
let applyingExternalState = false;

function fileName(path: string) {
  return path.split("/").pop() ?? path;
}

function languageExtension(language: string) {
  const normalized = language.toLowerCase();
  if (normalized === "rust" || normalized === "rs") return rust();
  if (normalized === "css") return css();
  if (normalized === "html" || normalized === "vue") return html();
  if (["typescript", "ts", "tsx"].includes(normalized)) return javascript({ typescript: true, jsx: normalized === "tsx" });
  if (["javascript", "js", "jsx"].includes(normalized)) return javascript({ jsx: normalized === "jsx" });
  return [];
}

const vooyaTheme = EditorView.theme({
  "&": { height: "100%", color: "#c9d1d9", backgroundColor: "#0d1117" },
  ".cm-content": { padding: "16px 0", caretColor: "#7ee787", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "12px", lineHeight: "1.62" },
  ".cm-line": { padding: "0 18px" },
  ".cm-gutters": { color: "#484f58", backgroundColor: "#0d1117", border: "0" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "#161b22" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "#1f6feb55" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#7ee787" },
  ".cm-scroller": { overflow: "auto" },
  "&.cm-focused": { outline: "none" },
}, { dark: true });

const vooyaHighlightStyle = HighlightStyle.define([
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: "#8b949e", fontStyle: "italic" },
  { tag: [tags.keyword, tags.modifier, tags.operatorKeyword], color: "#ff9b96" },
  { tag: [tags.string, tags.special(tags.string)], color: "#a5d6ff" },
  { tag: [tags.number, tags.bool, tags.null], color: "#79c0ff" },
  { tag: [tags.function(tags.variableName), tags.labelName], color: "#d2a8ff" },
  { tag: [tags.typeName, tags.className, tags.namespace], color: "#ffa657" },
  { tag: [tags.propertyName, tags.attributeName], color: "#7ee787" },
  { tag: [tags.tagName, tags.atom], color: "#7ee787" },
  { tag: [tags.variableName, tags.name], color: "#c9d1d9" },
  { tag: [tags.punctuation, tags.operator], color: "#b1bac4" },
  { tag: [tags.meta, tags.annotation], color: "#d2a8ff" },
  { tag: tags.invalid, color: "#ff7b72", textDecoration: "underline" },
]);

function createState(file: IdeFile) {
  return EditorState.create({
    doc: file.content,
    extensions: [
      basicSetup,
      languageExtension(file.language),
      vooyaTheme,
      syntaxHighlighting(vooyaHighlightStyle),
      EditorState.readOnly.of(props.readonly),
      EditorView.editable.of(!props.readonly),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged || applyingExternalState || !activeFile.value) return;
        emit("update:fileContent", activeFile.value.path, update.state.doc.toString());
      }),
    ],
  });
}

function showFile(path: string) {
  const file = props.files.find((item) => item.path === path);
  if (!file) return;
  internalPath.value = path;
  if (!openPaths.value.includes(path)) openPaths.value.push(path);
  emit("update:activePath", path);
  if (editor) editor.setState(createState(file));
}

function closeFile(path: string) {
  const index = openPaths.value.indexOf(path);
  if (index === -1) return;
  openPaths.value.splice(index, 1);
  if (internalPath.value !== path) return;
  const nextPath = openPaths.value[Math.min(index, openPaths.value.length - 1)] ?? props.files[0]?.path;
  if (nextPath) showFile(nextPath);
}

onMounted(() => {
  if (!editorHost.value || !activeFile.value) return;
  editor = new EditorView({ state: createState(activeFile.value), parent: editorHost.value });
});

watch(() => props.activePath, (path) => {
  if (path && path !== internalPath.value) showFile(path);
});

watch(() => props.files, async () => {
  await nextTick();
  const file = activeFile.value;
  if (!file || !editor || editor.state.doc.toString() === file.content) return;
  applyingExternalState = true;
  editor.setState(createState(file));
  applyingExternalState = false;
}, { deep: true });

onBeforeUnmount(() => editor?.destroy());
</script>

<template>
  <section class="vooya-ide" :style="{ '--vooya-ide-height': height }" :data-readonly="readonly">
    <header class="vooya-ide-titlebar">
      <div><span class="vooya-ide-mark">V</span><strong>{{ title }}</strong></div>
      <span>{{ readonly ? "READ ONLY" : "EDITABLE" }}</span>
    </header>
    <div class="vooya-ide-workspace">
      <IdeFileTree :files="files" :active-path="activeFile?.path" @select="showFile" />
      <div class="vooya-ide-editor">
        <div class="vooya-ide-tabs" role="tablist" aria-label="Open files">
          <div v-for="path in openPaths" :key="path" role="tab" tabindex="0" :aria-selected="path === activeFile?.path" :class="{ active: path === activeFile?.path }" @click="showFile(path)" @keydown.enter="showFile(path)" @keydown.space.prevent="showFile(path)">
            <span>{{ fileName(path) }}</span><button type="button" :aria-label="`Close ${fileName(path)}`" @click.stop="closeFile(path)">×</button>
          </div>
        </div>
        <div ref="editorHost" class="vooya-ide-editor-host"></div>
        <footer class="vooya-ide-status"><span>Vooya Lab</span><span>{{ activeFile?.language ?? "text" }} · UTF-8 · LF</span></footer>
      </div>
    </div>
  </section>
</template>
