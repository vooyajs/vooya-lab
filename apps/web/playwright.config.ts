import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "line",
  use: {
    baseURL: "http://localhost:4317",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "vite --host localhost --port 4317",
    url: "http://localhost:4317",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
