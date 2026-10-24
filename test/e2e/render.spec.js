const { test, expect } = require("@playwright/test");
const { openViewer, waitForPage, EULER, PLAIN } = require("./helpers");

test.describe("Rendering", () => {
	test("draws page content, not just a blank canvas", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		const darkPixels = await page.locator("#pdf-canvas").evaluate((canvas) => {
			const { data } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
			let dark = 0;
			for (let i = 0; i < data.length; i += 4) {
				if (data[i] < 100 && data[i + 3] > 0) {
					dark++;
				}
			}
			return dark;
		});
		expect(darkPixels).toBeGreaterThan(50);
	});

	test("shows page count and the first page in the toolbar", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		await expect(page.locator("#page-total")).toHaveText("/ 3");
		await expect(page.locator("#btn-prev")).toBeDisabled();
		await expect(page.locator("#btn-next")).toBeEnabled();
	});

	test("the shipped CSP lets the example document load, render and navigate cleanly", async ({
		page,
	}) => {
		const problems = await openViewer(page, { pdf: EULER });
		for (const n of [2, 3]) {
			await page.locator("#btn-next").click();
			await expect(page.locator("#page-input")).toHaveValue(String(n));
		}
		expect(await page.violations()).toEqual([]);
		expect(problems.errors).toEqual([]);
	});

	test("PDF.js runs in a blob worker, the cross-origin path a real webview takes", async ({
		page,
	}) => {
		await openViewer(page, { pdf: PLAIN });
		expect(page.workers().map((w) => w.url().split(":")[0])).toContain("blob");
	});

	test("an unreadable file shows a status message instead of a blank viewer", async ({ page }) => {
		await openViewer(page, { pdf: "/package.json", wait: false });
		await expect(page.locator(".status-message")).toHaveText("Could not load PDF.");
	});

	test("webview state is a page and zoom only", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		const state = await page.evaluate(() => window.__state);
		expect(state).toEqual({ page: 1, zoom: "fit-page" });
	});

	test("restores the saved page and zoom", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN, state: { page: 3, zoom: "75" }, startPage: 3 });
		await waitForPage(page, 3);
	});

	test("ignores a saved zoom that is not an offered level", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN, state: { page: 1, zoom: "banana" } });
		const width = await page.locator("#pdf-canvas").evaluate((c) => c.style.width);
		expect(parseInt(width, 10)).toBeGreaterThan(0);
		expect((await page.evaluate(() => window.__state)).zoom).toBe("fit-page");
	});
});

test.describe("Whole-document rendering under the shipped CSP", () => {
	test("every page of the example document renders without violations or errors", async ({
		page,
	}) => {
		test.setTimeout(90000);
		const problems = await openViewer(page, { pdf: EULER });
		const total = Number((await page.locator("#page-total").innerText()).replace("/ ", ""));
		expect(total).toBeGreaterThan(20);
		for (let n = 2; n <= total; n++) {
			await page.locator("#btn-next").click();
			await expect(page.locator("#page-input")).toHaveValue(String(n));
		}
		expect(await page.violations()).toEqual([]);
		expect(problems.errors).toEqual([]);
	});
});

test.describe("Unsupported image codecs", () => {
	test("a JPEG 2000 image that cannot be decoded leaves the page usable", async ({ page }) => {
		const problems = await openViewer(page, { pdf: "/test/fixtures/jpx-image.pdf", wait: false });
		await expect(page.locator("#page-input")).toHaveValue("1");
		await expect(page.locator(".status-message")).toHaveCount(0);
		await expect(page.locator("#pdf-canvas")).toBeVisible();
		expect(problems.errors).toEqual([]);
	});
});
