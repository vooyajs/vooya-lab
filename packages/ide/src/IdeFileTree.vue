<script setup lang="ts">
import { computed, ref, watch } from "vue";
import IdeTreeNodeView from "./IdeTreeNode.vue";
import type { IdeFile, IdeTreeNode } from "./types";

type IdeDirectoryNode = Extract<IdeTreeNode, { kind: "directory" }>;

const props = defineProps<{
  files: IdeFile[];
  activePath?: string;
}>();

const emit = defineEmits<{
  select: [path: string];
}>();

function commonDirectory(files: IdeFile[]) {
  if (!files.length) return [];
  const directories = files.map((file) => file.path.split("/").slice(0, -1));
  const first = directories[0] ?? [];
  return first.filter((segment, index) => directories.every((path) => path[index] === segment));
}

function sortNodes(nodes: IdeTreeNode[]) {
  nodes.sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === "directory" ? -1 : 1;
    return left.name.localeCompare(right.name);
  });
  for (const node of nodes) {
    if (node.kind === "directory") sortNodes(node.children);
  }
  return nodes;
}

function buildTree(files: IdeFile[]): IdeDirectoryNode {
  const base = commonDirectory(files);
  const rootPath = base.join("/") || ".";
  const root: IdeDirectoryNode = {
    kind: "directory",
    name: base.at(-1) ?? "workspace",
    path: rootPath,
    children: [],
  };

  for (const file of files) {
    const segments = file.path.split("/").slice(base.length);
    let directory = root;
    segments.forEach((segment, index) => {
      if (directory.kind !== "directory") return;
      const isFile = index === segments.length - 1;
      const nodePath = [...base, ...segments.slice(0, index + 1)].join("/");
      if (isFile) {
        directory.children.push({ kind: "file", name: segment, path: file.path, language: file.language });
        return;
      }

      let child = directory.children.find((node): node is IdeDirectoryNode => node.kind === "directory" && node.name === segment);
      if (!child) {
        child = { kind: "directory", name: segment, path: nodePath, children: [] };
        directory.children.push(child);
      }
      directory = child;
    });
  }

  sortNodes(root.children);
  return root;
}

function directoryPaths(node: IdeTreeNode): string[] {
  if (node.kind === "file") return [];
  return [node.path, ...node.children.flatMap(directoryPaths)];
}

const tree = computed(() => buildTree(props.files));
const expandedPaths = ref(new Set(directoryPaths(tree.value)));

watch(tree, (value) => {
  const available = new Set(directoryPaths(value));
  expandedPaths.value = new Set([...expandedPaths.value].filter((path) => available.has(path)));
  if (!expandedPaths.value.size) expandedPaths.value = available;
});

function toggle(path: string) {
  const next = new Set(expandedPaths.value);
  if (next.has(path)) next.delete(path);
  else next.add(path);
  expandedPaths.value = next;
}
</script>

<template>
  <aside class="vooya-ide-explorer" aria-label="Files">
    <p><span>EXPLORER</span><b>{{ files.length }} FILES</b></p>
    <ul class="vooya-ide-tree" role="tree" aria-label="Project files">
      <IdeTreeNodeView
        :node="tree"
        :active-path="activePath"
        :expanded-paths="expandedPaths"
        @select="emit('select', $event)"
        @toggle="toggle"
      />
    </ul>
  </aside>
</template>
