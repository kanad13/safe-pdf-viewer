const { test, expect } = require("@playwright/test");
const { openViewer, waitForPage, EULER } = require("./helpers");

const renders = (page) => page.evaluate(() => window.__renders);

test.describe("Timers and teardown", () => {
	test("resizing re-renders once after the debounce, not per resize event", async ({ page }) => {
		await openViewer(page, { pdf: EULER });
		await page.clock.install();
		const before = await renders(page);
		// Dispatched by hand: viewport resizes arrive as real-time events that the fake clock cannot order.
		for (let i = 0; i < 3; i++) {
			await page.evaluate(() => window.dispatchEvent(new Event("resize")));
			await page.clock.runFor(50);
		}
		// 100 ms after the last resize: still inside the 150 ms debounce window.
		await page.clock.runFor(50);
		expect(await renders(page)).toBe(before);
		await page.clock.runFor(100);
		await expect.poll(() => renders(page)).toBe(before + 1);
	});

	test("a resize does not re-render when the zoom is fixed", async ({ page }) => {
		await openViewer(page, { pdf: EULER, zoom: "100" });
		await page.clock.install();
		const before = await renders(page);
		await page.evaluate(() => window.dispatchEvent(new Event("resize")));
		await page.clock.runFor(1000);
		expect(await renders(page)).toBe(before);
	});

	test("wheel navigation turns one page per cooldown window at the scroll boundary", async ({
		page,
	}) => {
		await openViewer(page, { pdf: EULER, zoom: "50" });
		await page.clock.install();
		const box = await page.locator("#viewport").boundingBox();
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.wheel(0, 100);
		await page.mouse.wheel(0, 100);
		await page.mouse.wheel(0, 100);
		await waitForPage(page, 2);
		await page.clock.runFor(450);
		await page.mouse.wheel(0, 100);
		await waitForPage(page, 3);
	});

	test("scrolling up on the first page stays on the first page", async ({ page }) => {
		await openViewer(page, { pdf: EULER });
		const box = await page.locator("#viewport").boundingBox();
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.wheel(0, -100);
		await page.waitForTimeout(200);
		await expect(page.locator("#page-input")).toHaveValue("1");
	});

	test("closing the page cancels work and destroys the document without errors", async ({
		page,
	}) => {
		const problems = await openViewer(page, { pdf: EULER });
		await page.keyboard.press("ArrowRight");
		await page.close();
		expect(problems.errors).toEqual([]);
	});

	test("a message without an object payload is ignored", async ({ page }) => {
		const problems = await openViewer(page, { pdf: EULER });
		await page.evaluate(() => {
			window.postMessage(null, "*");
			window.postMessage("text", "*");
		});
		// One macrotask lets the message events run before the check.
		await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
		expect(problems.errors).toEqual([]);
		await waitForPage(page, 1);
	});
});
