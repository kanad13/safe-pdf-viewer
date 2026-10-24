const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const stub = require("./helpers/vscode-stub");
const { buildCsp, renderWebviewHtml, getWebviewContent } = require("../src/extension");

const templatePath = path.join(__dirname, "../src/webview.html");
const template = fs.readFileSync(templatePath, "utf8");
const NONCE = "ab".repeat(16);
const CSP_SOURCE = "https://file+.vscode-resource.vscode-cdn.net";
const values = {
	nonce: NONCE,
	pdfjsUri: "https://x/lib/pdfjs/pdf.mjs",
	workerUri: "https://x/lib/pdfjs/pdf.worker.mjs",
	defaultZoom: "fit-page",
	cspSource: CSP_SOURCE,
};

beforeEach(() => stub.reset());

describe("buildCsp", () => {
	const directives = Object.fromEntries(
		buildCsp(NONCE, CSP_SOURCE)
			.split("; ")
			.map((d) => [d.split(" ")[0], d.split(" ").slice(1)]),
	);

	it("denies everything by default", () => {
		assert.deepEqual(directives["default-src"], ["'none'"]);
	});

	it("allows scripts only through the nonce", () => {
		assert.deepEqual(directives["script-src"], [`'nonce-${NONCE}'`, "'strict-dynamic'"]);
	});

	it("never permits eval or remote origins", () => {
		const policy = buildCsp(NONCE, CSP_SOURCE);
		assert.ok(!policy.includes("unsafe-eval"));
		assert.ok(!policy.includes("*"));
		const origins = policy.match(/https?:\/\/[^\s;]+/g) ?? [];
		assert.ok(
			origins.every((o) => o === CSP_SOURCE),
			`unexpected origins: ${origins}`,
		);
	});

	it("limits workers and fetches to the webview resource origin (plus blob workers)", () => {
		assert.deepEqual(directives["worker-src"], ["blob:", CSP_SOURCE]);
		assert.deepEqual(directives["connect-src"], [CSP_SOURCE]);
	});
});

describe("renderWebviewHtml", () => {
	it("resolves every template token in the real template", () => {
		const html = renderWebviewHtml(template, values);
		assert.doesNotMatch(html, /\{\{[A-Z_]+\}\}/);
		assert.ok(html.includes(`nonce="${NONCE}"`));
		assert.ok(html.includes("https://x/lib/pdfjs/pdf.worker.mjs"));
	});

	it("inserts the CSP meta tag exactly once, directly after the charset", () => {
		const html = renderWebviewHtml(template, values);
		assert.equal(html.match(/<meta http-equiv="Content-Security-Policy"/g).length, 1);
		assert.match(html, /<meta charset="UTF-8">\n\t<meta http-equiv="Content-Security-Policy"/);
	});

	it("substitutes in a single pass: token-shaped text inside a value stays literal", () => {
		const html = renderWebviewHtml(template, {
			...values,
			pdfjsUri: "https://x/{{NONCE}}/{{WORKER_URI}}/pdf.mjs",
		});
		assert.ok(html.includes("https://x/{{NONCE}}/{{WORKER_URI}}/pdf.mjs"));
	});

	it("keeps $ sequences in paths verbatim", () => {
		const tricky = "https://x/$&/$'/$`/$1/$$/pdf.mjs";
		const html = renderWebviewHtml(template, { ...values, pdfjsUri: tricky });
		assert.ok(html.includes(tricky));
	});

	it("cannot be broken out of the script string by quotes or a closing script tag", () => {
		const html = renderWebviewHtml(template, {
			...values,
			workerUri: 'https://x/"; alert(1); //</script><script>evil()</script>',
		});
		assert.ok(!html.includes("</script><script>evil()"));
		assert.doesNotMatch(html, /(^|[^\\])"; alert\(1\)/);
		assert.ok(html.includes('\\"; alert(1); //\\u003c/script>'));
	});

	it("works on a template lacking the charset line (no CSP is silently added elsewhere)", () => {
		const html = renderWebviewHtml("<html>{{NONCE}}</html>", values);
		assert.equal(html, `<html>${NONCE}</html>`);
	});
});

describe("getWebviewContent", () => {
	it("builds the page from the shipped template with webview URIs for PDF.js", () => {
		const fake = stub.createFakePanel();
		stub.state.config.defaultZoom = "150";
		const html = getWebviewContent(fake.panel, stub.makeUri("/ext"), NONCE);
		assert.ok(html.includes("webview:/ext/lib/pdfjs/pdf.mjs"));
		assert.ok(html.includes("webview:/ext/lib/pdfjs/pdf.worker.mjs"));
		assert.ok(html.includes('let currentZoom = "150"'));
		assert.ok(html.includes(`connect-src ${CSP_SOURCE}`));
	});
});

describe("webview template security invariants", () => {
	it("disables PDF.js eval-based features", () => {
		assert.match(template, /getDocument\(\{[^}]*isEvalSupported:\s*false/s);
	});

	it("never builds markup from document text", () => {
		const assignments = template.match(/\.innerHTML\s*=\s*[^;]+;/g) ?? [];
		assert.ok(
			assignments.every((a) => /=\s*"";$/.test(a)),
			`dynamic innerHTML: ${assignments}`,
		);
		assert.doesNotMatch(template, /insertAdjacentHTML|document\.write|outerHTML\s*=/);
		assert.doesNotMatch(template, /\beval\(|new Function\(/);
	});

	it("loads no remote resources", () => {
		assert.doesNotMatch(template, /(src|href)=["']https?:/);
		assert.doesNotMatch(template, /@import|url\(\s*["']?https?:/);
	});

	it("starts the webview with a script tag carrying the nonce token", () => {
		assert.match(template, /<script type="module" nonce="\{\{NONCE\}\}">/);
	});
});
