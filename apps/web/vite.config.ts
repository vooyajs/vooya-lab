import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { vooya } from "@vooya/vite";
import { defineConfig } from "vite";

const labRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  // Use the lab root as the Vite application root so every case remains inside
  // the same Vooya source-authoring boundary.
  root: labRoot,
  base: process.env.VOOYA_BASE ?? "/",
  plugins: [
    vue(),
    vooya({
      rust: {
        entry: "cases/lib.rs",
        sourceRoot: "cases",
        dependencies: {
          rstar: "0.12.2",
          regex: "=1.12.2",
        },
        webSysFeatures: ["CanvasRenderingContext2d", "DomRect", "HtmlCanvasElement", "MouseEvent", "Performance"],
      },
    }),
  ],
  resolve: {
    alias: [
      { find: /^@vooya-lab\/ide$/, replacement: fileURLToPath(new URL("../../packages/ide/src/index.ts", import.meta.url)) },
      { find: /^@vooya-lab\/case-schema$/, replacement: fileURLToPath(new URL("../../packages/case-schema/src/index.ts", import.meta.url)) },
      { find: /^@vooya-lab\/compiler-protocol$/, replacement: fileURLToPath(new URL("../../packages/compiler-protocol/src/index.ts", import.meta.url)) },
      { find: /^@vooya-lab\/compiler-browser$/, replacement: fileURLToPath(new URL("../../packages/compiler-browser/src/index.ts", import.meta.url)) },
      { find: /^@vooya-lab\/preview-host$/, replacement: fileURLToPath(new URL("../../packages/preview-host/src/index.ts", import.meta.url)) },
      { find: /^@vooya-lab\/runtime-module$/, replacement: fileURLToPath(new URL("../../packages/runtime-module/src/index.ts", import.meta.url)) },
      { find: /^@vooya-lab\/runtime-wasi$/, replacement: fileURLToPath(new URL("../../packages/runtime-wasi/src/index.ts", import.meta.url)) },
      { find: "@lab-cases", replacement: fileURLToPath(new URL("../../cases", import.meta.url)) },
      { find: "@lab-web", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
      { find: /^vue$/, replacement: fileURLToPath(new URL("./node_modules/vue/dist/vue.runtime.esm-bundler.js", import.meta.url)) },
      { find: /^vue-router$/, replacement: fileURLToPath(new URL("./node_modules/vue-router/dist/vue-router.mjs", import.meta.url)) },
      // Exact runtime matching prevents the broader @vooya/vite alias from
      // turning @vooya/vite/runtime into a non-existent filesystem path.
      { find: /^@vooya\/vite\/runtime$/, replacement: fileURLToPath(new URL("./node_modules/@vooya/vite/dist/runtime.js", import.meta.url)) },
      { find: /^@vooya\/vue$/, replacement: fileURLToPath(new URL("./node_modules/@vooya/vue", import.meta.url)) },
      { find: /^@vooya\/vite$/, replacement: fileURLToPath(new URL("./node_modules/@vooya/vite", import.meta.url)) },
      { find: /^@rolldown\/browser$/, replacement: fileURLToPath(new URL("./node_modules/@rolldown/browser/dist/index.browser.mjs", import.meta.url)) },
      { find: /^@rspack\/browser$/, replacement: fileURLToPath(new URL("./node_modules/@rspack/browser", import.meta.url)) },
      { find: /^node:path$/, replacement: "path-browserify" },
      { find: /^node:process$/, replacement: fileURLToPath(new URL("./src/shims/process.ts", import.meta.url)) },
    ],
  },
  // Both browser bundlers are entered through Workers. Pre-bundle them at
  // server startup so their first user action cannot trigger a Vite dependency
  // optimization reload and erase the in-flight case state.
  optimizeDeps: {
    include: ["@rolldown/browser", "@rspack/browser"],
    // This dependency is consumed only from lazy Workers. Optimizing it on the
    // first compile/run action forces a full-page reload and destroys the
    // in-flight compiler lifecycle; let the Worker pipeline transform it.
    exclude: ["@bjorn3/browser_wasi_shim"],
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    // Vooya writes its generated Rust/WASM bindings into .vooya during the
    // build. Watching those outputs creates a compile -> HMR -> compile loop
    // in dev; source files remain watched and the plugin still sends the
    // single reload after a successful Rust build.
    watch: {
      ignored: ["**/.vooya/**", "**/.wrangler/**"],
    },
  },
  preview: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  worker: {
    format: "es",
  },
});
