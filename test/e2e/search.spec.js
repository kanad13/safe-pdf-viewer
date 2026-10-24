const { test, expect } = require("@playwright/test");
const { openViewer, waitForPage, search, PLAIN } = require("./helpers");

// plain.pdf: three pages, each reading "Page N alpha markerN alpha" (6 matches for "alpha").

test.describe("Find in document", () => {
	test("Ctrl+F opens a focused panel; Escape closes it and clears the query", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		await expect(page.locator("#find-panel")).not.toBeVisible();
		await page.keyboard.press("Control+f");
		await expect(page.locator("#find-panel")).toBeVisible();
		await expect(page.locator("#search-input")).toBeFocused();
		await page.locator("#search-input").fill("alpha");
		await page.keyboard.press("Escape");
		await expect(page.locator("#find-panel")).not.toBeVisible();
		await expect(page.locator("#search-input")).toHaveValue("");
	});

	test("Cmd+F opens the panel too", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		await page.keyboard.press("Meta+f");
		await expect(page.locator("#find-panel")).toBeVisible();
	});

	test("counts matches across all pages and highlights those on the current page", async ({
		page,
	}) => {
		await openViewer(page, { pdf: PLAIN });
		await search(page, "alpha", "1 of 6");
		await expect(page.locator("mark.search-mark")).toHaveCount(2);
		await expect(page.locator("mark.search-highlight-current")).toHaveCount(1);
	});

	test("matching ignores case", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		await search(page, "ALPHA", "1 of 6");
	});

	test("Enter moves to the next match across pages; Shift+Enter goes back and wraps", async ({
		page,
	}) => {
		await openViewer(page, { pdf: PLAIN });
		await search(page, "alpha", "1 of 6");
		const input = page.locator("#search-input");
		await input.press("Enter");
		await expect(page.locator("#search-count")).toHaveText("2 of 6");
		await input.press("Enter");
		await expect(page.locator("#search-count")).toHaveText("3 of 6");
		await waitForPage(page, 2);
		await input.press("Shift+Enter");
		await input.press("Shift+Enter");
		await input.press("Shift+Enter");
		await expect(page.locator("#search-count")).toHaveText("6 of 6");
		await waitForPage(page, 3);
	});

	test("the prev and next buttons step through matches", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		await search(page, "alpha", "1 of 6");
		await page.locator("#btn-search-next").click();
		await expect(page.locator("#search-count")).toHaveText("2 of 6");
		await page.locator("#btn-search-prev").click();
		await expect(page.locator("#search-count")).toHaveText("1 of 6");
	});

	test("reports when nothing matches and leaves no highlight", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		await search(page, "zzzz", "No results");
		await expect(page.locator("mark.search-mark")).toHaveCount(0);
	});

	test("highlighting wraps only the matched text and keeps the rest of the line", async ({
		page,
	}) => {
		await openViewer(page, { pdf: PLAIN });
		await search(page, "marker1", "1 of 1");
		await expect(page.locator("mark.search-mark")).toHaveText("marker1");
		await expect(page.locator("#text-layer")).toContainText("Page 1 alpha marker1 alpha");
	});

	test("clearing the query removes highlights", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		await search(page, "alpha", "1 of 6");
		await page.locator("#search-input").fill("");
		await expect(page.locator("#search-count")).toHaveText("");
		await expect(page.locator("mark.search-mark")).toHaveCount(0);
	});

	test("a query typed before the document loads is answered once it has", async ({ page }) => {
		// Hold the file back so the query is typed while no index exists.
		await page.route("**/test/fixtures/plain.pdf", async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 600));
			await route.continue();
		});
		await openViewer(page, { pdf: PLAIN, wait: false });
		await page.keyboard.press("Control+f");
		await page.locator("#search-input").fill("alpha");
		await expect(page.locator("#search-count")).toHaveText("No results");
		await expect(page.locator("#search-count")).toHaveText("1 of 6", { timeout: 15000 });
	});

	test("document text is never interpreted as markup when highlighted", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		await search(page, "alpha", "1 of 6");
		const injected = await page
			.locator("#text-layer")
			.evaluate((el) => el.querySelectorAll("img,script,iframe").length);
		expect(injected).toBe(0);
	});

	test("arrow keys inside the search box do not turn pages", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		await page.keyboard.press("Control+f");
		await page.keyboard.press("ArrowRight");
		await expect(page.locator("#page-input")).toHaveValue("1");
	});
});
