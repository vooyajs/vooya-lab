<script setup lang="ts">
import type { IdeTreeNode } from "./types";

const props = defineProps<{
  node: IdeTreeNode;
  activePath?: string;
  expandedPaths: Set<string>;
  depth?: number;
}>();

const emit = defineEmits<{
  select: [path: string];
  toggle: [path: string];
}>();
</script>

<template>
  <li :role="node.kind === 'directory' ? 'treeitem' : 'none'" :aria-expanded="node.kind === 'directory' ? expandedPaths.has(node.path) : undefined">
    <button
      v-if="node.kind === 'directory'"
      type="button"
      class="vooya-ide-tree-row vooya-ide-tree-directory"
      :style="{ '--vooya-tree-depth': depth ?? 0 }"
      @click="emit('toggle', node.path)"
    >
      <span class="vooya-ide-tree-chevron" :class="{ expanded: expandedPaths.has(node.path) }" aria-hidden="true"></span>
      <span class="vooya-ide-tree-folder" aria-hidden="true"></span>
      <span>{{ node.name }}</span>
    </button>
    <button
      v-else
      type="button"
      role="treeitem"
      class="vooya-ide-tree-row vooya-ide-tree-file"
      :class="{ active: activePath === node.path }"
      :style="{ '--vooya-tree-depth': depth ?? 0 }"
      :aria-selected="activePath === node.path"
      @click="emit('select', node.path)"
    >
      <span class="vooya-ide-tree-spacer" aria-hidden="true"></span>
      <i :data-language="node.language" aria-hidden="true"></i>
      <span>{{ node.name }}</span>
    </button>

    <ul v-if="node.kind === 'directory' && expandedPaths.has(node.path)" role="group">
      <IdeTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :active-path="activePath"
        :expanded-paths="expandedPaths"
        :depth="(depth ?? 0) + 1"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
      />
    </ul>
  </li>
</template>
