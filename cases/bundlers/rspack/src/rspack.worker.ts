type BuildRequest = {
  entry: string;
  files: Record<string, string>;
};

self.onmessage = async (event: MessageEvent<BuildRequest>) => {
  try {
    const { rspack, builtinMemFs } = await import("@rspack/browser");
    const request = event.data;
    builtinMemFs.volume.reset();
    builtinMemFs.volume.fromJSON(request.files);
    const started = performance.now();
    rspack(
      {
        mode: "development",
        context: "/",
        entry: request.entry,
        output: { path: "/dist", filename: "main.js" },
      },
      (error: Error | null, stats: { hasErrors(): boolean; toString(): string }) => {
        if (error || stats.hasErrors()) {
          self.postMessage({ type: "error", error: error?.message ?? stats.toString() });
          return;
        }
        const files = builtinMemFs.volume.toJSON();
        self.postMessage({
          type: "result",
          output: stats.toString(),
          assetCount: Object.keys(files).filter((file) => file.startsWith("/dist/")).length,
          durationMs: Math.round(performance.now() - started),
        });
      },
    );
  } catch (error) {
    self.postMessage({ type: "error", error: error instanceof Error ? error.message : String(error) });
  }
};
