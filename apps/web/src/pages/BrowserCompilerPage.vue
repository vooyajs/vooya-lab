<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { BrowserBindgenRunner, type BrowserBindgenResult } from "@vooya-lab/bindgen-browser";
import type { ArtifactManifest, CompileRequest, CompilerEvent } from "@vooya-lab/compiler-protocol";
import { BrowserRustcGateOneRunner, probeBrowserCompilerEnvironment, WEBLINGS_DEMO_ASSETS, WEBLINGS_GATE_1_CANDIDATE } from "@vooya-lab/compiler-browser";
import { VooyaWorkbench, type IdeFile } from "@vooya-lab/ide";
import { IsolatedVooyaPreviewHost, type PreviewStage } from "@vooya-lab/preview-host";
import { BrowserGeneratedGlueRunner, BrowserWasmExportRunner } from "@vooya-lab/runtime-module";
import { BrowserWasiCommandRunner, type WasiCommandResult } from "@vooya-lab/runtime-wasi";
import vooyaGlue from "../../../../.vooya/wasm/vooya_app.js?raw";
import vooyaWasmUrl from "../../../../.vooya/wasm/vooya_app_bg.wasm?url";

const unknownSysrootUrl = import.meta.env.VITE_BROWSER_RUSTC_UNKNOWN_SYSROOT_URL as string | undefined;
const unknownSysrootIntegrity = import.meta.env.VITE_BROWSER_RUSTC_UNKNOWN_SYSROOT_INTEGRITY as `sha256-${string}` | undefined;
const localRustcUrl = import.meta.env.VITE_BROWSER_RUSTC_URL as string | undefined;
const localRustcIntegrity = import.meta.env.VITE_BROWSER_RUSTC_INTEGRITY as `sha256-${string}` | undefined;
const dependencyBundleUrl = import.meta.env.VITE_BROWSER_RUSTC_DEPENDENCIES_URL as string | undefined;
const dependencyBundleIntegrity = import.meta.env.VITE_BROWSER_RUSTC_DEPENDENCIES_INTEGRITY as `sha256-${string}` | undefined;
const dependencyProfile = import.meta.env.VITE_BROWSER_RUSTC_DEPENDENCY_PROFILE as "reactive" | "bindgen-numeric" | "vooya-dom" | undefined;
const bindgenToolUrl = import.meta.env.VITE_BROWSER_WASM_BINDGEN_URL as string | undefined;
const bindgenToolIntegrity = import.meta.env.VITE_BROWSER_WASM_BINDGEN_INTEGRITY as `sha256-${string}` | undefined;
const unknownSysrootConfigured = Boolean(unknownSysrootUrl && unknownSysrootIntegrity);
const patchedRustcConfigured = Boolean(localRustcUrl && localRustcIntegrity);
const standardLibraryProbeConfigured = unknownSysrootConfigured && patchedRustcConfigured;
const dependencyProbeConfigured = standardLibraryProbeConfigured && Boolean(dependencyBundleUrl && dependencyBundleIntegrity);
const bindgenProbeConfigured = dependencyProbeConfigured && Boolean(bindgenToolUrl && bindgenToolIntegrity);
const gateTwoDomConfigured = bindgenProbeConfigured && dependencyProfile === "vooya-dom";
const runner = new BrowserRustcGateOneRunner({
  ...WEBLINGS_DEMO_ASSETS,
  rustcUrl: localRustcUrl ?? WEBLINGS_DEMO_ASSETS.rustcUrl,
  rustcIntegrity: localRustcIntegrity ?? WEBLINGS_DEMO_ASSETS.rustcIntegrity,
  unknownSysrootUrl,
  unknownSysrootIntegrity,
  dependencyBundleUrl,
  dependencyBundleIntegrity,
  dependencyProfile,
});
const moduleRunner = new BrowserWasmExportRunner();
const generatedGlueRunner = new BrowserGeneratedGlueRunner();
const wasiRunner = new BrowserWasiCommandRunner();
const bindgenRunner = bindgenProbeConfigured ? new BrowserBindgenRunner({ toolUrl: bindgenToolUrl!, toolIntegrity: bindgenToolIntegrity! }) : undefined;
const environment = probeBrowserCompilerEnvironment();
const compilerTarget = ref<CompileRequest["target"]>("wasm32-wasip1");
const artifact = ref<ArtifactManifest>();
const lastEvent = ref<CompilerEvent>();
const lastElapsedMs = ref<number>();
const previewElement = ref<HTMLElement>();
const previewStage = ref<PreviewStage>("idle");
const previewMessage = ref("No component realm has been created.");
const executionStage = ref<"idle" | "running" | "succeeded" | "failed">("idle");
const executionResult = ref<WasiCommandResult>();
const executionMessage = ref("Compile the edited Rust command to execute its emitted artifact.");
const bindingStage = ref<"idle" | "running" | "succeeded" | "failed">("idle");
const bindingMessage = ref("No browser-side binding transformation has run.");
const bindingResult = ref<BrowserBindgenResult>();
let previewHost: IsolatedVooyaPreviewHost<Record<string, unknown>> | undefined;
let executionGeneration = 0;
const wasiFiles: IdeFile[] = [{
  path: "gate-one/main.rs",
  language: "Rust",
  content: `fn main() {
    let message = "compiled locally by rustc.wasm";
    println!("{message}");
}
`,
}];
const unknownFiles: IdeFile[] = [{
  path: standardLibraryProbeConfigured ? "gate-one/main.rs" : "gate-one/no-core.rs",
  language: "Rust",
  content: gateTwoDomConfigured ? `/// This function is linked into the fixed Vooya DOM component template.
#[unsafe(no_mangle)]
pub extern "C" fn vooya_user_answer(value: i32) -> i32 {
    value + 2
}

/// Keeps the reviewed component scaffold reachable from the final cdylib.
#[unsafe(no_mangle)]
pub extern "C" fn vooya_gate_two_probe() -> i32 {
    vooya_gate_two_dom_scaffold::link();
    vooya_user_answer(40)
}
` : bindgenProbeConfigured ? `#[unsafe(no_mangle)]
pub extern "C" fn vooya_user_answer(value: i32) -> i32 {
    value + 2
}

#[unsafe(no_mangle)]
pub extern "C" fn vooya_gate_two_probe() -> i32 {
    vooya_bindgen_scaffold::link();
    vooya_user_answer(40)
}
` : dependencyProbeConfigured ? `use vooya_core::signal;

#[unsafe(no_mangle)]
pub extern "C" fn vooya_gate_two_answer() -> i32 {
    let total = signal(40_i32);
    total.update(|value| *value += 2);
    total.get()
}
` : standardLibraryProbeConfigured ? `#[unsafe(no_mangle)]
pub extern "C" fn vooya_gate_two_answer() -> i32 {
    let mut values = Vec::from([19_i32, 23_i32]);
    values.push(31);
    values.into_iter().sum()
}
` : `#![feature(no_core, lang_items)]
#![no_core]
#![allow(internal_features)]

#[lang = "pointee_sized"]
pub trait PointeeSized {}
#[lang = "meta_sized"]
pub trait MetaSized: PointeeSized {}
#[lang = "sized"]
pub trait Sized: MetaSized {}

#[unsafe(no_mangle)]
pub extern "C" fn __heap_base() {}
#[unsafe(no_mangle)]
pub extern "C" fn __data_end() {}

#[unsafe(no_mangle)]
pub extern "C" fn vooya_gate_two_answer() -> i32 {
    42
}
`,
}];
const files = computed(() => compilerTarget.value === "wasm32-wasip1" ? wasiFiles : unknownFiles);
const entryPath = computed(() => compilerTarget.value === "wasm32-wasip1" ? "gate-one/main.rs" : unknownFiles[0].path);

onBeforeUnmount(() => {
  runner.dispose();
  moduleRunner.dispose();
  generatedGlueRunner.dispose();
  wasiRunner.dispose();
  bindgenRunner?.dispose();
  void previewHost?.dispose();
});

function handleCompilerEvent(event: CompilerEvent) {
  lastEvent.value = event;
  if (event.type === "state" && event.stage === "preparing") {
    artifact.value = undefined;
    executionGeneration += 1;
    moduleRunner.cancel();
    generatedGlueRunner.cancel();
    wasiRunner.cancel();
    bindgenRunner?.cancel();
    executionResult.value = undefined;
    executionStage.value = "idle";
    executionMessage.value = "Waiting for a new artifact.";
    bindingResult.value = undefined;
    bindingStage.value = "idle";
    bindingMessage.value = "Waiting for a new raw artifact.";
    if (previewHost) {
      void previewHost.dispose();
      previewHost = undefined;
      previewStage.value = "idle";
      previewMessage.value = "The previous artifact realm was destroyed before compiling.";
    }
  }
  if (event.type === "complete") {
    lastElapsedMs.value = event.elapsedMs;
    if (event.stage !== "succeeded") artifact.value = undefined;
  }
}

async function handleArtifact(manifest: ArtifactManifest) {
  artifact.value = manifest;
  const descriptor = manifest.artifacts.find((entry) => entry.role === "wasm");
  if (!descriptor) return;
  const bytes = runner.takeArtifact(manifest.requestId, descriptor.name);
  if (!bytes) {
    executionStage.value = "failed";
    executionMessage.value = "The compiler manifest arrived without its in-memory artifact bytes.";
    return;
  }
  const generation = ++executionGeneration;
  executionStage.value = "running";
  executionMessage.value = manifest.target === "wasm32-wasip1"
    ? "Executing the emitted WASI command in a fresh Worker."
    : "Instantiating the import-free unknown-unknown module in a fresh Worker.";
  try {
    let result: WasiCommandResult;
    let mountedBrowserArtifact = false;
    if (manifest.target === "wasm32-wasip1") {
      result = await wasiRunner.run(bytes);
    } else if (bindgenRunner) {
      bindingStage.value = "running";
      bindingMessage.value = "Running wasm-bindgen-cli-support as a WASI command in a fresh Worker.";
      bindingResult.value = await bindgenRunner.transform(bytes, { outName: "vooya_gate_two" });
      bindingStage.value = "succeeded";
      bindingMessage.value = `Official wasm-bindgen transformation completed in ${bindingResult.value.elapsedMs.toFixed(1)} ms.`;
      if (gateTwoDomConfigured) {
        if (generation !== executionGeneration) return;
        await mountBrowserBuiltArtifact(bindingResult.value);
        mountedBrowserArtifact = true;
        result = {
          exitCode: 0,
          stdout: "Mounted voo_browser_probe from the glue and WASM emitted by this browser request.",
          stderr: "",
          truncated: false,
          elapsedMs: bindingResult.value.elapsedMs,
        };
      } else {
        const glueResult = await generatedGlueRunner.run(
          bindingResult.value.javascript,
          bindingResult.value.wasm,
          "vooya_gate_two_answer",
          [40],
        );
        result = {
          exitCode: 0,
          stdout: `vooya_gate_two_answer(40) = ${glueResult.value}`,
          stderr: "",
          truncated: false,
          elapsedMs: glueResult.elapsedMs,
        };
      }
    } else {
      result = await moduleRunner.run(bytes, "vooya_gate_two_answer").then((moduleResult): WasiCommandResult => ({
        exitCode: 0,
        stdout: `vooya_gate_two_answer() = ${moduleResult.value}`,
        stderr: "",
        truncated: false,
        elapsedMs: moduleResult.elapsedMs,
      }));
    }
    if (generation !== executionGeneration) return;
    executionResult.value = result;
    executionStage.value = result.exitCode === 0 ? "succeeded" : "failed";
    executionMessage.value = result.exitCode === 0
      ? mountedBrowserArtifact
        ? `Browser-emitted component mounted in ${result.elapsedMs.toFixed(1)} ms.`
        : `Artifact executed locally in ${result.elapsedMs.toFixed(1)} ms.`
      : `Artifact exited with code ${result.exitCode}.`;
    try {
      if (mountedBrowserArtifact) return;
      await mountProof({
        status: result.exitCode === 0 ? "success" : "error",
        output: result.stdout || result.stderr || "The artifact completed without output.",
        asset_count: 1,
        duration_ms: Math.max(0, Math.round(result.elapsedMs)),
      });
    } catch (cause) {
      previewStage.value = "failed";
      previewMessage.value = cause instanceof Error ? cause.message : String(cause);
    }
  } catch (cause) {
    if (generation !== executionGeneration) return;
    executionStage.value = "failed";
    executionMessage.value = cause instanceof Error ? cause.message : String(cause);
    if (bindingStage.value === "running") {
      bindingStage.value = "failed";
      bindingMessage.value = executionMessage.value;
    }
  }
}

async function selectTarget(target: CompileRequest["target"]) {
  if (target === compilerTarget.value) return;
  executionGeneration += 1;
  moduleRunner.cancel();
  generatedGlueRunner.cancel();
  wasiRunner.cancel();
  bindgenRunner?.cancel();
  artifact.value = undefined;
  lastEvent.value = undefined;
  lastElapsedMs.value = undefined;
  executionResult.value = undefined;
  executionStage.value = "idle";
  bindingResult.value = undefined;
  bindingStage.value = "idle";
  bindingMessage.value = "No browser-side binding transformation has run.";
  executionMessage.value = target === "wasm32-wasip1"
    ? "Compile the edited Rust command to execute its emitted artifact."
    : bindgenProbeConfigured
      ? gateTwoDomConfigured
        ? "Compile the editable function into the fixed Vooya DOM template, generate bindings, and mount the exact emitted bytes."
        : "Compile ordinary Rust through the fixed scaffold, then run official wasm-bindgen inside the browser."
      : dependencyProbeConfigured
      ? "Compile against the exact-revision Vooya runtime bundle and execute the linked signal path."
      : standardLibraryProbeConfigured
      ? "Compile ordinary Rust with std, allocation, and iterators using the matched browser sysroot."
      : "Compile the no-core probe to verify the unknown-unknown backend and linker.";
  if (previewHost) {
    await previewHost.dispose();
    previewHost = undefined;
    previewStage.value = "idle";
    previewMessage.value = "No component realm has been created.";
  }
  compilerTarget.value = target;
}

function createPreviewHost() {
  if (!previewElement.value) throw new Error("Preview surface is unavailable");
  previewHost = new IsolatedVooyaPreviewHost(previewElement.value, {
    onEvent(event) {
      previewStage.value = event.stage;
      previewMessage.value = event.message;
    },
  });
  return previewHost;
}

async function mountProof(props: Record<string, unknown>) {
  const host = previewHost?.stage === "disposed" || !previewHost ? createPreviewHost() : previewHost;
  const response = await fetch(vooyaWasmUrl);
  if (!response.ok) throw new Error(`Could not load the repository-built Vooya artifact: HTTP ${response.status}`);
  await host.mount({
    javascript: vooyaGlue,
    wasm: new Uint8Array(await response.arrayBuffer()),
    contract: {
      abiVersion: 1,
      mount: "voo_rspack_summary_mount",
      update: "voo_rspack_summary_update_props",
      dispose: "voo_rspack_summary_dispose",
    },
    props,
    css: `body{font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;background:#071017;color:#d7e2e7;padding:18px;box-sizing:border-box}.summary-card{border:1px solid #29424e;border-radius:16px;padding:18px;background:linear-gradient(135deg,#0c1b23,#091319)}h3{margin:0 0 10px;color:#76e3ba}p{margin:0;color:#9eb1ba}`,
  });
}

async function mountBrowserBuiltArtifact(result: BrowserBindgenResult) {
  const host = previewHost?.stage === "disposed" || !previewHost ? createPreviewHost() : previewHost;
  await host.mount({
    javascript: result.javascript,
    wasm: result.wasm,
    contract: {
      abiVersion: 1,
      mount: "voo_browser_probe_mount",
      update: "voo_browser_probe_update_props",
      dispose: "voo_browser_probe_dispose",
    },
    props: { seed: 40 },
    css: `body{font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;background:#071017;color:#d7e2e7;padding:18px;box-sizing:border-box}.browser-built-vooya{border:1px solid #3b6b61;border-radius:16px;padding:18px;background:radial-gradient(circle at 85% 0%,rgba(118,227,186,.16),transparent 42%),linear-gradient(135deg,#0c1b23,#091319)}.browser-built-vooya p{margin:0 0 10px;color:#9eb1ba}.browser-built-vooya strong{font-size:24px;color:#76e3ba}`,
  });
}

async function mountPrecompiledProof() {
  try {
    await mountProof({
      status: "isolated",
      output: "The current repository-built Vooya artifact is mounted through the same raw glue + WASM boundary a future browser compile must produce.",
      asset_count: 1,
      duration_ms: 0,
    });
  } catch (cause) {
    previewStage.value = "failed";
    previewMessage.value = cause instanceof Error ? cause.message : String(cause);
  }
}

async function resetPreview() {
  try {
    await previewHost?.reset();
  } catch (cause) {
    previewStage.value = "failed";
    previewMessage.value = cause instanceof Error ? cause.message : String(cause);
  }
}

async function disposePreview() {
  await previewHost?.dispose();
}
</script>

<template>
  <article class="compiler-gate-page">
    <header>
      <span>HIDDEN TOOLCHAIN EXPERIMENT · GATES 1–2</span>
      <h1>Rustc, <em>inside the browser.</em></h1>
      <p>This route compiles changed Rust source with a real WASM-hosted rustc in a dedicated Worker. It does not call a remote compiler. The WASI path proves executable Rust; the unknown-target path uses ordinary <code>std</code> when the exact compiler and sysroot pair is configured, and otherwise stays an explicit no-core probe.</p>
    </header>

    <section class="compiler-inventory">
      <div><span>CANDIDATE</span><b>{{ patchedRustcConfigured ? 'vooya-patched-rustc' : WEBLINGS_GATE_1_CANDIDATE.id }}</b><small>{{ patchedRustcConfigured ? 'abc48c0b8aba' : WEBLINGS_GATE_1_CANDIDATE.commit.slice(0, 12) }} · SHA-256 assets</small></div>
      <div><span>DECODED</span><b>{{ gateTwoDomConfigured ? '~241 MB' : patchedRustcConfigured ? '~214 MB' : '~159 MB' }}</b><small>{{ gateTwoDomConfigured ? 'compiler + sysroot + 23.7 MB DOM profile + 3.1 MB bindgen' : patchedRustcConfigured ? '129.2 MB compiler + 84.8 MB unknown sysroot' : '87.9 MB compiler + 71.3 MB WASI sysroot' }}</small></div>
      <div><span>TARGET</span><b>{{ compilerTarget }}</b><small>{{ compilerTarget === 'wasm32-unknown-unknown' && gateTwoDomConfigured ? 'Vooya DOM scaffold + browser wasm-bindgen' : compilerTarget === 'wasm32-unknown-unknown' && bindgenProbeConfigured ? 'fixed numeric scaffold + browser wasm-bindgen' : compilerTarget === 'wasm32-unknown-unknown' && dependencyProbeConfigured ? 'std + Vooya reactive profile · patched linker' : compilerTarget === 'wasm32-unknown-unknown' && standardLibraryProbeConfigured ? 'matched std sysroot · patched linker' : compilerTarget === 'wasm32-unknown-unknown' && unknownSysrootConfigured ? 'matched sysroot · probe linker' : 'Vooya Gate 2 remains open' }}</small></div>
      <div><span>WORKER</span><b>{{ environment.moduleWorkers.available ? 'available' : 'unavailable' }}</b><small>cancel = terminate Worker</small></div>
    </section>

    <section class="compiler-consent">
      <strong>Large one-time experiment</strong>
      <p>The toolchain starts downloading only after you press Compile &amp; run Rust. Every executable toolchain asset is Fetch-SRI pinned; production still requires immutable Vooya-owned hosting, provenance, and rollback metadata.</p>
    </section>

    <section class="compiler-target-switch" aria-label="Browser compiler target">
      <div><span>TOOLCHAIN PROBE</span><strong>{{ compilerTarget === 'wasm32-wasip1' ? 'Executable command' : gateTwoDomConfigured ? 'Browser-built Vooya DOM' : bindgenProbeConfigured ? 'Fixed binding scaffold' : 'Import-free library' }}</strong></div>
      <button type="button" :aria-pressed="compilerTarget === 'wasm32-wasip1'" @click="selectTarget('wasm32-wasip1')">WASI command · Gate 1.5</button>
      <button type="button" :aria-pressed="compilerTarget === 'wasm32-unknown-unknown'" @click="selectTarget('wasm32-unknown-unknown')">Unknown target · {{ gateTwoDomConfigured ? 'Gate 2 controlled' : bindgenProbeConfigured ? 'Gate 1.97' : dependencyProbeConfigured ? 'Gate 1.95' : standardLibraryProbeConfigured ? 'Gate 1.9' : 'Gate 1.75' }}</button>
    </section>

    <VooyaWorkbench
      :key="compilerTarget"
      :title="compilerTarget === 'wasm32-wasip1' ? 'Browser rustc Gate 1' : gateTwoDomConfigured ? 'Constrained Vooya DOM template' : bindgenProbeConfigured ? 'Constrained binding scaffold' : dependencyProbeConfigured ? 'Vooya reactive profile' : standardLibraryProbeConfigured ? 'Unknown-target std probe' : 'Unknown-target no-core probe'"
      :files="files"
      :entry-path="entryPath"
      editable
      execution-mode="browser-compiler"
      :target="compilerTarget"
      action-label="Compile &amp; run Rust"
      :runner="runner"
      height="480px"
      @artifact="handleArtifact"
      @event="handleCompilerEvent"
    />

    <section class="compiler-artifact" :data-ready="Boolean(artifact)">
      <span>ARTIFACT MANIFEST</span>
      <template v-if="artifact">
        <strong>{{ artifact.artifacts[0]?.name }} · {{ artifact.artifacts[0]?.byteLength.toLocaleString() }} bytes</strong>
        <code>sha256 {{ artifact.artifacts[0]?.sha256 }}</code>
        <p>Validated as a genuine WebAssembly module{{ lastElapsedMs ? ` in ${(lastElapsedMs / 1000).toFixed(2)} seconds` : '' }}. This artifact stays in memory and is discarded with the experiment.</p>
      </template>
      <template v-else>
        <strong>{{ lastEvent?.type === 'state' ? lastEvent.message : 'No artifact emitted yet.' }}</strong>
        <p>Edit the source before compiling to verify this is not a lookup of a known prebuilt output.</p>
      </template>
    </section>

    <section class="compiler-runtime-result" :data-stage="executionStage">
      <div><span>{{ compilerTarget === 'wasm32-wasip1' ? 'DYNAMIC ARTIFACT EXECUTION · GATE 1.5' : `UNKNOWN-UNKNOWN MODULE EXECUTION · ${gateTwoDomConfigured ? 'GATE 2 CONTROLLED' : bindgenProbeConfigured ? 'GATE 1.97' : dependencyProbeConfigured ? 'GATE 1.95' : standardLibraryProbeConfigured ? 'GATE 1.9' : 'GATE 1.75'}` }}</span><code>{{ executionStage }}</code></div>
      <strong>{{ executionMessage }}</strong>
      <pre v-if="executionResult">{{ executionResult.stdout || executionResult.stderr || '(no output)' }}</pre>
      <footer v-if="executionResult"><span>exit {{ executionResult.exitCode }}</span><span>{{ executionResult.elapsedMs.toFixed(1) }} ms</span><span>{{ executionResult.truncated ? 'output truncated' : 'complete output' }}</span></footer>
    </section>

    <section v-if="bindgenProbeConfigured && compilerTarget === 'wasm32-unknown-unknown'" class="compiler-runtime-result" :data-stage="bindingStage">
      <div><span>OFFICIAL WASM-BINDGEN · {{ gateTwoDomConfigured ? 'GATE 2 CONTROLLED' : 'GATE 1.97' }}</span><code>{{ bindingStage }}</code></div>
      <strong>{{ bindingMessage }}</strong>
      <pre v-if="bindingResult">JavaScript glue: {{ bindingResult.javascript.length.toLocaleString() }} UTF-16 code units
Transformed WASM: {{ bindingResult.wasm.byteLength.toLocaleString() }} bytes</pre>
      <footer v-if="bindingResult"><span>wasm-bindgen 0.2.115</span><span>{{ bindingResult.elapsedMs.toFixed(1) }} ms</span><span>fresh WASI Worker</span></footer>
    </section>

    <section class="compiler-preview-gate">
      <header>
        <div><span>PREVIEW HOST · GATE 2 INFRASTRUCTURE</span><h2>Destroy the realm, not just the DOM.</h2></div>
        <code :data-stage="previewStage">{{ previewStage }}</code>
      </header>
      <p v-if="gateTwoDomConfigured">For the unknown-target candidate, this frame imports and mounts the JavaScript glue and WASM emitted by the current browser request. A new compile destroys the previous realm before rustc starts.</p>
      <p v-else>This frame is still a repository-built Vooya result presenter. Gate 1.97 runs the browser-emitted function through its generated glue, then passes only that result into this precompiled shell; it does not claim the browser compiler produced the visible component.</p>
      <div class="compiler-preview-actions">
        <button v-if="!gateTwoDomConfigured" type="button" @click="mountPrecompiledProof()">Mount precompiled proof</button>
        <button type="button" :disabled="previewStage !== 'mounted'" @click="resetPreview">Reset realm</button>
        <button type="button" :disabled="previewStage === 'idle' || previewStage === 'disposed'" @click="disposePreview">Dispose realm</button>
        <small>{{ previewMessage }}</small>
      </div>
      <div ref="previewElement" class="compiler-preview-surface" :data-stage="previewStage"></div>
      <footer><span>Sandbox: scripts only</span><span>Network: blocked by CSP</span><span>Reset: iframe replacement</span></footer>
    </section>
  </article>
</template>
