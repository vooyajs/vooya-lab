# @vooya-lab/ide

Shared source and live-case work surfaces for Vooya Lab.

- `VooyaIde` owns the file tree, tabs, CodeMirror surface, and internal scroll.
- `VooyaWorkbench` adds copy, compiler capability, progress, cancellation, and
  diagnostics without pretending a precompiled case can compile.
- `CaseLiveWorkbench` composes Preview and Source into one fixed-height context:
  split on wide screens and explicit tabs when either pane would be cramped.

The Live Workbench accepts slots for case-owned preview/source content. It does
not own a case manifest, route registry, compiler implementation, or runtime
sandbox.

An incubating source workbench for VooyaLab demos and browser experiments.

The package deliberately owns the IDE experience—file navigation, tabs,
read-only and editable modes, and the file update contract—while CodeMirror 6
provides the editor engine. It is private while the API is being exercised by
real Lab cases. If that contract proves reusable, it can later move to a
public package without coupling Vooya itself to a full online IDE.

```vue
<script setup lang="ts">
import { VooyaIde, type IdeFile } from "@vooya-lab/ide";

const files: IdeFile[] = [
  { path: "src/Counter.rs", language: "Rust", content: "// ..." },
];
</script>

<template>
  <VooyaIde title="Example source" :files="files" readonly />
</template>
```

The low-level component emits `update:activePath` when navigation changes and
`update:fileContent` with `(path, content)` after an edit. `VooyaWorkbench`
composes the editor with a toolchain-neutral compiler runner, normalized state,
diagnostics, cancellation, artifact events, and a toolbar action that copies the
currently active file. Precompiled cases pass
`editable=false`, which omits compilation entirely and keeps the source/copy
experience truthful. A surrounding Live Workbench may link to Compiler alpha,
but that link does not change the current case's execution capability.

## Selection and read-only behavior

`readonly` uses CodeMirror's `EditorState.readOnly` capability to reject edit
commands while keeping the content DOM focusable. This is intentional: source
in a precompiled case must still support character-precise pointer selection,
double-click word selection, keyboard extension, multiple selections, scrolling,
and copy. Do not implement read-only mode by disabling pointer events or by
making source a collection of line-sized selection targets.

CodeMirror draws its selection layer behind the text. Active-line styling must
therefore remain translucent; an opaque `.cm-activeLine` background hides the
character-range highlight and makes a correct selection appear line-based. The
status bar reports the primary line/column and selected character count so the
same selection model remains observable in read-only and editable modes.

## Scope

This remains an embedded IDE/work-surface package, not a browser Rust compiler.
It can display and edit a virtual workspace and compose a supplied preview with
a pluggable runner, normalized diagnostics, and build output without hard-coding
one language toolchain or preview lifecycle into the editor component.

Browser Rust compilation is governed separately by
[`docs/browser-compiler.md`](../../docs/browser-compiler.md). The IDE remains a
toolchain-neutral surface; a composition layer supplies real runner,
diagnostics, artifact, and preview contracts.

For Vite-hosted examples, the workbench can enumerate a demo unit at build
time instead of maintaining a second handwritten file list:

```ts
import { enumerateIdeFiles } from "@vooya-lab/ide";

const sources = import.meta.glob("./**/*.{rs,vue,css,ts,json}", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

const files = enumerateIdeFiles(sources, { basePath: "cases/my-demo" });
```
