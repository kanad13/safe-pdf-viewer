/* global document */
const { test, expect } = require("@playwright/test");

test.describe("Password-protected PDFs", () => {
	test("normal PDF loads without triggering password flow", async ({ page }) => {
		const passwordMessages = [];
		page.on("console", (msg) => {
			const text = msg.text();
			if (text.includes("passwordRequired")) {
				passwordMessages.push(text);
			}
		});

		await page.goto("http://localhost:8080/");

		// Wait for canvas to render — same pattern as renders-canvas.spec.js
		await page.waitForFunction(
			() => {
				const c = document.getElementById("pdf-canvas");
				return c && c.width > 0 && c.height > 0;
			},
			{ timeout: 15000 },
		);

		// A non-password PDF must not trigger the passwordRequired flow
		expect(passwordMessages).toHaveLength(0);
	});

	test("password flow infrastructure is present in page source", async ({ page }) => {
		await page.goto("http://localhost:8080/");

		// Verify page source (served webview.html) contains password flow functions
		const source = await page.content();
		expect(source).toContain("waitForPasswordReply");
		expect(source).toContain("loadPdf");
		expect(source).toContain("passwordRequired");

		// Confirm no console.log of a password value is wired up
		const hasPasswordLog = await page.evaluate(() => {
			const scripts = Array.from(document.querySelectorAll("script"));
			return scripts.some((s) =>
				s.textContent.includes("console.log") &&
				s.textContent.includes("password"),
			);
		});
		expect(hasPasswordLog).toBe(false);
	});
});
