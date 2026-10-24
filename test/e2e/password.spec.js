const { test, expect } = require("@playwright/test");
const { openViewer, waitForPage, posted, PASSWORD, PLAIN } = require("./helpers");

const prompts = async (page) => (await posted(page)).filter((m) => m.type === "passwordRequired");

test.describe("Password-protected PDFs", () => {
	test("an unprotected file never asks for a password", async ({ page }) => {
		await openViewer(page, { pdf: PLAIN });
		expect(await prompts(page)).toEqual([]);
	});

	test("asks once, then renders with the right password", async ({ page }) => {
		await openViewer(page, { pdf: PASSWORD, password: "secret" });
		await waitForPage(page, 1);
		expect(await prompts(page)).toEqual([{ type: "passwordRequired", isWrongPassword: false }]);
		await expect(page.locator("#text-layer")).toContainText("Page 1 alpha");
	});

	test("asks again after a wrong password and gives up after three tries", async ({ page }) => {
		await openViewer(page, { pdf: PASSWORD, password: "nope", wait: false });
		await expect(page.locator(".status-message")).toHaveText(
			"Too many incorrect password attempts.",
		);
		expect(await prompts(page)).toEqual([
			{ type: "passwordRequired", isWrongPassword: false },
			{ type: "passwordRequired", isWrongPassword: true },
			{ type: "passwordRequired", isWrongPassword: true },
		]);
	});

	test("cancelling the prompt leaves a clear message", async ({ page }) => {
		await openViewer(page, { pdf: PASSWORD, wait: false });
		await expect(page.locator(".status-message")).toHaveText("Password required to open this PDF.");
		expect(await prompts(page)).toHaveLength(1);
	});

	test("the password never reaches the console or the DOM", async ({ page }) => {
		const logs = [];
		page.on("console", (m) => logs.push(m.text()));
		await openViewer(page, { pdf: PASSWORD, password: "secret" });
		expect(logs.join("\n")).not.toContain("secret");
		expect(await page.content()).not.toContain("secret");
	});
});
