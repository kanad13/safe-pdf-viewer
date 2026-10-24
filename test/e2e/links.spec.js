const { test, expect } = require("@playwright/test");
const { openViewer, waitForPage, posted, LINKS } = require("./helpers");

// links.pdf page 1: https link (y 600), javascript: link (y 500), internal link to page 3 (y 400).

test.describe("Hyperlinks", () => {
	test("renders one overlay per link annotation", async ({ page }) => {
		await openViewer(page, { pdf: LINKS });
		await expect(page.locator("#annotation-layer .linkAnnotation")).toHaveCount(3);
	});

	test("an https link is handed to the extension host and the page stays put", async ({ page }) => {
		await openViewer(page, { pdf: LINKS });
		await page.locator("#annotation-layer .linkAnnotation").nth(0).click();
		await expect
			.poll(async () => (await posted(page)).filter((m) => m.type === "openLink"))
			.toEqual([{ type: "openLink", url: "https://example.com/safe" }]);
		await expect(page.locator("#page-input")).toHaveValue("1");
	});

	test("a javascript: link does nothing", async ({ page }) => {
		const problems = await openViewer(page, { pdf: LINKS });
		// PDF.js drops the unsafe target, so the overlay has no anchor to click at all.
		await expect(page.locator("#annotation-layer .linkAnnotation").nth(1).locator("a")).toHaveCount(
			0,
		);
		await page.locator("#annotation-layer .linkAnnotation").nth(1).click({ force: true });
		await page.waitForTimeout(300);
		expect((await posted(page)).filter((m) => m.type === "openLink")).toEqual([]);
		expect(problems.errors).toEqual([]);
		expect(await page.violations()).toEqual([]);
	});

	test("an internal link jumps to its target page", async ({ page }) => {
		await openViewer(page, { pdf: LINKS });
		await page.locator("#annotation-layer .linkAnnotation").nth(2).click();
		await waitForPage(page, 3);
	});

	test("link overlays do not block text selection on the rest of the page", async ({ page }) => {
		await openViewer(page, { pdf: LINKS });
		const pointerEvents = await page
			.locator("#annotation-layer")
			.evaluate((el) => getComputedStyle(el).pointerEvents);
		expect(pointerEvents).toBe("none");
	});
});
