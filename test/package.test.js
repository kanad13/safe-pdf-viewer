const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

describe("manifest", () => {
	it("pins @types/vscode exactly to the engine floor", () => {
		const floor = manifest.engines.vscode.replace(/^\^/, "");
		assert.equal(manifest.devDependencies["@types/vscode"], floor);
	});

	it("declares the PDF.js version recorded in the source header", () => {
		const header = fs.readFileSync(path.join(root, "src/extension.js"), "utf8").split("\n")[0];
		const bundled = fs
			.readFileSync(path.join(root, "lib/pdfjs/pdf.mjs"), "utf8")
			.match(/pdfjsVersion = (\S+)/);
		assert.ok(bundled, "pdf.mjs does not state its version");
		assert.ok(header.includes(bundled[1]), `header "${header}" vs bundle ${bundled[1]}`);
	});

	it("uses caret ranges or exact pins only, never tags", () => {
		for (const [name, range] of Object.entries(manifest.devDependencies)) {
			assert.match(range, /^\^?\d+\.\d+\.\d+$/, `${name}: ${range}`);
		}
	});
});

describe("packaged file list", () => {
	const listing = execFileSync(
		process.execPath,
		[path.join(root, "node_modules/@vscode/vsce/vsce"), "ls"],
		{ cwd: root, encoding: "utf8" },
	)
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);

	it("ships the runtime files", () => {
		for (const f of [
			"package.json",
			"src/extension.js",
			"src/webview.html",
			"lib/pdfjs/pdf.mjs",
			"lib/pdfjs/pdf.worker.mjs",
		]) {
			assert.ok(listing.includes(f), `${f} missing from package`);
		}
	});

	it("excludes development, test and instruction files", () => {
		const banned =
			/^(test|docs|examples|\.github|\.vscode|node_modules)\/|^(AGENTS|CLAUDE|WORKPLAN)\.md$|eslint\.config|\.prettier|playwright\.config|jsconfig|\.nvmrc|\.vsix$|package-lock/;
		const leaked = listing.filter((f) => banned.test(f));
		assert.deepEqual(leaked, []);
	});
});
