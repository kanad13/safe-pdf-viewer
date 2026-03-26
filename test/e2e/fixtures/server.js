const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "../../..");

const server = http.createServer((req, res) => {
	if (req.url === "/" || req.url === "/index.html") {
		let html = fs.readFileSync(path.join(rootDir, "src/webview.html"), "utf8");
		const nonce = "testnonce12345678901234567890123";
        
		// Let's use localhost as cspSource
		const cspSource = "http://localhost:8080";
        
		const cspContent = [
			"default-src 'none'",
			`script-src 'nonce-${nonce}' 'strict-dynamic'`,
			`worker-src blob: ${cspSource}`,
			`connect-src ${cspSource}`,
			"style-src 'unsafe-inline'",
			`img-src ${cspSource} data:`,
			`font-src ${cspSource} data:`,
		].join("; ");
        
		const cspTag = `<meta http-equiv="Content-Security-Policy" content="${cspContent}">`;
		html = html.replace(
			"<meta charset=\"UTF-8\">",
			`<meta charset="UTF-8">\n\t${cspTag}`
		);
        
		html = html.replace(/\{\{NONCE\}\}/g, nonce);
		html = html.replace(/\{\{PDFJS_URI\}\}/g, "http://localhost:8080/lib/pdfjs/pdf.mjs");
		html = html.replace(/\{\{WORKER_URI\}\}/g, "http://localhost:8080/lib/pdfjs/pdf.worker.mjs");
		html = html.replace(/\{\{DEFAULT_ZOOM\}\}/g, "fit-page");
        
		const shimScript = `<script nonce="${nonce}" src="/test/e2e/fixtures/vscode-api-shim.js"></script>`;
		html = html.replace("</head>", `  ${shimScript}\n</head>`);
        
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(html);
	} else {
		const filePath = path.join(rootDir, req.url.split("?")[0]);
		if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
			const ext = path.extname(filePath);
			const mimeTypes = {
				".js": "application/javascript",
				".mjs": "application/javascript",
				".css": "text/css",
				".pdf": "application/pdf",
				".png": "image/png",
				".svg": "image/svg+xml"
			};
			res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" });
			res.end(fs.readFileSync(filePath));
		} else {
			res.writeHead(404);
			res.end("Not found");
		}
	}
});

server.listen(8080, () => {
	console.log("Test server running at http://localhost:8080/");
});