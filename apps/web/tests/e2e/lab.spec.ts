import { expect, test } from "@playwright/test";

test("home page presents the generated case library and portfolio", async ({ page }) => {
  await page.goto("/#/");
  await expect(page.getByRole("heading", { name: /See the effect.*Understand the boundary/ })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Case directory" })).toBeVisible();
  const scatterCard = page.getByRole("link", { name: /R-tree scatter explorer/ }).last();
  await expect(scatterCard).toHaveAttribute("href", "#/cases/examples/scatter-plot");
  await expect(scatterCard.getByText("RUST / WASM · LIVE")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Log Atlas" }).first()).toBeVisible();
  await expect(page.getByText("Browser compiler: controlled Gate 2")).toBeVisible();
});

test("a cold case route renders a stable preview loader before its module arrives", async ({ page }) => {
  let releaseModule!: () => void;
  const moduleGate = new Promise<void>((resolve) => { releaseModule = resolve; });
  await page.route("**/cases/state/workflow-replay/DemoPage.vue*", async (route) => {
    await moduleGate;
    await route.continue();
  });

  await page.goto("/#/cases/state/workflow-replay");
  const loadingPreview = page.getByRole("status", { name: "Case preview loading" });
  await expect(loadingPreview).toBeVisible();
  await expect(page.locator(".case-route-pending")).toHaveAttribute("aria-busy", "true");
  await expect(loadingPreview).toContainText("Preparing the interactive preview");
  const workbenchHeight = await page.locator(".case-route-loading-workbench").evaluate((element) => element.getBoundingClientRect().height);
  expect(workbenchHeight).toBeGreaterThan(600);

  releaseModule();
  await expect(loadingPreview).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Interactive approval workflow replay" })).toBeVisible();
});

test("case directory filters, collapses, and expands without replacing the page", async ({ page }) => {
  await page.goto("/#/");
  const directory = page.locator(".case-directory");
  await page.getByRole("button", { name: "DAT", exact: true }).click();
  await expect(directory.getByText("Log Atlas")).toBeVisible();
  await expect(directory.getByText("Mesh Clinic")).toHaveCount(0);
  await directory.getByRole("searchbox", { name: "Search cases" }).fill("workflow");
  await expect(directory.getByText("Workflow Replay")).toBeVisible();
  await expect(directory.getByText("Log Atlas")).toHaveCount(0);
  await directory.getByRole("button", { name: "Collapse case directory" }).click();
  await expect(page.getByRole("button", { name: "Expand case directory" })).toBeVisible();
  await expect(directory).toHaveAttribute("aria-hidden", "true");
  await page.getByRole("button", { name: "Expand case directory" }).click();
  await expect(directory).toHaveAttribute("aria-hidden", "false");
});

test("the shell keeps window fixed while content and active navigation scroll independently", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 420 });
  await page.goto("/#/cases/examples/scatter-plot");
  await expect(page.getByRole("heading", { name: /R-tree scatter/ })).toBeVisible();

  const main = page.locator(".lab-main");
  const directoryGroups = page.locator(".directory-groups");
  await expect(main).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(420);
  expect(await page.evaluate(() => document.body.scrollHeight)).toBe(420);

  const mainMetrics = await main.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(mainMetrics.scrollHeight).toBeGreaterThan(mainMetrics.clientHeight);
  await main.hover({ position: { x: 500, y: 250 } });
  await page.mouse.wheel(0, 800);
  await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await directoryGroups.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.evaluate(() => { window.location.hash = "#/cases/data/log-atlas"; });
  const activeDirectoryCase = page.locator('.directory-case[aria-current="page"]');
  await expect(activeDirectoryCase).toContainText("Log Atlas");
  await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBe(0);
  await expect.poll(async () => activeDirectoryCase.evaluate((active) => {
    const scroller = active.closest(".directory-groups");
    if (!scroller) return false;
    const activeRect = active.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    return activeRect.top >= scrollerRect.top && activeRect.bottom <= scrollerRect.bottom;
  })).toBe(true);
});

test("Gallery exposes the capability-labelled compiler alpha without promoting bundler experiments", async ({ page }) => {
  await page.goto("/#/");
  await expect(page.getByRole("heading", { name: "Rspack in the Browser" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Experiments", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Compiler/ })).toHaveAttribute("href", "#/experiments/browser-compiler");
  await page.goto("/#/bundlers/rspack");
  await expect(page.getByRole("heading", { name: "Rspack Browser" })).toBeVisible();
  await page.getByRole("link", { name: "Cases", exact: true }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { name: /See the effect/ })).toBeVisible();

  await page.goto("/#/experiments/browser-compiler");
  await expect(page.getByRole("heading", { name: /Rustc.*inside the browser/ })).toBeVisible();
  const previewPane = page.getByRole("region", { name: "Preview pane" });
  const previewStage = page.locator(".compiler-preview-stage");
  const previewHeight = await previewStage.evaluate((element) => element.getBoundingClientRect().height);
  await page.getByRole("button", { name: "SOURCE", exact: true }).click();
  const compilerSource = page.locator('.vooya-ide[data-readonly="false"] .cm-content');
  await compilerSource.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n// edited in the browser");
  await expect(compilerSource).toContainText("edited in the browser");
  await expect(previewPane).toBeHidden();
  await page.getByRole("button", { name: "Compile & run Rust" }).click();
  await expect(previewPane).toBeVisible();
  const previewLoading = page.getByRole("status", { name: "Browser build in progress" });
  await expect(previewLoading).toBeVisible();
  await expect(page.locator(".compiler-preview-stage")).toHaveAttribute("aria-busy", "true");
  await expect.poll(() => previewStage.evaluate((element) => element.getBoundingClientRect().height)).toBe(previewHeight);
  await expect(previewLoading.getByText(/LOCAL PIPELINE/)).toBeVisible();
  const cancelBuild = previewLoading.getByRole("button", { name: "Cancel build" });
  await expect(cancelBuild).toBeFocused();
  await cancelBuild.click();
  await expect(previewLoading).toHaveCount(0);
  await expect(page.locator(".compiler-preview-stage")).toHaveAttribute("aria-busy", "false");
  await page.getByRole("button", { name: "SOURCE", exact: true }).click();
  await expect(page.getByText("Vooya Gate 2 remains open")).toBeVisible();
  await page.getByRole("button", { name: /Unknown target/ }).click();
  await expect(page.getByRole("treeitem", { name: "no-core.rs" })).toBeVisible();
  await expect(page.getByText("UNKNOWN-UNKNOWN MODULE EXECUTION · GATE 1.75")).toBeVisible();
  await expect(page.locator(".vooya-ide-editor-host .cm-content")).toContainText("vooya_gate_two_answer");
  await page.getByRole("button", { name: /WASI command/ }).click();
  await expect(page.getByRole("treeitem", { name: "main.rs" })).toBeVisible();
});

test("isolated preview host mounts, replaces, and disposes a real Vooya artifact realm", async ({ page }) => {
  await page.goto("/#/experiments/browser-compiler");
  await page.getByRole("button", { name: "Mount precompiled presenter" }).click();
  await expect(page.locator(".compiler-preview-gate > header code")).toHaveText("mounted");
  const firstFrame = page.locator('iframe[title="Vooya artifact preview"]');
  await expect(firstFrame).toHaveCount(1);
  const firstRealm = await firstFrame.getAttribute("name");
  await expect(firstFrame.contentFrame().getByText("Vooya Rust summary")).toBeVisible();

  await page.getByRole("button", { name: "Reset realm" }).click();
  const secondFrame = page.locator('iframe[title="Vooya artifact preview"]');
  await expect(secondFrame).toHaveCount(1);
  await expect.poll(() => secondFrame.getAttribute("name")).not.toBe(firstRealm);
  const secondRealm = await secondFrame.getAttribute("name");
  await expect(secondFrame.contentFrame().getByText("Vooya Rust summary")).toBeVisible();

  await page.getByRole("button", { name: "SOURCE", exact: true }).click();
  await page.getByRole("button", { name: "Compile & run Rust" }).click();
  const previewLoading = page.getByRole("status", { name: "Browser build in progress" });
  await expect(previewLoading).toBeVisible();
  await expect(page.locator('iframe[title="Vooya artifact preview"]')).toHaveAttribute("name", secondRealm ?? "");
  await expect(previewLoading).toContainText("Previous successful result remains active");
  await previewLoading.getByRole("button", { name: "Cancel build" }).click();
  await expect(previewLoading).toHaveCount(0);
  await expect(page.locator('iframe[title="Vooya artifact preview"]')).toHaveAttribute("name", secondRealm ?? "");

  await page.getByRole("button", { name: "Dispose realm" }).click();
  await expect(page.locator('iframe[title="Vooya artifact preview"]')).toHaveCount(0);
  await expect(page.locator(".compiler-preview-gate > header code")).toHaveText("disposed");
});

test("generated scatter route compares implementations and exposes a gated workbench", async ({ page }) => {
  await page.goto("/#/cases/examples/scatter-plot");
  const preview = page.getByRole("region", { name: "Interactive R-tree scatter preview" });
  const previewHeight = await preview.evaluate((element) => element.getBoundingClientRect().height);
  await expect(page.getByText("Rust R-tree", { exact: true })).toBeVisible();
  await page.locator(".rust-scatter canvas[data-scatter-canvas]").hover({ position: { x: 320, y: 120 } });
  await expect(page.locator(".rust-scatter .scatter-query")).toContainText("nearest");
  await page.getByRole("button", { name: "JAVASCRIPT", exact: true }).click();
  await expect.poll(() => preview.evaluate((element) => element.getBoundingClientRect().height)).toBe(previewHeight);
  await expect(page.locator(".baseline-scatter").getByText("JS linear scan")).toBeVisible();
  await page.locator(".baseline-scatter canvas").hover({ position: { x: 320, y: 120 } });
  await expect(page.locator(".baseline-scatter .scatter-query")).toContainText("nearest");
  await page.getByRole("button", { name: "RESET" }).click();
  await expect(page.getByText("Rust R-tree", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Compile & preview" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Try Browser Compiler/ })).toBeVisible();
  await page.getByRole("button", { name: "SOURCE", exact: true }).click();
  await expect(page.getByText("PRECOMPILED · SOURCE LOCKED")).toBeVisible();
  const explorer = page.getByRole("complementary", { name: "Files" });
  await expect(explorer).toBeVisible();
  await explorer.getByRole("treeitem", { name: "ScatterPlot.rs", exact: true }).click();
  await expect(page.getByRole("tab", { name: /ScatterPlot\.rs/ })).toBeVisible();
  await expect(page.getByText("#[voo::component]", { exact: false })).toBeVisible();
  await explorer.getByRole("treeitem", { name: "DemoPage.vue", exact: true }).click();
  await expect(page.getByRole("tab", { name: /DemoPage\.vue/ })).toBeVisible();
  await expect(page.locator(".vooya-ide-editor-host .cm-content")).toContainText("ScatterPlot");
  const sourceContent = page.locator(".vooya-ide-editor-host .cm-content");
  await expect(sourceContent).toHaveAttribute("contenteditable", "true");
  await expect(sourceContent).toHaveAttribute("aria-readonly", "true");
  const selectionPoints = await page.locator(".vooya-ide-editor-host .cm-line").first().evaluate((line) => {
    const pointAt = (offset: number) => {
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
      let remaining = offset;
      let node = walker.nextNode();
      while (node) {
        const length = node.textContent?.length ?? 0;
        if (remaining <= length) {
          const range = document.createRange();
          range.setStart(node, remaining);
          range.collapse(true);
          const rect = range.getBoundingClientRect();
          return { x: rect.left, y: rect.top + rect.height / 2 };
        }
        remaining -= length;
        node = walker.nextNode();
      }
      throw new Error(`No text position at offset ${offset}`);
    };
    return { start: pointAt(4), end: pointAt(17), expected: line.textContent?.slice(4, 17) ?? "" };
  });
  await page.mouse.move(selectionPoints.start.x, selectionPoints.start.y);
  await page.mouse.down();
  await page.mouse.move(selectionPoints.end.x, selectionPoints.end.y, { steps: 8 });
  await page.mouse.up();
  expect(await page.evaluate(() => getSelection()?.toString())).toBe(selectionPoints.expected);
  await expect(page.locator(".vooya-ide-status")).toContainText("13 selected");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(page.locator(".vooya-ide-status")).toContainText("14 selected");
  const selectionPresentation = await page.locator(".vooya-ide-editor-host").evaluate((host) => {
    const activeLine = host.querySelector(".cm-activeLine");
    const selection = host.querySelector(".cm-selectionBackground");
    return {
      activeLineBackground: activeLine ? getComputedStyle(activeLine).backgroundColor : "",
      selectionBackground: selection ? getComputedStyle(selection).backgroundColor : "",
      selectedWidth: selection?.getBoundingClientRect().width ?? 0,
      lineWidth: activeLine?.getBoundingClientRect().width ?? 0,
    };
  });
  expect(selectionPresentation.activeLineBackground).toContain("rgba");
  expect(selectionPresentation.selectionBackground).not.toBe("rgba(0, 0, 0, 0)");
  expect(selectionPresentation.selectedWidth).toBeGreaterThan(0);
  expect(selectionPresentation.selectedWidth).toBeLessThan(selectionPresentation.lineWidth);
  const readonlySource = await sourceContent.textContent();
  await page.keyboard.type("this must not edit");
  await expect(sourceContent).toHaveText(readonlySource ?? "");
  const editorScroller = page.locator(".vooya-ide-editor-host .cm-scroller");
  const editorMetrics = await editorScroller.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(editorMetrics.scrollHeight).toBeGreaterThan(editorMetrics.clientHeight);
  await editorScroller.evaluate((element) => {
    element.scrollTop = 900;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect.poll(() => editorScroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const copyButton = page.locator(".vooya-workbench-toolbar [data-copy-action]");
  await expect(copyButton).toBeVisible();
  await expect(copyButton).toHaveText("Copy active file");
  await copyButton.click();
  await expect(copyButton).toHaveText("Copied · DemoPage.vue");

  for (const fileName of ["ScatterPlot.css", "case.json", "index.ts", "ScatterBaseline.vue"]) {
    await explorer.getByRole("treeitem", { name: fileName, exact: true }).click();
  }
  const tabMetrics = await page.locator(".vooya-ide-tabs").evaluate((tablist) => {
    const widths = [...tablist.children].map((tab) => Math.round(tab.getBoundingClientRect().width));
    return {
      clientWidth: tablist.clientWidth,
      scrollWidth: tablist.scrollWidth,
      widthDelta: Math.max(...widths) - Math.min(...widths),
    };
  });
  expect(tabMetrics.scrollWidth).toBe(tabMetrics.clientWidth);
  expect(tabMetrics.widthDelta).toBeLessThanOrEqual(1);
});

test("compact case workbench keeps preview and source one explicit tab apart", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/#/cases/examples/scatter-plot");
  const previewPane = page.getByRole("region", { name: "Preview pane" });
  const sourcePane = page.getByRole("region", { name: "Source pane" });
  await expect(previewPane).toBeVisible();
  await expect(sourcePane).toBeHidden();
  await expect(page.getByRole("button", { name: "SPLIT", exact: true })).toBeHidden();
  await page.getByRole("button", { name: "SOURCE", exact: true }).click();
  await expect(sourcePane).toBeVisible();
  await expect(previewPane).toBeHidden();
  await expect(sourcePane.getByRole("button", { name: "Compile & preview" })).toHaveCount(0);
  await page.getByRole("button", { name: "PREVIEW", exact: true }).click();
  await expect(previewPane).toBeVisible();
});

test("Log Atlas keeps trace querying in the Vooya Rust component", async ({ page }) => {
  await page.goto("/#/cases/data/log-atlas");
  await expect(page.getByRole("heading", { name: /Log Atlas/ })).toBeVisible();
  const engine = page.locator(".log-atlas-engine");
  const preview = page.getByRole("region", { name: "Interactive Log Atlas trace preview" });
  const previewHeight = await preview.evaluate((element) => element.getBoundingClientRect().height);
  await expect(engine.getByText("WASM-RESIDENT TRACE INDEX")).toBeVisible();
  await expect(engine.locator(".atlas-row").first()).toBeVisible();
  const initialSummary = await engine.locator(".atlas-engine-header > div").first().innerText();

  await page.getByRole("button", { name: "ERRORS", exact: true }).click();
  await expect.poll(() => preview.evaluate((element) => element.getBoundingClientRect().height)).toBe(previewHeight);
  await expect(engine.locator(".atlas-row.is-error").first()).toBeVisible();
  await expect(engine.locator(".atlas-engine-header > div").first()).not.toHaveText(initialSummary);

  await page.getByRole("textbox", { name: "Rust regex query" }).fill("[");
  await expect(engine.getByText("Query rejected by Rust regex")).toBeVisible();
  await expect.poll(() => preview.evaluate((element) => element.getBoundingClientRect().height)).toBe(previewHeight);
  await page.getByRole("button", { name: "RESET", exact: true }).click();
  await expect(engine.getByText("Query rejected by Rust regex")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Trace query presets" }).getByRole("button", { name: "ALL", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "SOURCE", exact: true }).click();
  await expect(page.getByText("PRECOMPILED · SOURCE LOCKED")).toBeVisible();
});

test("Workflow Replay keeps domain rules and deterministic history in a Rust Store", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/#/cases/state/workflow-replay");
  const preview = page.getByRole("region", { name: "Interactive approval workflow replay" });
  await expect(page.getByRole("heading", { name: "Workflow Replay" })).toBeVisible();
  await expect(preview.getByRole("heading", { name: "Draft" })).toBeVisible();
  const previewHeight = await preview.evaluate((element) => element.getBoundingClientRect().height);

  await preview.getByRole("button", { name: "ADVANCE →" }).click();
  await expect(preview.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(preview.getByText("Accepted: Draft → Review")).toBeVisible();
  await expect.poll(() => preview.evaluate((element) => element.getBoundingClientRect().height)).toBe(previewHeight);

  await preview.getByRole("button", { name: "TRY INVALID" }).click();
  await expect(preview.locator(".workflow-state-card dd").nth(1)).toHaveText("01");
  await expect(preview.getByText(/Rejected: Review cannot skip/)).toBeVisible();

  await preview.getByRole("button", { name: "ADVANCE →" }).click();
  await preview.getByRole("button", { name: "ADVANCE →" }).click();
  await expect(preview.getByRole("heading", { name: "Scheduled" })).toBeVisible();
  await preview.getByRole("button", { name: "← REWIND" }).click();
  await expect(preview.getByRole("heading", { name: "Approved", exact: true })).toBeVisible();
  await expect(preview.getByText("Rewound to Approved")).toBeVisible();
  await preview.getByLabel("Replay target event").fill("1");
  await preview.getByRole("button", { name: "REPLAY", exact: true }).click();
  await expect(preview.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(preview.getByText("Replayed event 02: Review")).toBeVisible();

  await preview.getByRole("button", { name: "RESET INSTANCE" }).click();
  await expect(preview.getByRole("heading", { name: "Draft" })).toBeVisible();
  await expect(preview.getByText("Store created at Draft")).toBeVisible();
  await expect(preview.getByText("SEALED", { exact: true }).first()).toBeVisible();

  // Navigate within the same document: a full reload would hide leaked state.
  await preview.getByRole("button", { name: "ADVANCE →" }).click();
  await expect(preview.getByRole("heading", { name: "Review" })).toBeVisible();
  await page.evaluate(() => { window.location.hash = "/"; });
  await expect(preview).toHaveCount(0);
  await page.evaluate(() => { window.location.hash = "/cases/state/workflow-replay"; });
  await expect(preview.getByRole("heading", { name: "Draft" })).toBeVisible();
  await expect(preview.locator(".workflow-state-card dd").nth(1)).toHaveText("00");
  await expect(preview.getByText("Store created at Draft")).toBeVisible();
  await preview.getByRole("button", { name: "ADVANCE →" }).click();
  await expect(preview.getByRole("heading", { name: "Review" })).toBeVisible();

  await page.getByRole("button", { name: "SOURCE", exact: true }).click();
  await expect(page.getByText("PRECOMPILED · SOURCE LOCKED")).toBeVisible();
  await expect(page.locator(".vooya-ide-editor-host .cm-content")).toContainText("pub struct WorkflowReplaySnapshot");
  expect(pageErrors).toEqual([]);
});

test("Bevy World Inspector runs a real bounded ECS schedule behind the Vue host", async ({ page }) => {
  await page.goto("/#/cases/simulation/bevy-world-inspector");
  const preview = page.getByRole("region", { name: "Interactive Bevy ECS world inspector" });
  await expect(page.getByRole("heading", { name: /Bevy World Inspector/ })).toBeVisible();
  await expect(preview.getByText("SCHEDULE RUNNING")).toBeVisible();
  await expect(preview.getByText("24/48", { exact: true })).toBeVisible();
  await expect(preview.getByRole("button", { name: /Agent 1,/ })).toBeVisible();

  const tickMetric = preview.locator(".bevy-metrics strong").nth(0);
  const hostFpsMetric = preview.locator(".bevy-metrics strong").nth(1);
  const ecsRateMetric = preview.locator(".bevy-metrics strong").nth(2);
  const contactsMetric = preview.locator(".bevy-metrics strong").nth(4);
  const initialTick = Number(await tickMetric.innerText());
  await expect.poll(async () => Number(await tickMetric.innerText())).toBeGreaterThan(initialTick);
  await expect.poll(async () => Number.parseInt(await hostFpsMetric.innerText(), 10)).toBeGreaterThan(0);
  await expect(ecsRateMetric).toHaveText("25HZ");
  await expect.poll(async () => Number((await contactsMetric.innerText()).split("/")[1])).toBeGreaterThan(0);

  await preview.getByRole("button", { name: "Ⅱ PAUSE" }).click();
  await expect(preview.getByText("SCHEDULE PAUSED")).toBeVisible();
  await page.waitForTimeout(180);
  const pausedTick = await tickMetric.innerText();
  await page.waitForTimeout(300);
  await expect(tickMetric).toHaveText(pausedTick);

  await preview.getByRole("button", { name: "STEP +1" }).click();
  await expect(tickMetric).toHaveText(String(Number(pausedTick) + 1).padStart(5, "0"));

  await preview.getByRole("button", { name: /Agent 2,/ }).click();
  await expect(preview.getByRole("heading", { name: /AGENT 02/ })).toBeVisible();
  await preview.getByRole("button", { name: "+ SPAWN" }).click();
  await expect(preview.getByText("25/48", { exact: true })).toBeVisible();
  await expect(preview.getByRole("heading", { name: /AGENT 25/ })).toBeVisible();
  await preview.getByRole("button", { name: "− DESPAWN" }).click();
  await expect(preview.getByText("24/48", { exact: true })).toBeVisible();

  const spawn = preview.getByRole("button", { name: "+ SPAWN" });
  for (let count = 25; count <= 48; count += 1) {
    await spawn.click();
  }
  await expect(preview.getByText("48/48", { exact: true })).toBeVisible();
  await expect(spawn).toBeDisabled();
  await preview.getByRole("button", { name: "RESET WORLD" }).click();
  await expect(preview.getByText("24/48", { exact: true })).toBeVisible();

  const previewPane = page.getByRole("region", { name: "Preview pane" });
  const previewHeight = await previewPane.evaluate((element) => element.getBoundingClientRect().height);
  await page.getByRole("button", { name: "SOURCE", exact: true }).click();
  await expect(page.getByText("PRECOMPILED · SOURCE LOCKED")).toBeVisible();
  await page.getByRole("button", { name: "PREVIEW", exact: true }).click();
  await expect.poll(() => previewPane.evaluate((element) => element.getBoundingClientRect().height)).toBe(previewHeight);
});

test("Mesh Clinic parses topology in Rust and applies only its bounded repair", async ({ page }) => {
  await page.goto("/#/cases/geometry/mesh-clinic");
  const preview = page.getByRole("region", { name: "Interactive Mesh Clinic topology inspector" });
  const report = preview.locator(".mesh-clinic-inspector");
  await expect(preview.getByRole("heading", { name: "DAMAGED SPECIMEN" })).toBeVisible();
  await expect(report.locator("li", { hasText: "DEGENERATE FACES" }).locator("b")).toHaveText("1");
  await expect(report.locator("li", { hasText: "DUPLICATE FACES" }).locator("b")).toHaveText("1");
  await expect(report.locator("li", { hasText: "NON-MANIFOLD EDGES" }).locator("b")).toHaveText("3");

  await preview.getByRole("button", { name: "APPLY SAFE REPAIR" }).click();
  await expect(preview.getByRole("heading", { name: "BOUNDED REPAIR" })).toBeVisible();
  await expect(report.locator("li", { hasText: "DEGENERATE FACES" }).locator("b")).toHaveText("0");
  await expect(report.locator("li", { hasText: "DUPLICATE FACES" }).locator("b")).toHaveText("0");
  await expect(report.getByText("REMOVED").locator("..").locator("dd")).toHaveText("2");
  await expect(preview.getByRole("button", { name: "APPLY SAFE REPAIR" })).toBeDisabled();

  await preview.getByRole("slider").fill("120");
  await expect(preview.getByText("120° YAW")).toBeVisible();
  await preview.getByRole("button", { name: "REFERENCE" }).click();
  await expect(preview.getByRole("heading", { name: "REFERENCE CUBE" })).toBeVisible();
  await expect(preview.getByText("SEALED", { exact: true }).first()).toBeVisible();
  await preview.getByRole("button", { name: "RESET" }).click();
  await expect(preview.getByRole("heading", { name: "DAMAGED SPECIMEN" })).toBeVisible();
});

test("Vector Tile Forge keeps decode, simplification, and triangulation in its Rust Store", async ({ page }) => {
  await page.goto("/#/cases/geometry/vector-tile-forge");
  const preview = page.getByRole("region", { name: "Interactive Vector Tile Forge geometry pipeline" });
  const metrics = preview.locator(".vector-forge-metrics");
  await expect(metrics).toContainText("75 → 63");
  await expect(metrics).toContainText("16% REDUCTION");
  await expect(metrics).toContainText("21");

  const triangleToggle = preview.getByRole("button", { name: "SHOW TRIANGLES" });
  await triangleToggle.click();
  await expect(preview.locator(".forge-triangle")).toHaveCount(21);
  await preview.getByRole("slider").fill("28");
  await expect(metrics).toContainText("75 → 54");
  await expect(metrics).toContainText("28% REDUCTION");
  await expect(preview.locator(".forge-triangle")).toHaveCount(14);

  await preview.getByRole("button", { name: "RESET TILE" }).click();
  await expect(metrics).toContainText("75 → 63");
  await expect(preview.locator(".forge-triangle")).toHaveCount(0);
});

test("Source Surgeon performs AST-backed analysis, rewrite, and parser failure recovery", async ({ page }) => {
  await page.goto("/#/cases/tools/source-surgeon");
  const preview = page.getByRole("region", { name: "Interactive Source Surgeon Rust analysis tool" });
  const output = preview.locator("[data-surgeon-output]");
  await expect(preview.getByText("Rust syntax accepted")).toBeVisible();
  await expect(preview.getByText("2 matching identifiers replaced")).toBeVisible();
  await expect(output).toContainText("fn summarize_local");
  await expect(output).toContainText("summarize_local(&index)");

  await preview.getByRole("textbox", { name: "Replacement function name" }).fill("aggregate_local");
  await preview.getByRole("button", { name: "ANALYZE AST" }).click();
  await expect(output).toContainText("fn aggregate_local");
  await expect(output).toContainText("aggregate_local(&index)");

  await preview.getByRole("button", { name: "LOAD INVALID FIXTURE" }).click();
  await expect(preview.getByText("The draft is not valid Rust syntax")).toBeVisible();
  await expect(preview.getByText("No regex fallback or partial rewrite was applied.")).toBeVisible();
  await preview.getByRole("button", { name: "RESET" }).click();
  await expect(preview.getByText("Rust syntax accepted")).toBeVisible();
});

test("Rspack case mounts its Vooya Rust summary", async ({ page }) => {
  await page.goto("/#/bundlers/rspack");
  await expect(page.getByText("Vooya Rust summary")).toBeVisible();
  await expect(page.getByText("@rspack/browser")).toBeVisible();
  await expect(page.locator('.vooya-ide[data-readonly="false"] .cm-content')).toHaveAttribute("contenteditable", "true");
  await expect(page.locator('.vooya-ide[data-readonly="true"] .cm-content')).toHaveAttribute("contenteditable", "true");
  await expect(page.locator('.vooya-ide[data-readonly="true"] .cm-content')).toHaveAttribute("aria-readonly", "true");
  await page.getByRole("button", { name: "Run browser build" }).click();
  await expect(page.locator(".status-pill")).toHaveAttribute("data-status", /needs-isolation|success|error/);
});

test("Rolldown case mounts its Vooya Rust summary", async ({ page }) => {
  await page.goto("/#/bundlers/rolldown");
  await expect(page.getByText("Vooya Rust summary")).toBeVisible();
  await expect(page.getByText("Rolldown Browser")).toBeVisible();
});
