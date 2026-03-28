/* global document */
const { test, expect } = require("@playwright/test");

/**
 * Waits until the PDF canvas has rendered at least one pixel
 * (i.e., the PDF has been loaded and the first page rendered).
 */
async function waitForPdfRender(page) {
	await page.waitForFunction(() => {
		const c = document.getElementById("pdf-canvas");
		return c && c.width > 0 && c.height > 0;
	}, { timeout: 15000 });
}

test.describe("In-document Search", () => {
	test("find panel is hidden on initial load", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		const findPanel = page.locator("#find-panel");
		await expect(findPanel).toBeAttached();
		await expect(findPanel).not.toBeVisible();
	});

	test("Ctrl+F opens the find panel and focuses the search input", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		const findPanel = page.locator("#find-panel");
		const searchInput = page.locator("#search-input");

		await expect(findPanel).not.toBeVisible();

		await page.keyboard.press("Control+f");

		await expect(findPanel).toBeVisible();
		await expect(searchInput).toBeFocused();
	});

	test("Escape closes the find panel and clears the input", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		// Open panel
		await page.keyboard.press("Control+f");
		const findPanel = page.locator("#find-panel");
		await expect(findPanel).toBeVisible();

		const searchInput = page.locator("#search-input");
		await searchInput.fill("test");
		await expect(searchInput).toHaveValue("test");

		// Escape closes panel and clears input
		await page.keyboard.press("Escape");
		await expect(findPanel).not.toBeVisible();
		await expect(searchInput).toHaveValue("");
	});

	test("search elements (prev, next, input, count) are in find panel", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		// Open panel first
		await page.keyboard.press("Control+f");

		await expect(page.locator("#search-input")).toBeVisible();
		await expect(page.locator("#btn-search-prev")).toBeVisible();
		await expect(page.locator("#btn-search-next")).toBeVisible();
		await expect(page.locator("#search-count")).toBeAttached();
	});

	test("typing a query produces a non-empty match count", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		// Allow time for buildSearchIndex to complete across all PDF pages
		await page.waitForTimeout(2000);

		// Open find panel
		await page.keyboard.press("Control+f");

		const searchInput = page.locator("#search-input");
		await expect(searchInput).toBeVisible();

		// Searching for 'lorem' which appears in the test PDF.
		await searchInput.fill("lorem");

		const searchCount = page.locator("#search-count");
		// Wait for count to be populated (input event triggers runSearch)
		await expect(searchCount).not.toHaveText("", { timeout: 5000 });
	});

	test("navigation keys (arrow) do not trigger page turns when search input is focused", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		// Wait for first page to be ready
		const pageInput = page.locator("#page-input");
		await expect(pageInput).toHaveValue("1");

		// Open find panel and focus search input
		await page.keyboard.press("Control+f");
		const searchInput = page.locator("#search-input");
		await expect(searchInput).toBeFocused();

		// Press ArrowRight — should NOT flip to page 2
		await page.keyboard.press("ArrowRight");
		await expect(pageInput).toHaveValue("1");
	});

	test("clearing search input removes highlights", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);
		await page.waitForTimeout(2000);

		// Open find panel
		await page.keyboard.press("Control+f");

		const searchInput = page.locator("#search-input");
		await searchInput.fill("lorem");

		const searchCount = page.locator("#search-count");
		await expect(searchCount).not.toHaveText("", { timeout: 10000 });

		// Wait for search mark to appear
		const highlights = page.locator("mark.search-mark");
		await expect(highlights.first()).toBeAttached();

		// Press escape — closes panel and clears highlights
		await page.keyboard.press("Escape");

		// After clearing, no mark.search-mark elements should remain
		await expect(highlights).toHaveCount(0);
	});
});
