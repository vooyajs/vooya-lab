import { expect, test } from "@playwright/test";

test("home page presents a browsable Vooya gallery", async ({ page }) => {
  await page.goto("/#/");
  await expect(page.getByRole("heading", { name: "Browse All" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Demo navigation" })).toBeVisible();
  const scatterCard = page.getByRole("link", { name: /R-tree Scatter Explorer/ }).last();
  await expect(scatterCard).toHaveAttribute("href", "#/showcase/scatter-plot");
  await expect(scatterCard.locator("canvas[data-scatter-canvas]")).toBeVisible();
  await expect(scatterCard.getByText("Rust / WASM · live preview")).toBeVisible();
});

test("gallery filters real and planned cases", async ({ page }) => {
  await page.goto("/#/");
  await page.getByRole("button", { name: "Data", exact: true }).click();
  await expect(page.getByRole("heading", { name: "100k Row Data Grid" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "R-tree Scatter Explorer" })).toBeHidden();
  await page.getByRole("searchbox", { name: "Search demos" }).fill("trace");
  await expect(page.getByRole("heading", { name: "Trace Waterfall" })).toBeVisible();
});

test("Gallery keeps tooling experiments out of its public navigation", async ({ page }) => {
  await page.goto("/#/");
  await expect(page.getByRole("heading", { name: "Rspack in the Browser" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Experiments", exact: true })).toHaveCount(0);
  await page.goto("/#/bundlers/rspack");
  await expect(page.getByRole("heading", { name: "Rspack Browser" })).toBeVisible();
  await page.getByRole("link", { name: "Gallery", exact: true }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { name: "Browse All" })).toBeVisible();
});

test("scatter demo compares implementations and exposes source", async ({ page }) => {
  await page.goto("/#/showcase/scatter-plot");
  await expect(page.getByText("Rust R-tree", { exact: true })).toBeVisible();
  await page.locator(".rust-scatter canvas[data-scatter-canvas]").hover({ position: { x: 320, y: 120 } });
  await expect(page.locator(".rust-scatter .scatter-query")).toContainText("nearest");
  await page.getByRole("button", { name: "JavaScript", exact: true }).click();
  await expect(page.locator(".baseline-scatter").getByText("JS linear scan")).toBeVisible();
  await page.locator(".baseline-scatter canvas").hover({ position: { x: 320, y: 120 } });
  await expect(page.locator(".baseline-scatter .scatter-query")).toContainText("nearest");
  await page.getByRole("tab", { name: /Code/ }).click();
  const explorer = page.getByRole("complementary", { name: "Files" });
  await expect(explorer).toBeVisible();
  await explorer.getByRole("treeitem", { name: "ScatterPlot.rs", exact: true }).click();
  await expect(page.getByRole("tab", { name: /ScatterPlot\.rs/ })).toBeVisible();
  await expect(page.getByText("#[voo::component]", { exact: false })).toBeVisible();
  await explorer.getByRole("treeitem", { name: "DemoPage.vue", exact: true }).click();
  await expect(page.getByRole("tab", { name: /DemoPage\.vue/ })).toBeVisible();
  await expect(page.locator(".vooya-ide-editor-host .cm-content")).toContainText("ScatterPlot");

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
