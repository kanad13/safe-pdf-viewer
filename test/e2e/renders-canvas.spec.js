/* global document */
const { test, expect } = require("@playwright/test");

test.describe("Canvas rendering", () => {
	test("renders canvas with non-zero pixel data", async ({ page }) => {
		await page.goto("http://localhost:8080/");

		// Wait for the canvas to be rendered (pdf page to load)
		const canvas = page.locator("#pdf-canvas");
		await expect(canvas).toBeVisible();

		// Wait until canvas size is set
		await page.waitForFunction(() => {
			const canvas = document.getElementById("pdf-canvas");
			return canvas && canvas.width > 0 && canvas.height > 0;
		});

		// Add a slight delay to ensure rendering is complete
		await page.waitForTimeout(2000);

		// Check that the canvas has non-zero pixel data
		const isNotBlank = await canvas.evaluate((canvasEl) => {
			const ctx = canvasEl.getContext("2d");
			const imageData = ctx.getImageData(
				0,
				0,
				canvasEl.width,
				canvasEl.height,
			).data;
			for (let i = 0; i < imageData.length; i += 4) {
				// If opacity is not 0, it means something is drawn (white background or text)
				if (imageData[i + 3] > 0) {
					return true;
				}
			}
			return false;
		});

		expect(isNotBlank).toBe(true);
	});
});
