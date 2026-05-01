import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5177";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL,
    navigationTimeout: 45_000,
    trace: "on-first-retry"
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --port 5177",
        reuseExistingServer: true,
        timeout: 120_000,
        url: baseURL
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] }
    }
  ]
});
