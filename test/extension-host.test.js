/**
 * Unit tests for the extension host: nonce, zoom setting, link filtering, the webview
 * message handler (including the password round trip), editor setup and activation.
 * They call the exported functions with the shared fake `vscode` module.
 */
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const stub = require("./helpers/vscode-stub");
const {
	activate,
	deactivate,
	getNonce,
	getDefaultZoom,
	createMessageHandler,
	toExternalUrl,
	SafePdfEditorProvider,
} = require("../src/extension");

const pdfUri = stub.makeUri("/docs/papers/sample.pdf");
const extensionUri = stub.makeUri("/ext");

beforeEach(() => stub.reset());

describe("getNonce", () => {
	it("returns 32 lowercase hex characters", () => {
		assert.match(getNonce(), /^[0-9a-f]{32}$/);
	});

	it("does not repeat across many calls", () => {
		const seen = new Set(Array.from({ length: 500 }, getNonce));
		assert.equal(seen.size, 500);
	});

	it("draws from the operating system's random source", (t) => {
		const crypto = require("node:crypto");
		const spy = t.mock.method(crypto, "randomBytes");
		getNonce();
		assert.equal(spy.mock.callCount(), 1);
		assert.equal(spy.mock.calls[0].arguments[0], 16);
	});
});

describe("getDefaultZoom", () => {
	for (const value of ["fit-page", "50", "75", "100", "125", "150", "200"]) {
		it(`passes through the configured value ${value}`, () => {
			stub.state.config.defaultZoom = value;
			assert.equal(getDefaultZoom(), value);
		});
	}

	for (const value of ["300", "", 100, null, "fit-width"]) {
		it(`falls back to fit-page for ${JSON.stringify(value)}`, () => {
			stub.state.config.defaultZoom = value;
			assert.equal(getDefaultZoom(), "fit-page");
		});
	}
});

describe("toExternalUrl", () => {
	it("accepts http and https and returns the normalised href", () => {
		assert.equal(toExternalUrl("https://example.com"), "https://example.com/");
		assert.equal(toExternalUrl("http://example.com/a?b=1"), "http://example.com/a?b=1");
	});

	for (const url of [
		"javascript:alert(1)",
		"data:text/html,<script>alert(1)</script>",
		"file:///etc/passwd",
		"vscode://file/etc/passwd",
		"command:workbench.action.reloadWindow",
		"//example.com",
		"example.com",
		"",
		undefined,
		null,
		42,
		{ href: "https://example.com" },
	]) {
		it(`rejects ${JSON.stringify(url)}`, () => {
			assert.equal(toExternalUrl(url), null);
		});
	}
});

describe("message handler", () => {
	let fake;
	let handle;

	beforeEach(() => {
		fake = stub.createFakePanel();
		handle = createMessageHandler(fake.panel.webview, pdfUri);
	});

	it("answers ready with the webview URI of the document", async () => {
		await handle({ type: "ready" });
		assert.deepEqual(fake.posted, [{ type: "init", pdfUrl: "webview:/docs/papers/sample.pdf" }]);
	});

	it("prompts with a masked box and returns the typed password", async () => {
		stub.state.inputBoxResults.push("s3cret");
		await handle({ type: "passwordRequired", isWrongPassword: false });
		assert.deepEqual(fake.posted, [{ type: "password", value: "s3cret" }]);
		const options = stub.state.inputBoxCalls[0];
		assert.equal(options.password, true);
		assert.equal(options.ignoreFocusOut, true);
		assert.equal(options.prompt, "Enter PDF password");
	});

	it("words the prompt differently after a wrong password", async () => {
		await handle({ type: "passwordRequired", isWrongPassword: true });
		assert.equal(stub.state.inputBoxCalls[0].prompt, "Incorrect password. Try again.");
	});

	it("reports cancellation when the prompt is dismissed", async () => {
		await handle({ type: "passwordRequired" });
		assert.deepEqual(fake.posted, [{ type: "passwordCancelled" }]);
	});

	it("keeps an empty password distinct from cancellation", async () => {
		stub.state.inputBoxResults.push("");
		await handle({ type: "passwordRequired" });
		assert.deepEqual(fake.posted, [{ type: "password", value: "" }]);
	});

	it("never writes the password to the console", async (t) => {
		const spies = ["log", "info", "warn", "error", "debug"].map((m) => t.mock.method(console, m));
		stub.state.inputBoxResults.push("hunter2-unique-marker");
		await handle({ type: "passwordRequired" });
		for (const spy of spies) {
			assert.ok(!JSON.stringify(spy.mock.calls).includes("hunter2-unique-marker"));
		}
	});

	it("opens an https link in the external browser", async () => {
		await handle({ type: "openLink", url: "https://example.com/x" });
		assert.deepEqual(stub.state.openedExternal, ["https://example.com/x"]);
	});

	it("opens the validated href rather than the raw string", async () => {
		await handle({ type: "openLink", url: "HTTPS://EXAMPLE.com" });
		assert.deepEqual(stub.state.openedExternal, ["https://example.com/"]);
	});

	it("blocks every other scheme and malformed input", async () => {
		for (const url of [
			"javascript:alert(1)",
			"file:///etc/passwd",
			"data:text/plain,hi",
			"nope",
			7,
			null,
		]) {
			await handle({ type: "openLink", url });
		}
		assert.deepEqual(stub.state.openedExternal, []);
	});

	it("ignores unknown types and non-object messages without throwing", async () => {
		for (const message of [undefined, null, "ready", 5, [], {}, { type: 7 }, { type: "other" }]) {
			await handle(message);
		}
		assert.deepEqual(fake.posted, []);
		assert.deepEqual(stub.state.openedExternal, []);
	});
});

describe("SafePdfEditorProvider", () => {
	const context = { extensionUri };

	function open() {
		const fake = stub.createFakePanel();
		const provider = new SafePdfEditorProvider(context);
		provider.resolveCustomEditor(provider.openCustomDocument(pdfUri), fake.panel);
		return fake;
	}

	it("returns the URI unchanged as the read-only document", () => {
		const doc = new SafePdfEditorProvider(context).openCustomDocument(pdfUri);
		assert.equal(doc.uri, pdfUri);
		assert.equal(typeof doc.dispose, "function");
	});

	it("scopes localResourceRoots to lib/pdfjs and the document's directory only", () => {
		const { panel } = open();
		const roots = panel.webview.options.localResourceRoots.map((r) => r.fsPath);
		assert.deepEqual(roots, ["/ext/lib/pdfjs", "/docs/papers"]);
		assert.equal(panel.webview.options.enableScripts, true);
	});

	it("renders HTML with a fresh nonce per editor", () => {
		const a = open().panel.webview.html;
		const b = open().panel.webview.html;
		const nonce = (html) => /script-src 'nonce-([0-9a-f]{32})'/.exec(html)[1];
		assert.notEqual(nonce(a), nonce(b));
		assert.ok(a.includes(`nonce="${nonce(a)}"`));
	});

	it("wires messages to the handler and disposes the listener with the panel", async () => {
		const fake = open();
		await fake.send({ type: "ready" });
		assert.equal(fake.posted[0].type, "init");
		assert.equal(fake.disposeListeners.length, 1);
		fake.dispose();
	});
});

describe("activate / deactivate", () => {
	it("registers the custom editor under the viewType declared in the manifest", () => {
		const subscriptions = [];
		activate({ extensionUri, subscriptions });
		const [registration] = stub.state.registrations;
		const manifest = require("../package.json");
		assert.equal(registration.viewType, manifest.contributes.customEditors[0].viewType);
		assert.equal(registration.options.webviewOptions.retainContextWhenHidden, false);
		assert.equal(registration.options.supportsMultipleEditorsPerDocument, false);
		assert.deepEqual(subscriptions, [registration]);
	});

	it("deactivate does not throw", () => {
		assert.doesNotThrow(() => deactivate());
	});
});
