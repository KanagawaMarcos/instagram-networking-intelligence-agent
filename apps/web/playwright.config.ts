import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const nixChromium = "/etc/profiles/per-user/kanagawamarcos/bin/chromium";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? (existsSync(nixChromium) ? nixChromium : undefined);
export default defineConfig({
  testDir: "./e2e", timeout: 30_000,
  use: { baseURL: "http://localhost:3000", launchOptions: executablePath ? { executablePath } : undefined },
  webServer: [
    { command: "pnpm --filter @ina/api start", url: "http://localhost:3001/health", reuseExistingServer: true, env: { DEMO_MODE: "true", NODE_ENV: "test", API_PORT: "3001" } },
    { command: "pnpm --filter @ina/web dev", url: "http://localhost:3000", reuseExistingServer: true, env: { NEXT_PUBLIC_API_URL: "http://127.0.0.1:3001" } }
  ]
});
