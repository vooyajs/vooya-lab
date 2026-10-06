import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.LAB_E2E_PORT ?? 4317);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid LAB_E2E_PORT");
const production = process.env.LAB_E2E_MODE === "production";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "line",
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `vite ${production ? "preview" : ""} --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
