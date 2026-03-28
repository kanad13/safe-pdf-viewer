/* global document */
const { test, expect } = require("@playwright/test");

/**
 * Waits until the PDF canvas has rendered at least one pixel.
 */
async function waitForPdfRender(page) {
	await page.waitForFunction(() => {
		const c = document.getElementById("pdf-canvas");
		return c && c.width > 0 && c.height > 0;
	}, { timeout: 15000 });
}

test.describe("Annotation Layer (PDF Hyperlinks)", () => {
	test("annotation layer div is attached to DOM after PDF render", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		const annotationLayer = page.locator("#annotation-layer");
		await expect(annotationLayer).toBeAttached();
	});

	test("annotation layer has annotationLayer CSS class", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		const annotationLayer = page.locator("#annotation-layer");
		await expect(annotationLayer).toHaveClass(/annotationLayer/);
	});

	test("annotation layer is inside page-container", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		// Verify annotation layer is a child of page-container
		const annotationLayerInContainer = page.locator("#page-container #annotation-layer");
		await expect(annotationLayerInContainer).toBeAttached();
	});
});
