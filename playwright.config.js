import { defineConfig, devices } from "@playwright/test";

// The page loads Leaflet, MapLibre and map tiles from the internet, so these tests need a connection.
export default defineConfig({
  testDir: "tests",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: { baseURL: "http://localhost:4173/" },
  webServer: {
    command: "python3 -m http.server 4173",
    url: "http://localhost:4173/",
    reuseExistingServer: true,
  },
  projects: [
    { name: "phone", use: { ...devices["iPhone 13"] } },
    { name: "laptop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
});
