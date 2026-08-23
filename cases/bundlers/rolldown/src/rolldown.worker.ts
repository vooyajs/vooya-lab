type BuildRequest = {
  entry: string;
  files: Record<string, string>;
};

self.onmessage = async (event: MessageEvent<BuildRequest>) => {
  try {
    // @rolldown/browser 1.2.x still references process.nextTick in a shared
    // watcher helper even for one-shot builds. The browser worker supplies the
    // minimal scheduler it expects; no Node runtime is introduced.
    const workerGlobal = globalThis as typeof globalThis & { process?: { nextTick: (callback: () => void) => void; cwd: () => string } };
    workerGlobal.process ??= { nextTick: (callback) => queueMicrotask(callback), cwd: () => "/" };
    const { rolldown } = await import("@rolldown/browser");
    const request = event.data;
    const started = performance.now();
    const bundle = await rolldown({
      input: request.entry,
      plugins: [
        {
          name: "vooya-lab-virtual-files",
          resolveId(id: string) {
            return id in request.files ? id : null;
          },
          load(id: string) {
            return request.files[id] ?? null;
          },
        },
      ],
    });
    const generated = await bundle.generate({ format: "es" });
    self.postMessage({
      type: "result",
      output: generated.output.map((item) => item.type === "asset" ? item.fileName : item.code).join("\n"),
      assetCount: generated.output.length,
      durationMs: Math.round(performance.now() - started),
    });
  } catch (error) {
    self.postMessage({ type: "error", error: error instanceof Error ? error.message : String(error) });
  }
};
