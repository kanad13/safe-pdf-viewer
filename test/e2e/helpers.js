const { expect } = require("@playwright/test");

const BASE = "http://localhost:8080/";
const PLAIN = "/test/fixtures/plain.pdf";
const LINKS = "/test/fixtures/links.pdf";
const PASSWORD = "/test/fixtures/password.pdf";
const EULER = "/examples/test.pdf";

/**
 * Opens the viewer on a fixture and records what the CSP and the page report.
 *
 * Counting canvas size assignments (one per render) lets tests assert how many renders ran
 * without reaching into the page's module scope.
 *
 * @param {import("@playwright/test").Page} page
 * @param {{pdf?: string, password?: string, zoom?: string, state?: object, wait?: boolean, startPage?: number}} [options]
 * @returns {Promise<{violations: string[], errors: string[]}>} Live-updated problem lists
 */
async function openViewer(page, options = {}) {
	const { pdf = PLAIN, password, zoom, state, wait = true, startPage = 1 } = options;
	const problems = { violations: [], errors: [] };
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			problems.errors.push(msg.text());
		}
	});
	page.on("pageerror", (err) => problems.errors.push(String(err)));
	await page.addInitScript((initialState) => {
		window.__initialState = initialState;
		window.__renders = 0;
		const desc = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "width");
		Object.defineProperty(HTMLCanvasElement.prototype, "width", {
			...desc,
			set(value) {
				if (this.id === "pdf-canvas") {
					window.__renders += 1;
				}
				desc.set.call(this, value);
			},
		});
		document.addEventListener("securitypolicyviolation", (e) => {
			window.__violations = (window.__violations || []).concat(
				`${e.violatedDirective} ${e.blockedURI}`,
			);
		});
	}, state ?? null);
	const params = new URLSearchParams({ pdf });
	if (password !== undefined) {
		params.set("password", password);
	}
	if (zoom) {
		params.set("zoom", zoom);
	}
	await page.goto(`${BASE}?${params}`);
	if (wait) {
		await waitForPage(page, startPage);
	}
	page.violations = async () => page.evaluate(() => window.__violations || []);
	return problems;
}

/**
 * Waits until the toolbar shows the page and its text layer is populated.
 *
 * @param {import("@playwright/test").Page} page
 * @param {number} n - Expected page number
 */
async function waitForPage(page, n) {
	await expect(page.locator("#page-input")).toHaveValue(String(n));
	await expect(page.locator("#text-layer span").first()).toBeAttached();
}

/**
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<object[]>} Messages the page posted to the extension host
 */
function posted(page) {
	return page.evaluate(() => window.__posted);
}

/**
 * Waits until the search index covers the document by retrying the query until it matches.
 *
 * @param {import("@playwright/test").Page} page
 * @param {string} query
 * @param {string} expectedCount - Text expected in #search-count, e.g. "1 of 6"
 */
async function search(page, query, expectedCount) {
	await page.keyboard.press("Control+f");
	await page.locator("#search-input").fill(query);
	await expect(page.locator("#search-count")).toHaveText(expectedCount, { timeout: 15000 });
}

module.exports = { openViewer, waitForPage, posted, search, PLAIN, LINKS, PASSWORD, EULER };
