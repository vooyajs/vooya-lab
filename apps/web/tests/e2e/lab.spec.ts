import { expect, test } from "@playwright/test";

test("home page explains the Vooya compile boundary", async ({ page }) => {
  await page.goto("/#/");
  await expect(page.getByRole("heading", { name: "See the Vooya boundary working." })).toBeVisible();
  await expect(page.getByText("Cases are not complete until their Rust island is built by Vooya.")).toBeVisible();
});

test("bundler category exposes second-level cases", async ({ page }) => {
  await page.goto("/#/bundlers");
  await expect(page.getByRole("heading", { name: "Browser bundlers" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Rspack Browser" })).toHaveAttribute("href", "#/bundlers/rspack");
  await expect(page.getByRole("link", { name: "Rolldown Browser" })).toHaveAttribute("href", "#/bundlers/rolldown");
});

test("Rspack case mounts its Vooya Rust summary", async ({ page }) => {
  await page.goto("/#/bundlers/rspack");
  await expect(page.getByText("Vooya Rust summary")).toBeVisible();
  await expect(page.getByText("RspackSummary.rs")).toBeVisible();
  await page.getByRole("button", { name: "Run browser build" }).click();
  await expect(page.locator(".status-pill")).toHaveAttribute("data-status", /needs-isolation|success|error/);
});

test("Rolldown case mounts its Vooya Rust summary", async ({ page }) => {
  await page.goto("/#/bundlers/rolldown");
  await expect(page.getByText("Vooya Rust summary")).toBeVisible();
  await expect(page.getByText("Rolldown Browser")).toBeVisible();
});
