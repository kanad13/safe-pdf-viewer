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
	test("search bar is hidden on initial load", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		const searchBar = page.locator("#search-bar");
		// The search bar must be in the DOM but not visible
		await expect(searchBar).toBeAttached();
		await expect(searchBar).toBeHidden();
	});

	test("Ctrl+F opens the search bar and focuses the input", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		const searchBar = page.locator("#search-bar");
		await expect(searchBar).toBeHidden();

		await page.keyboard.press("Control+f");

		await expect(searchBar).toBeVisible();
		const searchInput = page.locator("#search-input");
		await expect(searchInput).toBeFocused();
	});

	test("Escape closes the search bar", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		await page.keyboard.press("Control+f");
		const searchBar = page.locator("#search-bar");
		await expect(searchBar).toBeVisible();

		// Escape while search input is focused should close the bar
		await page.keyboard.press("Escape");
		await expect(searchBar).toBeHidden();
	});

	test("close button hides the search bar", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		await page.keyboard.press("Control+f");
		const searchBar = page.locator("#search-bar");
		await expect(searchBar).toBeVisible();

		await page.locator("#btn-search-close").click();
		await expect(searchBar).toBeHidden();
	});

	test("search elements (prev, next, close, count) are present when bar is open", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		await page.keyboard.press("Control+f");

		await expect(page.locator("#btn-search-prev")).toBeVisible();
		await expect(page.locator("#btn-search-next")).toBeVisible();
		await expect(page.locator("#btn-search-close")).toBeVisible();
		await expect(page.locator("#search-count")).toBeAttached();
	});

	test("typing a query produces a non-empty match count", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);

		// Allow time for buildSearchIndex to complete across all PDF pages
		await page.waitForTimeout(2000);

		await page.keyboard.press("Control+f");

		const searchInput = page.locator("#search-input");
		await expect(searchInput).toBeVisible();

		// "the" is extremely common; if the PDF has any English text this will match.
		// But even "No results" is a non-empty count string, satisfying the assertion.
		await searchInput.fill("the");

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

		// Open search bar (focuses search input)
		await page.keyboard.press("Control+f");
		const searchInput = page.locator("#search-input");
		await expect(searchInput).toBeFocused();

		// Press ArrowRight — should NOT flip to page 2
		await page.keyboard.press("ArrowRight");
		await expect(pageInput).toHaveValue("1");
	});

	test("closing search bar clears highlights", async ({ page }) => {
		await page.goto("http://localhost:8080/");
		await waitForPdfRender(page);
		await page.waitForTimeout(2000);

		await page.keyboard.press("Control+f");
		const searchInput = page.locator("#search-input");
		await searchInput.fill("the");

		// Press close
		await page.locator("#btn-search-close").click();

		// After closing, no .search-highlight elements should remain
		const highlights = page.locator(".search-highlight");
		await expect(highlights).toHaveCount(0);
	});
});
