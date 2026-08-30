export type PreviewStage = "idle" | "loading" | "mounted" | "updating" | "failed" | "disposed";

export type VooyaComponentContract = {
  abiVersion: number;
  abiExport?: string;
  mount: string;
  update?: string;
  dispose: string;
};

export type VooyaArtifactBundle<Props = unknown> = {
  javascript: string;
  wasm: Uint8Array;
  contract: VooyaComponentContract;
  props: Props;
  css?: string;
};

export type PreviewHostEvent = {
  stage: PreviewStage;
  message: string;
  error?: Error;
};

type FrameResponse = {
  channel: string;
  type: "ready" | "mounted" | "updated" | "disposed" | "error";
  commandId?: number;
  message?: string;
};

type PendingCommand = {
  resolve: () => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

const FRAME_DOCUMENT = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval' blob:; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; font-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style id="vooya-artifact-style">html,body{margin:0;min-height:100%;background:transparent;color:inherit}#vooya-preview-root{min-height:100%}</style>
  </head>
  <body>
    <div id="vooya-preview-root"></div>
    <script type="module">
      const channel = window.name;
      const root = document.getElementById("vooya-preview-root");
      const style = document.getElementById("vooya-artifact-style");
      let bindings;
      let contract;
      let handle;
      let moduleUrl;

      const respond = (type, commandId, message) => parent.postMessage({ channel, type, commandId, message }, "*");
      const fail = (commandId, cause) => respond("error", commandId, cause instanceof Error ? cause.message : String(cause));
      const releaseHandle = () => {
        if (handle === undefined || !bindings || !contract) return;
        try { bindings[contract.dispose](handle); } finally { handle = undefined; root.replaceChildren(); }
      };

      addEventListener("message", async (event) => {
        const message = event.data;
        if (!message || message.channel !== channel) return;
        try {
          if (message.type === "mount") {
            releaseHandle();
            if (moduleUrl) URL.revokeObjectURL(moduleUrl);
            style.textContent += "\\n" + (message.css || "");
            contract = message.contract;
            moduleUrl = URL.createObjectURL(new Blob([message.javascript], { type: "text/javascript" }));
            bindings = await import(moduleUrl);
            if (typeof bindings.default !== "function") throw new Error("Artifact glue has no default wasm-bindgen initializer");
            await bindings.default({ module_or_path: new Uint8Array(message.wasm) });
            const abiName = contract.abiExport || "voo_abi_version";
            if (typeof bindings[abiName] !== "function") throw new Error("Artifact is missing " + abiName);
            const actualAbi = bindings[abiName]();
            if (actualAbi !== contract.abiVersion) throw new Error("Vooya ABI mismatch: expected " + contract.abiVersion + ", received " + actualAbi);
            if (typeof bindings[contract.mount] !== "function" || typeof bindings[contract.dispose] !== "function") throw new Error("Artifact component exports do not match the declared contract");
            handle = bindings[contract.mount](root, message.props);
            respond("mounted", message.commandId);
          } else if (message.type === "update") {
            if (handle === undefined) throw new Error("No artifact component is mounted");
            if (!contract.update || typeof bindings[contract.update] !== "function") throw new Error("Artifact component does not support prop updates");
            bindings[contract.update](handle, message.props);
            respond("updated", message.commandId);
          } else if (message.type === "dispose") {
            releaseHandle();
            if (moduleUrl) URL.revokeObjectURL(moduleUrl);
            moduleUrl = undefined;
            bindings = undefined;
            contract = undefined;
            respond("disposed", message.commandId);
          }
        } catch (cause) {
          fail(message.commandId, cause);
        }
      });

      respond("ready");
    </script>
  </body>
</html>`;

export class IsolatedVooyaPreviewHost<Props = unknown> {
  readonly element: HTMLElement;
  readonly onEvent?: (event: PreviewHostEvent) => void;
  #stage: PreviewStage = "idle";
  #frame?: HTMLIFrameElement;
  #channel = "";
  #commandId = 0;
  #pending = new Map<number, PendingCommand>();
  #ready?: { resolve: () => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> };
  #bundle?: VooyaArtifactBundle<Props>;
  #disposed = false;

  constructor(element: HTMLElement, options: { onEvent?: (event: PreviewHostEvent) => void } = {}) {
    this.element = element;
    this.onEvent = options.onEvent;
  }

  get stage() {
    return this.#stage;
  }

  async mount(bundle: VooyaArtifactBundle<Props>) {
    this.#assertActive();
    try {
      await this.#releaseRealm("idle");
      this.#bundle = { ...bundle, wasm: bundle.wasm.slice() };
      this.#setStage("loading", "Creating an isolated preview realm");
      const frame = document.createElement("iframe");
      this.#frame = frame;
      this.#channel = `vooya-preview-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
      frame.name = this.#channel;
      frame.title = "Vooya artifact preview";
      frame.setAttribute("sandbox", "allow-scripts");
      frame.setAttribute("referrerpolicy", "no-referrer");
      frame.srcdoc = FRAME_DOCUMENT;
      frame.dataset.vooyaPreview = "isolated";
      window.addEventListener("message", this.#handleMessage);
      this.element.replaceChildren(frame);
      await this.#waitUntilReady();
      const wasm = bundle.wasm.slice().buffer;
      await this.#send("mount", {
        javascript: bundle.javascript,
        wasm,
        contract: bundle.contract,
        props: bundle.props,
        css: bundle.css ?? "",
      }, [wasm]);
      this.#setStage("mounted", "Vooya artifact mounted in the isolated preview realm");
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      await this.#releaseRealm("idle");
      this.#setFailure(error);
      throw error;
    }
  }

  async update(props: Props) {
    this.#assertActive();
    if (!this.#bundle || this.#stage !== "mounted") throw new Error("No Vooya artifact is mounted");
    try {
      this.#setStage("updating", "Updating preview props");
      await this.#send("update", { props });
      this.#bundle = { ...this.#bundle, props };
      this.#setStage("mounted", "Preview props updated");
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.#setFailure(error);
      throw error;
    }
  }

  async reset() {
    this.#assertActive();
    if (!this.#bundle) throw new Error("No Vooya artifact has been mounted");
    const bundle = this.#bundle;
    await this.#releaseRealm("idle");
    await this.mount(bundle);
  }

  async dispose() {
    if (this.#disposed) return;
    await this.#releaseRealm("disposed");
    this.#disposed = true;
    this.#bundle = undefined;
    this.#setStage("disposed", "Preview realm disposed");
  }

  async #releaseRealm(next: "idle" | "disposed") {
    const frame = this.#frame;
    if (frame?.contentWindow && (this.#stage === "mounted" || this.#stage === "updating")) {
      try {
        await this.#send("dispose", {}, [], 500);
      } catch {
        // Removing the sandboxed realm remains the deterministic fallback.
      }
    }
    this.#rejectPending(new Error("Preview realm was replaced"));
    window.removeEventListener("message", this.#handleMessage);
    frame?.remove();
    this.element.replaceChildren();
    this.#frame = undefined;
    this.#channel = "";
    this.#stage = next;
  }

  #waitUntilReady(timeoutMs = 3000) {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#ready = undefined;
        reject(new Error("Preview iframe did not become ready"));
      }, timeoutMs);
      this.#ready = { resolve, reject, timeout };
    });
  }

  #send(type: string, payload: Record<string, unknown>, transfer: Transferable[] = [], timeoutMs = 5000) {
    const target = this.#frame?.contentWindow;
    if (!target) return Promise.reject(new Error("Preview iframe is unavailable"));
    const commandId = ++this.#commandId;
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#pending.delete(commandId);
        reject(new Error(`Preview command ${type} timed out`));
      }, timeoutMs);
      this.#pending.set(commandId, { resolve, reject, timeout });
      target.postMessage({ channel: this.#channel, type, commandId, ...payload }, "*", transfer);
    });
  }

  #handleMessage = (event: MessageEvent<FrameResponse>) => {
    if (event.source !== this.#frame?.contentWindow || event.data?.channel !== this.#channel) return;
    if (event.data.type === "ready") {
      const ready = this.#ready;
      if (!ready) return;
      clearTimeout(ready.timeout);
      this.#ready = undefined;
      ready.resolve();
      return;
    }
    const commandId = event.data.commandId;
    if (!commandId) return;
    const pending = this.#pending.get(commandId);
    if (!pending) return;
    clearTimeout(pending.timeout);
    this.#pending.delete(commandId);
    if (event.data.type === "error") pending.reject(new Error(event.data.message || "Preview artifact failed"));
    else pending.resolve();
  };

  #rejectPending(error: Error) {
    if (this.#ready) {
      clearTimeout(this.#ready.timeout);
      this.#ready.reject(error);
      this.#ready = undefined;
    }
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.#pending.clear();
  }

  #setStage(stage: PreviewStage, message: string) {
    this.#stage = stage;
    this.onEvent?.({ stage, message });
  }

  #setFailure(error: Error) {
    this.#stage = "failed";
    this.onEvent?.({ stage: "failed", message: error.message, error });
  }

  #assertActive() {
    if (this.#disposed) throw new Error("Preview host has been disposed");
  }
}
