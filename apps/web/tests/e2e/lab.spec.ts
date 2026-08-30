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

test("Gallery keeps tooling experiments out of its public navigation", async ({ page }) => {
  await page.goto("/#/");
  await expect(page.getByRole("heading", { name: "Rspack in the Browser" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Experiments", exact: true })).toHaveCount(0);
  await page.goto("/#/bundlers/rspack");
  await expect(page.getByRole("heading", { name: "Rspack Browser" })).toBeVisible();
  await page.getByRole("link", { name: "Cases", exact: true }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { name: /See the effect/ })).toBeVisible();

  await page.goto("/#/experiments/browser-compiler");
  await expect(page.getByRole("heading", { name: /Rustc.*inside the browser/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Compile & run Rust" })).toBeEnabled();
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
  await page.getByRole("button", { name: "Mount precompiled proof" }).click();
  await expect(page.locator(".compiler-preview-gate > header code")).toHaveText("mounted");
  const firstFrame = page.locator('iframe[title="Vooya artifact preview"]');
  await expect(firstFrame).toHaveCount(1);
  const firstRealm = await firstFrame.getAttribute("name");
  await expect(firstFrame.contentFrame().getByText("Vooya Rust summary")).toBeVisible();

  await page.getByRole("button", { name: "Reset realm" }).click();
  const secondFrame = page.locator('iframe[title="Vooya artifact preview"]');
  await expect(secondFrame).toHaveCount(1);
  await expect.poll(() => secondFrame.getAttribute("name")).not.toBe(firstRealm);
  await expect(secondFrame.contentFrame().getByText("Vooya Rust summary")).toBeVisible();

  await page.getByRole("button", { name: "Dispose realm" }).click();
  await expect(page.locator('iframe[title="Vooya artifact preview"]')).toHaveCount(0);
  await expect(page.locator(".compiler-preview-gate > header code")).toHaveText("disposed");
});

test("generated scatter route compares implementations and exposes a gated workbench", async ({ page }) => {
  await page.goto("/#/cases/examples/scatter-plot");
  await expect(page.getByText("Rust R-tree", { exact: true })).toBeVisible();
  await page.locator(".rust-scatter canvas[data-scatter-canvas]").hover({ position: { x: 320, y: 120 } });
  await expect(page.locator(".rust-scatter .scatter-query")).toContainText("nearest");
  await page.getByRole("button", { name: "JAVASCRIPT", exact: true }).click();
  await expect(page.locator(".baseline-scatter").getByText("JS linear scan")).toBeVisible();
  await page.locator(".baseline-scatter canvas").hover({ position: { x: 320, y: 120 } });
  await expect(page.locator(".baseline-scatter .scatter-query")).toContainText("nearest");
  await page.getByRole("button", { name: "RESET" }).click();
  await expect(page.getByText("Rust R-tree", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Compile & preview" })).toBeDisabled();
  await expect(page.getByText("PRECOMPILED · SOURCE LOCKED")).toBeVisible();
  const explorer = page.getByRole("complementary", { name: "Files" });
  await expect(explorer).toBeVisible();
  await explorer.getByRole("treeitem", { name: "ScatterPlot.rs", exact: true }).click();
  await expect(page.getByRole("tab", { name: /ScatterPlot\.rs/ })).toBeVisible();
  await expect(page.getByText("#[voo::component]", { exact: false })).toBeVisible();
  await explorer.getByRole("treeitem", { name: "DemoPage.vue", exact: true }).click();
  await expect(page.getByRole("tab", { name: /DemoPage\.vue/ })).toBeVisible();
  await expect(page.locator(".vooya-ide-editor-host .cm-content")).toContainText("ScatterPlot");
  await expect(page.locator(".vooya-ide-editor-host .cm-content")).toHaveAttribute("contenteditable", "false");

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

test("Log Atlas keeps trace querying in the Vooya Rust component", async ({ page }) => {
  await page.goto("/#/cases/data/log-atlas");
  await expect(page.getByRole("heading", { name: /Log Atlas/ })).toBeVisible();
  const engine = page.locator(".log-atlas-engine");
  await expect(engine.getByText("WASM-RESIDENT TRACE INDEX")).toBeVisible();
  await expect(engine.locator(".atlas-row").first()).toBeVisible();
  const initialSummary = await engine.locator(".atlas-engine-header > div").first().innerText();

  await page.getByRole("button", { name: "ERRORS", exact: true }).click();
  await expect(engine.locator(".atlas-row.is-error").first()).toBeVisible();
  await expect(engine.locator(".atlas-engine-header > div").first()).not.toHaveText(initialSummary);

  await page.getByRole("textbox", { name: "Rust regex query" }).fill("[");
  await expect(engine.getByText("Query rejected by Rust regex")).toBeVisible();
  await page.getByRole("button", { name: "RESET", exact: true }).click();
  await expect(engine.getByText("Query rejected by Rust regex")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Trace query presets" }).getByRole("button", { name: "ALL", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("PRECOMPILED · SOURCE LOCKED")).toBeVisible();
});

test("Rspack case mounts its Vooya Rust summary", async ({ page }) => {
  await page.goto("/#/bundlers/rspack");
  await expect(page.getByText("Vooya Rust summary")).toBeVisible();
  await expect(page.getByText("@rspack/browser")).toBeVisible();
  await expect(page.locator('.vooya-ide[data-readonly="false"] .cm-content')).toHaveAttribute("contenteditable", "true");
  await expect(page.locator('.vooya-ide[data-readonly="true"] .cm-content')).toHaveAttribute("contenteditable", "false");
  await page.getByRole("button", { name: "Run browser build" }).click();
  await expect(page.locator(".status-pill")).toHaveAttribute("data-status", /needs-isolation|success|error/);
});

test("Rolldown case mounts its Vooya Rust summary", async ({ page }) => {
  await page.goto("/#/bundlers/rolldown");
  await expect(page.getByText("Vooya Rust summary")).toBeVisible();
  await expect(page.getByText("Rolldown Browser")).toBeVisible();
});
