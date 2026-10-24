const { test, expect } = require("@playwright/test");
const { openViewer, waitForPage, PLAIN, EULER } = require("./helpers");

test.describe("Navigation", () => {
	test("next and previous buttons move one page and stop at the ends", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		await page.locator("#btn-next").click();
		await waitForPage(page, 2);
		await page.locator("#btn-next").click();
		await waitForPage(page, 3);
		await expect(page.locator("#btn-next")).toBeDisabled();
		await page.locator("#btn-prev").click();
		await waitForPage(page, 2);
	});

	test("arrow, page and vertical keys turn pages", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		await page.keyboard.press("ArrowRight");
		await waitForPage(page, 2);
		await page.keyboard.press("PageDown");
		await waitForPage(page, 3);
		await page.keyboard.press("ArrowUp");
		await waitForPage(page, 2);
		await page.keyboard.press("PageUp");
		await waitForPage(page, 1);
	});

	test("rapid key presses continue from the latest requested page", async ({ page }) => {
		await openViewer(page, { pdf: EULER });
		for (let i = 0; i < 5; i++) {
			await page.keyboard.press("ArrowRight");
		}
		await waitForPage(page, 6);
	});

	test("rapid navigation leaves no render error behind", async ({ page }) => {
		const problems = await openViewer(page, { pdf: EULER });
		for (let i = 0; i < 8; i++) {
			await page.keyboard.press(i % 3 === 2 ? "ArrowLeft" : "ArrowRight");
		}
		await waitForPage(page, 5);
		await expect(page.locator(".status-message")).toHaveCount(0);
		expect(problems.errors).toEqual([]);
	});

	test("typing a page number jumps there and clamps out-of-range values", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		const input = page.locator("#page-input");
		await input.fill("3");
		await input.press("Enter");
		await input.blur();
		await waitForPage(page, 3);
		await input.fill("99");
		await input.blur();
		await waitForPage(page, 3);
		await input.fill("0");
		await input.blur();
		await waitForPage(page, 3);
		await input.fill("-5");
		await input.blur();
		await waitForPage(page, 1);
	});

	test("keys typed in the page field do not turn pages", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		await page.locator("#page-input").focus();
		await page.keyboard.press("ArrowRight");
		await expect(page.locator("#page-input")).toHaveValue("1");
	});
});
