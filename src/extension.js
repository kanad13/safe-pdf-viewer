// PDF.js bundled version: 5.5.207 (lib/pdfjs/pdf.mjs + pdf.worker.mjs)

const vscode = require("vscode");
const path = require("path");

/**
 * Generates a random nonce for Content Security Policy.
 * Verbatim from mermaid-slideshow — fully generic utility.
 *
 * @returns {string} Random 32-character alphanumeric string
 */
function getNonce() {
	let text = "";
	const possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

/**
 * Reads the default zoom setting from VS Code configuration.
 *
 * @returns {string} Zoom value: "fit-page" | "75" | "100" | "125" | "150" | "200"
 */
function getDefaultZoom() {
	return vscode.workspace
		.getConfiguration("safePdfViewer")
		.get("defaultZoom", "fit-page");
}

/**
 * Generates the viewer webview HTML from the template file.
 *
 * Reads src/webview.html and replaces placeholder tokens with runtime values.
 * Returns an empty-state page when no valid URI is available.
 *
 * Token map (replaced in webview.html at runtime):
 *   {{NONCE}}        → CSP nonce (on the script tag)
 *   {{PDF_URI}}      → webview-safe URI for the PDF file
 *   {{PDFJS_URI}}    → webview-safe URI for lib/pdfjs/pdf.mjs
 *   {{WORKER_URI}}   → webview-safe URI for lib/pdfjs/pdf.worker.mjs
 *   {{DEFAULT_ZOOM}} → starting zoom value from settings
 *
 * CSP is injected by inserting a <meta> tag after the charset meta —
 * no template token used, avoiding any VS Code webview pre-processing conflicts.
 *
 * @param {vscode.WebviewPanel} panel - The webview panel (needed for asWebviewUri)
 * @param {vscode.Uri} pdfFileUri - The URI of the PDF file to display
 * @param {vscode.Uri} extensionUri - The extension's installation URI
 * @param {string} nonce - CSP nonce token
 * @returns {string} Complete HTML page
 */
function getWebviewContent(panel, pdfFileUri, extensionUri, nonce) {
	const fs = require("fs");

	// Convert file URIs to webview-safe resource URIs
	const pdfUri = panel.webview.asWebviewUri(pdfFileUri).toString();
	const pdfjsUri = panel.webview
		.asWebviewUri(vscode.Uri.joinPath(extensionUri, "lib", "pdfjs", "pdf.mjs"))
		.toString();
	const workerUri = panel.webview
		.asWebviewUri(
			vscode.Uri.joinPath(extensionUri, "lib", "pdfjs", "pdf.worker.mjs"),
		)
		.toString();
	const defaultZoom = getDefaultZoom();
	const cspSource = panel.webview.cspSource;
	const cspContent = [
		"default-src 'none'",
		`script-src 'nonce-${nonce}' 'strict-dynamic'`,
		`worker-src blob: ${cspSource}`,
		`connect-src ${cspSource}`,
		"style-src 'unsafe-inline'",
		"img-src data:",
	].join("; ");
	const cspTag = `<meta http-equiv="Content-Security-Policy" content="${cspContent}">`;

	const templatePath = path.join(__dirname, "webview.html");
	let html = fs.readFileSync(templatePath, "utf8");

	// Inject CSP meta tag after the charset declaration (reliable unique anchor)
	html = html.replace(
		"<meta charset=\"UTF-8\">",
		`<meta charset="UTF-8">\n\t${cspTag}`,
	);
	html = html.replace(/\{\{NONCE\}\}/g, nonce);
	html = html.replace("{{PDF_URI}}", pdfUri);
	html = html.replace("{{PDFJS_URI}}", pdfjsUri);
	html = html.replace("{{WORKER_URI}}", workerUri);
	html = html.replace("{{DEFAULT_ZOOM}}", defaultZoom);

	return html;
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
	 * Listens for "ready" message from webview to send the init payload.
	 *
	 * @param {vscode.CustomDocument} document - The opened PDF document
	 * @param {vscode.WebviewPanel} webviewPanel - The panel VS Code allocated
	 * @param {vscode.CancellationToken} _token - Cancellation token (unused)
	 */
	resolveCustomEditor(document, webviewPanel, _token) {
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

		const nonce = getNonce();
		webviewPanel.webview.html = getWebviewContent(
			webviewPanel,
			pdfFileUri,
			extensionUri,
			nonce,
		);

		const disposables = [];

		// Wait for webview to signal it is ready, then send initialization data
		webviewPanel.webview.onDidReceiveMessage(
			(message) => {
				if (message.type === "ready") {
					webviewPanel.webview.postMessage({
						type: "init",
						pdfUrl: webviewPanel.webview.asWebviewUri(pdfFileUri).toString(),
						defaultZoom: getDefaultZoom(),
					});
				}
				// Future: handle "pageChanged", "error", etc.
			},
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
	 * @param {{ backupId?: string }} _openContext - Opening context (unused)
	 * @param {vscode.CancellationToken} _token - Cancellation token (unused)
	 * @returns {vscode.CustomDocument} The document object
	 */
	openCustomDocument(uri, _openContext, _token) {
		// Minimal CustomDocument — we only need the URI for read-only viewing.
		return { uri, dispose() {} };
	}
}

/**
 * Activation function — called when the extension loads.
 *
 * Registers the SafePdfEditorProvider and the onDidChangeConfiguration listener.
 *
 * @param {vscode.ExtensionContext} context - Extension context provided by VS Code
 */
function activate(context) {
	console.log("safePdfViewer extension activated");

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

	// NOTE: onDidChangeConfiguration for zoom default affects only newly opened PDFs.
	// Currently open panels are not re-rendered (zoom is a per-session UI state).
	// If full re-render on settings change is desired in future, add that logic here.
}

function deactivate() {}

module.exports = {
	activate,
	deactivate,
	getNonce,
	getDefaultZoom,
	getWebviewContent,
};
