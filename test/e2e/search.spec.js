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

test.describe("In-document Search (Phase 6)", () => {
	test("search input is visible inline on initial load", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		const searchInput = page.locator("#search-input");
		// The search input must be in the DOM and visible inline
		await expect(searchInput).toBeAttached();
		await expect(searchInput).toBeVisible();
	});

	test("Ctrl+F focuses the search input", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		const searchInput = page.locator("#search-input");
		
		// Focus somewhere else first
		await page.locator("#page-input").click();
		await expect(searchInput).not.toBeFocused();

		await page.keyboard.press("Control+f");

		await expect(searchInput).toBeVisible();
		await expect(searchInput).toBeFocused();
	});

	test("Escape clears the search input and removes focus", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		const searchInput = page.locator("#search-input");
		await searchInput.fill("test");
		await expect(searchInput).toHaveValue("test");

		// Escape while search input is focused should clear and blur it
		await page.keyboard.press("Escape");
		await expect(searchInput).toHaveValue("");
		await expect(searchInput).not.toBeFocused();
	});

	test("search elements (prev, next, input, count) are present inline", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

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

		const searchInput = page.locator("#search-input");
		await searchInput.click();
		await expect(searchInput).toBeFocused();

		// Press ArrowRight — should NOT flip to page 2
		await page.keyboard.press("ArrowRight");
		await expect(pageInput).toHaveValue("1");
	});

	test("clearing search input removes highlights", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);
		await page.waitForTimeout(2000);

		const searchInput = page.locator("#search-input");
		await searchInput.fill("lorem");

		const searchCount = page.locator("#search-count");
		await expect(searchCount).not.toHaveText("", { timeout: 10000 });

		// Wait for search mark to appear
		const highlights = page.locator("mark.search-mark");
		await expect(highlights.first()).toBeAttached();

		// Press escape
		await page.keyboard.press("Escape");

		// After clearing, no mark.search-mark elements should remain
		await expect(highlights).toHaveCount(0);
	});
});
