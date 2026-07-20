import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const localChromeExecutables = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/opt/pw-browsers/chromium",
];
const localChromeExecutable = localChromeExecutables.find((executable) =>
  existsSync(executable),
);
const launchOptions = localChromeExecutable
  ? { executablePath: localChromeExecutable }
  : undefined;

export default defineConfig({
  testDir: "./tests",
  outputDir: "./artifacts/playwright",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 1000 },
        launchOptions,
      },
    },
    {
      name: "mobile-chrome",
      use: {
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 1,
        hasTouch: true,
        isMobile: true,
        launchOptions,
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/cart",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
