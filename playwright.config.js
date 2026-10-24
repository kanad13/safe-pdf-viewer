// @ts-check
const { defineConfig, devices } = require("@playwright/test");

// The editor support floor ships an older Chromium than Playwright's default. Point
// CHROMIUM_FLOOR_PATH at that browser to run the same suite against it (docs/testing.md).
const floorChromium = process.env.CHROMIUM_FLOOR_PATH;

const projects = [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }];
if (floorChromium) {
	projects.push({
		name: "chromium-floor",
		use: { ...devices["Desktop Chrome"], launchOptions: { executablePath: floorChromium } },
	});
}

module.exports = defineConfig({
	testDir: "./test/e2e",
	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
	use: {
		trace: "on-first-retry",
	},
	projects,
	webServer: {
		command: "node test/e2e/fixtures/server.js",
		port: 8080,
		reuseExistingServer: !process.env.CI,
	},
});
