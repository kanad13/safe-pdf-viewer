const { test, expect } = require("@playwright/test");
const { openViewer, PLAIN, EULER } = require("./helpers");

const canvasWidth = (page) =>
	page.locator("#pdf-canvas").evaluate((c) => parseInt(c.style.width, 10));

test.describe("Zoom", () => {
	test("fit-page shows the whole page without scrollbars", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		const overflow = await page.evaluate(() => {
			const v = document.getElementById("viewport");
			return { x: v.scrollWidth > v.clientWidth, y: v.scrollHeight > v.clientHeight };
		});
		expect(overflow).toEqual({ x: false, y: false });
	});

	test("zoom steps follow the offered levels in both directions", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN, zoom: "100" });
		const at100 = await canvasWidth(page);
		await page.locator("#btn-zoom-in").click();
		await expect.poll(() => canvasWidth(page)).toBe(Math.round(at100 * 1.25));
		await page.locator("#btn-zoom-out").click();
		await expect.poll(() => canvasWidth(page)).toBe(at100);
		await page.locator("#btn-zoom-out").click();
		await expect.poll(() => canvasWidth(page)).toBe(Math.round(at100 * 0.75));
	});

	test("+ and - keys zoom and stop at 200% and 50%", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN, zoom: "100" });
		const at100 = await canvasWidth(page);
		for (let i = 0; i < 6; i++) {
			await page.keyboard.press("+");
		}
		await expect.poll(() => canvasWidth(page)).toBe(at100 * 2);
		for (let i = 0; i < 8; i++) {
			await page.keyboard.press("-");
		}
		await expect.poll(() => canvasWidth(page)).toBe(at100 / 2);
	});

	test("the default zoom setting decides the starting size", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN, zoom: "50" });
		const half = await canvasWidth(page);
		await page.locator("#btn-zoom-in").click();
		await page.locator("#btn-zoom-in").click();
		await expect.poll(() => canvasWidth(page)).toBe(Math.round(half * 2));
	});

	test("Fit Page after zooming in returns to the fitted size without scrollbars", async ({
		page,
	}) => {
		await openViewer(page, { pdf: EULER });
		const fitted = await canvasWidth(page);
		for (let i = 0; i < 3; i++) {
			await page.locator("#btn-zoom-in").click();
		}
		await expect.poll(() => canvasWidth(page)).toBeGreaterThan(fitted);
		await page.locator("#btn-zoom-fit").click();
		await expect.poll(() => canvasWidth(page)).toBe(fitted);
		// Layout settles after the render finishes, so assert on the settled state.
		await expect
			.poll(() =>
				page.evaluate(() => {
					const v = document.getElementById("viewport");
					return v.scrollWidth > v.clientWidth;
				}),
			)
			.toBe(false);
	});

	test("the text layer scale follows the zoom", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN, zoom: "100" });
		const factor = () =>
			page
				.locator("#text-layer")
				.evaluate((el) => parseFloat(el.style.getPropertyValue("--scale-factor")));
		expect(await factor()).toBeCloseTo(1, 5);
		await page.locator("#btn-zoom-in").click();
		await expect.poll(factor).toBeCloseTo(1.25, 5);
	});

	test("text layer runs are sized and stretched from the values PDF.js sets", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN, zoom: "100" });
		const run = () =>
			page
				.locator("#text-layer span")
				.first()
				.evaluate((el) => ({
					fontHeight: parseFloat(el.style.getPropertyValue("--font-height")),
					fontSize: parseFloat(getComputedStyle(el).fontSize),
					scaleX: parseFloat(el.style.getPropertyValue("--scale-x")),
					stretch: new window.DOMMatrix(getComputedStyle(el).transform).a,
				}));
		const at100 = await run();
		// Without the stylesheet rule the run keeps the browser's 16 px default, and selection and
		// search highlights drift away from the text drawn on the canvas.
		expect(at100.fontSize).toBeCloseTo(at100.fontHeight, 1);
		expect(at100.stretch).toBeCloseTo(at100.scaleX, 3);
		await page.locator("#btn-zoom-in").click();
		await expect.poll(async () => (await run()).fontSize).toBeCloseTo(at100.fontHeight * 1.25, 1);
	});
});
