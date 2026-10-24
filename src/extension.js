// PDF.js bundled version: 6.4.299 (lib/pdfjs/pdf.mjs + pdf.worker.mjs)

/**
 * Extension host for Safe PDF Viewer: registers the read-only PDF editor and builds its webview.
 *
 * Why it exists: VS Code needs a host-side provider to open `.pdf` files, and the webview that
 * renders them is untrusted because it parses attacker-controlled documents. Everything that must
 * be decided outside the webview lives here: the Content Security Policy, which folders the webview
 * may read, which messages it may send, and which links may leave the editor.
 *
 * Invariants: the CSP denies by default and gates scripts by nonce; `localResourceRoots` lists only
 * `lib/pdfjs/` and the PDF's directory; the provider never writes; messages from the webview are
 * type-checked before use; only http(s) links reach `openExternal`. See docs/architecture.md.
 */

const vscode = require("vscode");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

/**
 * Generates a cryptographically random nonce for Content Security Policy.
 *
 * @returns {string} Random 32-character lowercase hex string
 */
function getNonce() {
	return crypto.randomBytes(16).toString("hex");
}

const VALID_ZOOM_VALUES = new Set(["fit-page", "50", "75", "100", "125", "150", "200"]);

/**
 * Reads the default zoom setting from VS Code configuration.
 * Falls back to "fit-page" if the stored value is not a recognised zoom level.
 *
 * @returns {string} Zoom value: "fit-page" | "50" | "75" | "100" | "125" | "150" | "200"
 */
function getDefaultZoom() {
	const v = vscode.workspace.getConfiguration("safePdfViewer").get("defaultZoom", "fit-page");
	return VALID_ZOOM_VALUES.has(v) ? v : "fit-page";
}

/**
 * Builds the Content Security Policy for the viewer webview.
 *
 * `default-src 'none'` plus an explicit allow-list keeps a hostile PDF from loading anything the
 * viewer did not ask for. `style-src 'unsafe-inline'` is required because PDF.js positions text
 * and annotation elements with inline styles; scripts stay nonce-gated.
 *
 * @param {string} nonce - CSP nonce token
 * @param {string} cspSource - Origin from which the webview serves extension and document files
 * @returns {string} Policy string for the meta tag's content attribute
 */
function buildCsp(nonce, cspSource) {
	return [
		"default-src 'none'",
		`script-src 'nonce-${nonce}' 'strict-dynamic'`,
		`worker-src blob: ${cspSource}`,
		`connect-src ${cspSource}`,
		"style-src 'unsafe-inline'",
		"img-src data:",
	].join("; ");
}

/**
 * Escapes a value for use inside a double-quoted JavaScript string literal that sits in an inline
 * <script> element. `<` is escaped so no value can close the script element.
 *
 * @param {string} value - Raw value
 * @returns {string} Escaped text without surrounding quotes
 */
function escapeForScriptString(value) {
	return JSON.stringify(String(value)).slice(1, -1).replace(/</g, "\\u003c");
}

const CHARSET_META = '<meta charset="UTF-8">';
const TEMPLATE_PATTERN =
	/<meta charset="UTF-8">|\{\{(NONCE|PDFJS_URI|WORKER_URI|DEFAULT_ZOOM)\}\}/g;

/**
 * Renders the webview template in a single pass.
 *
 * One pass with function replacers guarantees that substituted text is never scanned again and
 * that `$` sequences inside file paths are not interpreted as replacement patterns.
 *
 * Tokens: {{NONCE}} (script tag nonce), {{PDFJS_URI}} and {{WORKER_URI}} (webview URIs of the
 * bundled PDF.js files), {{DEFAULT_ZOOM}} (starting zoom). The CSP meta tag is inserted after the
 * charset declaration so the template needs no CSP token.
 *
 * @param {string} template - Contents of src/webview.html
 * @param {{nonce: string, pdfjsUri: string, workerUri: string, defaultZoom: string, cspSource: string}} values
 * @returns {string} Complete HTML page
 */
function renderWebviewHtml(template, values) {
	const substitutions = {
		NONCE: values.nonce,
		PDFJS_URI: escapeForScriptString(values.pdfjsUri),
		WORKER_URI: escapeForScriptString(values.workerUri),
		DEFAULT_ZOOM: escapeForScriptString(values.defaultZoom),
	};
	const cspTag = `<meta http-equiv="Content-Security-Policy" content="${buildCsp(values.nonce, values.cspSource)}">`;
	return template.replace(TEMPLATE_PATTERN, (match, token) =>
		token ? substitutions[token] : `${CHARSET_META}\n\t${cspTag}`,
	);
}

/**
 * Generates the viewer webview HTML from the template file.
 *
 * @param {vscode.WebviewPanel} panel - The webview panel (needed for asWebviewUri and cspSource)
 * @param {vscode.Uri} extensionUri - The extension's installation URI
 * @param {string} nonce - CSP nonce token
 * @returns {string} Complete HTML page
 */
function getWebviewContent(panel, extensionUri, nonce) {
	const toWebviewUri = (...segments) =>
		panel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...segments)).toString();
	const template = fs.readFileSync(path.join(__dirname, "webview.html"), "utf8");
	return renderWebviewHtml(template, {
		nonce,
		pdfjsUri: toWebviewUri("lib", "pdfjs", "pdf.mjs"),
		workerUri: toWebviewUri("lib", "pdfjs", "pdf.worker.mjs"),
		defaultZoom: getDefaultZoom(),
		cspSource: panel.webview.cspSource,
	});
}

/**
 * Parses a link target from the webview and returns it only when it is an http(s) URL.
 *
 * @param {unknown} url - Value received from the webview
 * @returns {string|null} Normalised URL string, or null when the scheme is not allowed
 */
function toExternalUrl(url) {
	if (typeof url !== "string") {
		return null;
	}
	try {
		const parsed = new URL(url);
		return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
	} catch {
		return null;
	}
}

/**
 * Creates the handler for messages posted by the viewer webview.
 *
 * The webview is the less trusted side of the channel (it renders attacker-controlled PDFs), so
 * every field is type-checked before use. The password flow is a round trip: the webview posts
 * "passwordRequired", the host prompts and replies with "password" or "passwordCancelled". The
 * password is never logged or persisted.
 *
 * @param {vscode.Webview} webview - Webview that receives replies
 * @param {vscode.Uri} pdfFileUri - Document shown in the webview
 * @returns {(message: unknown) => Promise<void>} Message handler
 */
function createMessageHandler(webview, pdfFileUri) {
	return async (message) => {
		if (!message || typeof message !== "object") {
			return;
		}
		if (message.type === "ready") {
			webview.postMessage({
				type: "init",
				pdfUrl: webview.asWebviewUri(pdfFileUri).toString(),
			});
		} else if (message.type === "passwordRequired") {
			const pwd = await vscode.window.showInputBox({
				password: true,
				prompt:
					message.isWrongPassword === true
						? "Incorrect password. Try again."
						: "Enter PDF password",
				ignoreFocusOut: true,
			});
			if (pwd === undefined) {
				webview.postMessage({ type: "passwordCancelled" });
			} else {
				webview.postMessage({ type: "password", value: pwd });
			}
		} else if (message.type === "openLink") {
			// Open the URL that passed validation, not the raw string, so the checked and the
			// opened target cannot differ.
			const target = toExternalUrl(message.url);
			if (target) {
				await vscode.env.openExternal(vscode.Uri.parse(target));
			}
		}
		// State persistence (page/zoom) is handled via vscode.setState in the webview.
	};
}

/**
 * Custom read-only editor provider for PDF files.
 *
 * Registered under viewType "safePdfViewer.pdfEditor".
 * VS Code calls resolveCustomEditor when a .pdf file is opened.
 */
class SafePdfEditorProvider {
	/**
	 * @param {vscode.ExtensionContext} context
	 */
	constructor(context) {
		this._context = context;
	}

	/**
	 * Called by VS Code when a .pdf file is opened or revealed.
	 *
	 * Sets up the webview with correct CSP, localResourceRoots, and initial content.
	 *
	 * @param {vscode.CustomDocument} document - The opened PDF document
	 * @param {vscode.WebviewPanel} webviewPanel - The panel VS Code allocated
	 */
	resolveCustomEditor(document, webviewPanel) {
		const extensionUri = this._context.extensionUri;
		const pdfFileUri = document.uri;

		// Allow webview to load only: the PDF file's directory and the pdfjs lib directory
		webviewPanel.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(extensionUri, "lib", "pdfjs"),
				vscode.Uri.file(path.dirname(pdfFileUri.fsPath)),
			],
		};

		webviewPanel.webview.html = getWebviewContent(webviewPanel, extensionUri, getNonce());

		const disposables = [];
		webviewPanel.webview.onDidReceiveMessage(
			createMessageHandler(webviewPanel.webview, pdfFileUri),
			null,
			disposables,
		);

		webviewPanel.onDidDispose(() => {
			while (disposables.length) {
				const x = disposables.pop();
				if (x) {
					x.dispose();
				}
			}
		});
	}

	/**
	 * Called by VS Code to open the underlying document model.
	 * For a read-only viewer the default CustomDocument is sufficient.
	 *
	 * @param {vscode.Uri} uri - URI of the file being opened
	 * @returns {vscode.CustomDocument} The document object
	 */
	openCustomDocument(uri) {
		return { uri, dispose() {} };
	}
}

/**
 * Activation function — called when the extension loads.
 *
 * Registers the SafePdfEditorProvider. New panels read the zoom default from VS Code config at
 * open time; open panels keep the zoom they started with because zoom is per-session UI state.
 *
 * @param {vscode.ExtensionContext} context - Extension context provided by VS Code
 */
function activate(context) {
	const provider = new SafePdfEditorProvider(context);

	const registration = vscode.window.registerCustomEditorProvider(
		"safePdfViewer.pdfEditor",
		provider,
		{
			webviewOptions: {
				// Do not retain webview content when panel is hidden — saves memory
				retainContextWhenHidden: false,
			},
			supportsMultipleEditorsPerDocument: false,
		},
	);

	context.subscriptions.push(registration);
}

/**
 * Deactivation hook. Nothing to release: editor registrations are disposed through
 * `context.subscriptions`.
 */
function deactivate() {}

module.exports = {
	activate,
	deactivate,
	getNonce,
	getDefaultZoom,
	getWebviewContent,
	buildCsp,
	renderWebviewHtml,
	toExternalUrl,
	createMessageHandler,
	SafePdfEditorProvider,
};
