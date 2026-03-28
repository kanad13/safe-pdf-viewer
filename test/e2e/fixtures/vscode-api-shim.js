/* global window */ /**
 * Mock for VS Code Webview API injected in Playwright tests.
 *
 * The postMessage mock handles the password round-trip: if the webview sends
 * { type: "passwordRequired" }, it immediately responds with a test password
 * via window.postMessage so the loadPdf retry loop can proceed.
 */
window.acquireVsCodeApi = function () {
	return {
		postMessage: (msg) => {
			console.log("Mock acquireVsCodeApi postMessage:", msg);
			if (msg && msg.type === "passwordRequired") {
				// Respond with a test password so the retry loop can proceed in tests.
				// Real extension would call vscode.window.showInputBox here.
				window.postMessage({ type: "password", value: "testpassword" }, "*");
			} else if (msg && msg.type === "openLink") {
				// In tests, log intercepted link clicks — real extension opens in browser.
				console.log("Mock acquireVsCodeApi: openLink intercepted:", msg.url);
			}
		},
		setState: (state) => {
			console.log("Mock acquireVsCodeApi setState:", state);
		},
		getState: () => {
			return {};
		},
	};
};

window.addEventListener("load", () => {
	// Determine the path to the PDF based on the server
	// Usually it will be served up relative to the root or test directory
	const pdfUrl = "/examples/test.pdf";

	// Dispatch the initialization message that the real extension would send
	window.postMessage(
		{
			type: "init",
			pdfUrl: pdfUrl,
			defaultZoom: "fit-page",
		},
		"*",
	);
});
