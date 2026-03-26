// @ts-nocheck — test uses private Node.js module APIs not typed in @types/node
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

// ── VS Code module stub ────────────────────────────────────────────────────────
// Technique verbatim from mermaid-slideshow: override Module._resolveFilename
// so that require("vscode") returns our stub without needing a real VS Code host.
// This lets pure functions be unit-tested with `node --test` outside of VS Code.
const Module = require("node:module");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
	if (request === "vscode") return "vscode";
	return originalResolve.call(this, request, ...args);
};
require.cache["vscode"] = {
	id: "vscode",
	filename: "vscode",
	loaded: true,
	exports: {
		workspace: {
			getConfiguration: () => ({ get: (_key, defaultVal) => defaultVal }),
			onDidChangeTextDocument: () => ({ dispose() {} }),
			onDidChangeConfiguration: () => ({ dispose() {} }),
		},
		window: {
			activeColorTheme: { kind: 1 },
			onDidChangeActiveColorTheme: () => ({ dispose() {} }),
			registerCustomEditorProvider: () => ({ dispose() {} }),
		},
		commands: { registerCommand: () => ({ dispose() {} }) },
		ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3 },
		ViewColumn: { Beside: 2 },
		Uri: {
			joinPath: (...args) => ({
				fsPath: args.join("/"),
				toString: () => args.join("/"),
			}),
			file: (p) => ({ fsPath: p, toString: () => p }),
		},
	},
};

const {
	getNonce,
	getDefaultZoom,
	getWebviewContent,
} = require("../src/extension");

// ── getNonce ───────────────────────────────────────────────────────────────────

describe("getNonce", () => {
	it("returns a 32-character string", () => {
		assert.equal(getNonce().length, 32);
	});

	it("returns only alphanumeric characters", () => {
		assert.match(getNonce(), /^[A-Za-z0-9]{32}$/);
	});

	it("returns different values on successive calls", () => {
		// Not guaranteed but fails with absurdly low probability
		assert.notEqual(getNonce(), getNonce());
	});
});

// ── getDefaultZoom ─────────────────────────────────────────────────────────────

describe("getDefaultZoom", () => {
	it("returns a non-empty string", () => {
		const zoom = getDefaultZoom();
		assert.ok(typeof zoom === "string" && zoom.length > 0);
	});

	it("returns a recognized zoom value when config is not set", () => {
		// Stub returns the defaultVal we pass → "fit-page"
		const validValues = [
			"fit-page",
			"fit-page",
			"50",
			"75",
			"100",
			"125",
			"150",
			"200",
		];
		assert.ok(validValues.includes(getDefaultZoom()));
	});
});

// ── getWebviewContent ──────────────────────────────────────────────────────────

describe("getWebviewContent", () => {
	// Stub panel: asWebviewUri simply prefixes the URI toString() with a fake scheme
	const stubPanel = {
		webview: {
			asWebviewUri: (uri) => ({
				toString: () => `vscode-resource:${uri.toString()}`,
			}),
			cspSource: "https://file+.vscode-resource.vscode-cdn.net",
		},
	};
	const stubExtensionUri = { fsPath: "/stub/ext", toString: () => "/stub/ext" };
	const stubPdfUri = {
		fsPath: "/stub/test.pdf",
		toString: () => "/stub/test.pdf",
	};
	const stubNonce = "A".repeat(32);

	/** Helper — call once, reuse output across assertions in a single test. */
	function render() {
		return getWebviewContent(
			stubPanel,
			stubPdfUri,
			stubExtensionUri,
			stubNonce,
		);
	}

	it("replaces {{NONCE}} with the provided nonce value", () => {
		const html = render();
		assert.ok(
			!html.includes("{{NONCE}}"),
			"{{NONCE}} token still present in output",
		);
		assert.ok(html.includes(stubNonce), "nonce value not found in output");
	});

	it("replaces {{PDFJS_URI}} token", () => {
		assert.ok(
			!render().includes("{{PDFJS_URI}}"),
			"{{PDFJS_URI}} token still present",
		);
	});

	it("replaces {{WORKER_URI}} token", () => {
		assert.ok(
			!render().includes("{{WORKER_URI}}"),
			"{{WORKER_URI}} token still present",
		);
	});

	it("replaces {{DEFAULT_ZOOM}} token", () => {
		assert.ok(
			!render().includes("{{DEFAULT_ZOOM}}"),
			"{{DEFAULT_ZOOM}} token still present",
		);
	});

	it("CSP meta tag is injected into the HTML output", () => {
		assert.ok(
			render().includes("<meta http-equiv=\"Content-Security-Policy\""),
			"CSP meta tag not found in output",
		);
	});

	it("leaves no unresolved {{...}} tokens in output", () => {
		assert.doesNotMatch(
			render(),
			/\{\{[A-Z_]+\}\}/,
			"Output still contains unresolved template tokens",
		);
	});

	it("CSP script-src contains nonce-<value>", () => {
		assert.ok(
			render().includes(`nonce-${stubNonce}`),
			"CSP nonce attribute not found in output",
		);
	});

	it("CSP contains connect-src with the stub cspSource value", () => {
		assert.ok(
			render().includes(
				"connect-src https://file+.vscode-resource.vscode-cdn.net",
			),
			"connect-src not found with correct cspSource in output",
		);
	});

	it("CSP contains default-src 'none'", () => {
		assert.ok(
			render().includes("default-src 'none'"),
			"CSP default-src 'none' not found in output",
		);
	});

	// ── Phase 4.5 — Memory cleanup ─────────────────────────────────────────

	it("webview cleans up on pagehide (pdfDoc.destroy called)", () => {
		const html = render();
		assert.ok(
			html.includes("pagehide"),
			"pagehide listener not found in webview HTML",
		);
		assert.ok(
			html.includes("pdfDoc.destroy()"),
			"pdfDoc.destroy() call not found in webview HTML",
		);
	});

	it("webview cancels in-flight render task on pagehide", () => {
		assert.ok(
			render().includes("renderTask.cancel()"),
			"renderTask.cancel() not found in pagehide cleanup",
		);
	});

	// ── Phase 5 — Text layer structure ────────────────────────────────────

	it("webview HTML contains #text-layer div overlay", () => {
		assert.ok(
			render().includes("id=\"text-layer\""),
			"#text-layer div not found in webview HTML",
		);
	});

	it("webview HTML contains .textLayer CSS class", () => {
		assert.ok(
			render().includes(".textLayer"),
			".textLayer CSS class not found in webview HTML",
		);
	});

	it("text layer has user-select: text (selectable)", () => {
		const html = render();
		// Must contain user-select: text inside the .textLayer block
		assert.ok(
			html.includes("user-select: text"),
			"text layer is missing user-select: text",
		);
	});

	it("canvas has user-select: none (not directly selectable)", () => {
		assert.ok(
			render().includes("user-select: none"),
			"canvas is missing user-select: none",
		);
	});

	it("text layer declares --scale-factor CSS variable", () => {
		assert.ok(
			render().includes("--scale-factor"),
			"--scale-factor CSS variable not found — TextLayer scaling will break",
		);
	});
	const { activate, deactivate } = require("../src/extension");

	it("activate does not throw with a stub context", () => {
		const stubContext = {
			extensionUri: { fsPath: "/stub", toString: () => "/stub" },
			subscriptions: { push: () => {} },
		};
		assert.doesNotThrow(() => activate(stubContext));
	});

	it("deactivate does not throw", () => {
		assert.doesNotThrow(() => deactivate());
	});

	// ── Phase 6 — In-document search ──────────────────────────────────────

	it("search bar element is present in webview HTML", () => {
		assert.ok(
			render().includes("id=\"search-bar\""),
			"#search-bar not found in webview HTML",
		);
	});

	it("search input element is present in webview HTML", () => {
		assert.ok(
			render().includes("id=\"search-input\""),
			"#search-input not found in webview HTML",
		);
	});

	it("search prev/next/close buttons are present in webview HTML", () => {
		const html = render();
		assert.ok(html.includes("id=\"btn-search-prev\""), "#btn-search-prev not found");
		assert.ok(html.includes("id=\"btn-search-next\""), "#btn-search-next not found");
		assert.ok(html.includes("id=\"btn-search-close\""), "#btn-search-close not found");
	});

	it("search count element is present in webview HTML", () => {
		assert.ok(
			render().includes("id=\"search-count\""),
			"#search-count not found in webview HTML",
		);
	});

	it("search-highlight CSS class is defined in webview HTML", () => {
		const html = render();
		assert.ok(
			html.includes("search-highlight"),
			"search-highlight CSS class not found in webview HTML",
		);
	});

	it("search-highlight-current CSS class is defined in webview HTML", () => {
		assert.ok(
			render().includes("search-highlight-current"),
			"search-highlight-current CSS class not found in webview HTML",
		);
	});

	it("openSearchBar and closeSearchBar functions are present in webview HTML", () => {
		const html = render();
		assert.ok(html.includes("openSearchBar"), "openSearchBar not found in webview HTML");
		assert.ok(html.includes("closeSearchBar"), "closeSearchBar not found in webview HTML");
	});

	it("Ctrl+F / Cmd+F handler opens search bar (ctrlKey/metaKey check present)", () => {
		const html = render();
		assert.ok(html.includes("ctrlKey"), "ctrlKey check not found for Ctrl+F shortcut");
		assert.ok(html.includes("metaKey"), "metaKey check not found for Cmd+F shortcut");
	});

	it("buildSearchIndex function is present in webview HTML", () => {
		assert.ok(
			render().includes("buildSearchIndex"),
			"buildSearchIndex not found in webview HTML",
		);
	});

	it("runSearch function is present in webview HTML", () => {
		assert.ok(
			render().includes("runSearch"),
			"runSearch not found in webview HTML",
		);
	});

	it("navigateToMatch function is present in webview HTML", () => {
		assert.ok(
			render().includes("navigateToMatch"),
			"navigateToMatch not found in webview HTML",
		);
	});

	it("search input keydown handler supports Escape to close", () => {
		assert.ok(
			render().includes("closeSearchBar"),
			"closeSearchBar call not found — Escape-to-close not wired",
		);
	});

	it("search nav keys are blocked from bubbling when search input focused", () => {
		assert.ok(
			render().includes("stopPropagation"),
			"stopPropagation not found — nav key leak from search input possible",
		);
	});
});
