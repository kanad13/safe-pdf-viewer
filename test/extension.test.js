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
	id: "vscode", filename: "vscode", loaded: true,
	exports: {
		workspace: {
			getConfiguration: () => ({ get: (_key, defaultVal) => defaultVal }),
			onDidChangeTextDocument:   () => ({ dispose() {} }),
			onDidChangeConfiguration:  () => ({ dispose() {} }),
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
			joinPath: (...args) => ({ fsPath: args.join("/"), toString: () => args.join("/") }),
			file: (p) => ({ fsPath: p, toString: () => p }),
		},
	}
};

const { getNonce, getDefaultZoom, getWebviewContent } = require("../src/extension");

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
		// Stub returns the defaultVal we pass → "fit-width"
		const validValues = ["fit-width", "fit-page", "50", "75", "100", "125", "150", "200"];
		assert.ok(validValues.includes(getDefaultZoom()));
	});
});

// ── getWebviewContent ──────────────────────────────────────────────────────────

describe("getWebviewContent", () => {

	// Stub panel: asWebviewUri simply prefixes the URI toString() with a fake scheme
	const stubPanel = {
		webview: {
			asWebviewUri: (uri) => ({ toString: () => `vscode-resource:${uri.toString()}` }),
		},
	};
	const stubExtensionUri = { fsPath: "/stub/ext", toString: () => "/stub/ext" };
	const stubPdfUri       = { fsPath: "/stub/test.pdf", toString: () => "/stub/test.pdf" };
	const stubNonce        = "A".repeat(32);

	/** Helper — call once, reuse output across assertions in a single test. */
	function render() {
		return getWebviewContent(stubPanel, stubPdfUri, stubExtensionUri, stubNonce);
	}

	it("replaces {{NONCE}} with the provided nonce value", () => {
		const html = render();
		assert.ok(!html.includes("{{NONCE}}"), "{{NONCE}} token still present in output");
		assert.ok(html.includes(stubNonce), "nonce value not found in output");
	});

	it("replaces {{PDFJS_URI}} token", () => {
		assert.ok(!render().includes("{{PDFJS_URI}}"), "{{PDFJS_URI}} token still present");
	});

	it("replaces {{WORKER_URI}} token", () => {
		assert.ok(!render().includes("{{WORKER_URI}}"), "{{WORKER_URI}} token still present");
	});

	it("replaces {{DEFAULT_ZOOM}} token", () => {
		assert.ok(!render().includes("{{DEFAULT_ZOOM}}"), "{{DEFAULT_ZOOM}} token still present");
	});

	it("leaves no unresolved {{...}} tokens in output", () => {
		assert.doesNotMatch(render(), /\{\{[A-Z_]+\}\}/,
			"Output still contains unresolved template tokens");
	});

	it("CSP script-src contains nonce-<value>", () => {
		assert.ok(render().includes(`nonce-${stubNonce}`),
			"CSP nonce attribute not found in output");
	});

	it("CSP contains default-src 'none'", () => {
		assert.ok(render().includes("default-src 'none'"),
			"CSP default-src 'none' not found in output");
	});
});

// ── Integration smoke tests (no webview) ──────────────────────────────────────
// They do NOT test rendering — that requires the VS Code Extension Host.

describe("extension lifecycle", () => {
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
});
