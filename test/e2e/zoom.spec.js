/* global document */
const { test, expect } = require("@playwright/test");

test.describe("Zoom", () => {
	test("zoom-in button increases canvas width and updates --scale-factor", async ({
		page,
	}) => {
		await page.goto("http://localhost:8080/");

		// Wait for initial render
		const canvas = page.locator("#pdf-canvas");
		await expect(canvas).toBeVisible();
		await page.waitForFunction(() => {
			const c = document.getElementById("pdf-canvas");
			return c && c.style.width && parseInt(c.style.width, 10) > 0;
		});

		// Get width after fit-page default load
		const initialWidthStr = await canvas.evaluate((el) => el.style.width);
		const initialWidth = parseInt(initialWidthStr, 10);

		// Click zoom-in several times to get beyond the fit-page scale
		const btnZoomIn = page.locator("#btn-zoom-in");
		await btnZoomIn.click();
		await btnZoomIn.click();
		await btnZoomIn.click();

		// Wait for canvas to re-render with new width
		await page.waitForFunction((prevWidth) => {
			const c = document.getElementById("pdf-canvas");
			if (!c || !c.style.width) return false;
			const currentWidth = parseInt(c.style.width, 10);
			return currentWidth !== prevWidth && currentWidth > 0;
		}, initialWidth);

		const newWidthStr = await canvas.evaluate((el) => el.style.width);
		const newWidth = parseInt(newWidthStr, 10);
		expect(newWidth).toBeGreaterThan(0);
		expect(newWidth).not.toBe(initialWidth);

		// Check --scale-factor on textLayer
		const textLayer = page.locator("#text-layer");
		const scaleFactorStr = await textLayer.evaluate((el) =>
			el.style.getPropertyValue("--scale-factor"),
		);
		expect(scaleFactorStr).not.toBeNull();
		expect(parseFloat(scaleFactorStr)).toBeGreaterThan(0);
	});

	test("fit-page button resets to fit-page zoom without horizontal scrollbar", async ({
		page,
	}) => {
		await page.goto("http://localhost:8080/");

		// Wait for initial render
		const canvas = page.locator("#pdf-canvas");
		await expect(canvas).toBeVisible();
		await page.waitForFunction(() => {
			const c = document.getElementById("pdf-canvas");
			return c && c.style.width && parseInt(c.style.width, 10) > 0;
		});

		// Zoom in first to move away from fit-page
		const btnZoomIn = page.locator("#btn-zoom-in");
		await btnZoomIn.click();
		await btnZoomIn.click();
		await btnZoomIn.click();

		const zoomedWidthStr = await canvas.evaluate((el) => el.style.width);
		const zoomedWidth = parseInt(zoomedWidthStr, 10);

		// Click Fit Page to reset
		const btnFit = page.locator("#btn-zoom-fit");
		await expect(btnFit).toBeVisible();
		await btnFit.click();

		// Wait for canvas to resize back
		await page.waitForFunction((prevWidth) => {
			const c = document.getElementById("pdf-canvas");
			if (!c || !c.style.width) return false;
			const currentWidth = parseInt(c.style.width, 10);
			return currentWidth !== prevWidth && currentWidth > 0;
		}, zoomedWidth);

		// After fit-page, no horizontal scrollbar
		const hasHorizontalScroll = await page.evaluate(() => {
			const viewport =
				document.getElementById("viewport") ||
				document.querySelector(".viewport");
			return viewport.scrollWidth > viewport.clientWidth;
		});
		expect(hasHorizontalScroll).toBe(false);
	});

	test("zoom-out button decreases canvas width", async ({ page }) => {
		await page.goto("http://localhost:8080/");

		// Wait for initial render
		const canvas = page.locator("#pdf-canvas");
		await expect(canvas).toBeVisible();
		await page.waitForFunction(() => {
			const c = document.getElementById("pdf-canvas");
			return c && c.style.width && parseInt(c.style.width, 10) > 0;
		});

		// First zoom in so there is room to zoom out
		const btnZoomIn = page.locator("#btn-zoom-in");
		await btnZoomIn.click();
		await btnZoomIn.click();
		await btnZoomIn.click();

		const zoomedWidthStr = await canvas.evaluate((el) => el.style.width);
		const zoomedWidth = parseInt(zoomedWidthStr, 10);

		// Now zoom out once
		const btnZoomOut = page.locator("#btn-zoom-out");
		await btnZoomOut.click();

		await page.waitForFunction((prevWidth) => {
			const c = document.getElementById("pdf-canvas");
			if (!c || !c.style.width) return false;
			const currentWidth = parseInt(c.style.width, 10);
			return currentWidth !== prevWidth && currentWidth > 0;
		}, zoomedWidth);

		const smallerWidthStr = await canvas.evaluate((el) => el.style.width);
		const smallerWidth = parseInt(smallerWidthStr, 10);
		expect(smallerWidth).toBeGreaterThan(0);
		expect(smallerWidth).toBeLessThan(zoomedWidth);
	});

	test("fit-page does not produce a horizontal scrollbar on initial load", async ({
		page,
	}) => {
		await page.goto("http://localhost:8080/");

		// Wait for initial render (default is fit-page)
		const canvas = page.locator("#pdf-canvas");
		await expect(canvas).toBeVisible();
		await page.waitForFunction(() => {
			const c = document.getElementById("pdf-canvas");
			return c && c.style.width && parseInt(c.style.width, 10) > 0;
		});

		const hasHorizontalScroll = await page.evaluate(() => {
			const viewport =
				document.getElementById("viewport") ||
				document.querySelector(".viewport");
			return viewport.scrollWidth > viewport.clientWidth;
		});
		expect(hasHorizontalScroll).toBe(false);
	});
});
