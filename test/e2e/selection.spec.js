const { test, expect } = require("@playwright/test");
const { openViewer, PLAIN } = require("./helpers");

test.describe("Text selection", () => {
	test("double-clicking a word selects it", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		const word = page.locator("#text-layer").getByText("marker1", { exact: false }).first();
		const box = await word.boundingBox();
		expect(box).not.toBeNull();
		// The span covers the whole line; the word "marker1" sits after "Page 1 alpha ".
		const x = box.x + box.width * (15 / 26);
		await page.mouse.dblclick(x, box.y + box.height / 2);
		const selected = await page.evaluate(() => window.getSelection().toString().trim());
		expect(selected).toBe("marker1");
	});

	test("dragging across a line selects the text under the drag", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		const line = page
			.locator("#text-layer span", { hasText: "Page 1 alpha marker1 alpha" })
			.first();
		const box = await line.boundingBox();
		const y = box.y + box.height / 2;
		await page.mouse.move(box.x + 1, y);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width - 1, y, { steps: 8 });
		await page.mouse.up();
		const selected = await page.evaluate(() => window.getSelection().toString().trim());
		expect(selected).toBe("Page 1 alpha marker1 alpha");
	});

	test("the canvas itself is not selectable", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		const userSelect = await page
			.locator("#pdf-canvas")
			.evaluate((c) => getComputedStyle(c).userSelect);
		expect(userSelect).toBe("none");
	});
});
