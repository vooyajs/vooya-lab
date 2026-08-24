# @vooya-lab/ide

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

The current component emits `update:activePath` when navigation changes and
`update:fileContent` with `(path, content)` after an edit.

## Scope

Today this is an embedded IDE shell, not a browser Rust compiler. It can display
and edit a virtual workspace and is already used by browser-side WASM bundler
experiments. A future WASM workbench layer should add pluggable runners,
normalized diagnostics, build output and preview lifecycle without hard-coding
one language toolchain into the editor component.

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
