/**
 * Static servers for browser tests.
 *
 * The page and its resources are served from two origins, like a real webview where the page
 * origin differs from `webview.cspSource`. PDF.js therefore takes the cross-origin worker path
 * (a blob wrapper that inherits the page's CSP), the path that ships. The page is rendered by
 * the extension's own `renderWebviewHtml`, so the policy under test is the policy that ships.
 */
require("../../helpers/vscode-stub");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { renderWebviewHtml, getNonce } = require("../../../src/extension");

const rootDir = path.join(__dirname, "../../..");
const PAGE_ORIGIN = "http://localhost:8080";
const RESOURCE_ORIGIN = "http://127.0.0.1:8081";
const mimeTypes = {
	".js": "application/javascript",
	".mjs": "application/javascript",
	".css": "text/css",
	".pdf": "application/pdf",
	".png": "image/png",
	".svg": "image/svg+xml",
};

/**
 * Serves a file below the repository root with CORS enabled, as the webview resource host does.
 *
 * @param {http.ServerResponse} res
 * @param {string} pathname - Request path
 */
function serveFile(res, pathname) {
	const filePath = path.resolve(rootDir, `.${decodeURIComponent(pathname)}`);
	if (
		filePath.startsWith(rootDir + path.sep) &&
		fs.existsSync(filePath) &&
		fs.statSync(filePath).isFile()
	) {
		res.writeHead(200, {
			"Content-Type": mimeTypes[path.extname(filePath)] || "text/plain",
			"Access-Control-Allow-Origin": "*",
		});
		res.end(fs.readFileSync(filePath));
	} else {
		res.writeHead(404);
		res.end("Not found");
	}
}

const resourceServer = http.createServer((req, res) => {
	serveFile(res, new URL(req.url, RESOURCE_ORIGIN).pathname);
});

const pageServer = http.createServer((req, res) => {
	const url = new URL(req.url, PAGE_ORIGIN);
	if (url.pathname !== "/" && url.pathname !== "/index.html") {
		serveFile(res, url.pathname);
		return;
	}
	const nonce = getNonce();
	let html = renderWebviewHtml(fs.readFileSync(path.join(rootDir, "src/webview.html"), "utf8"), {
		nonce,
		pdfjsUri: `${RESOURCE_ORIGIN}/lib/pdfjs/pdf.mjs`,
		workerUri: `${RESOURCE_ORIGIN}/lib/pdfjs/pdf.worker.mjs`,
		defaultZoom: url.searchParams.get("zoom") || "fit-page",
		cspSource: RESOURCE_ORIGIN,
	});
	// The shim stands in for acquireVsCodeApi and the extension host's init message.
	const shim = `<script nonce="${nonce}" src="/test/e2e/fixtures/vscode-api-shim.js"></script>`;
	html = html.replace("</head>", `${shim}\n</head>`);
	res.writeHead(200, { "Content-Type": "text/html" });
	res.end(html);
});

resourceServer.listen(8081);
pageServer.listen(8080, () => {
	console.log(`Test server running at ${PAGE_ORIGIN}/ (resources at ${RESOURCE_ORIGIN}/)`);
});
