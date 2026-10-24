/**
 * Stand-in for the VS Code webview API and the extension host's init message.
 *
 * Query parameters: `pdf` (served path, default the example document), `password` (reply to a
 * password prompt; absent means the user cancels). Everything the page posts is kept in
 * `window.__posted` so tests assert on messages instead of console output.
 */
const RESOURCE_ORIGIN = "http://127.0.0.1:8081";
const params = new URLSearchParams(window.location.search);
window.__posted = [];
window.__state = window.__initialState ?? null;

window.acquireVsCodeApi = function () {
	return {
		postMessage: (msg) => {
			window.__posted.push(msg);
			if (msg && msg.type === "passwordRequired") {
				const password = params.get("password");
				setTimeout(() => {
					window.postMessage(
						password === null
							? { type: "passwordCancelled" }
							: { type: "password", value: password },
						"*",
					);
				}, 0);
			}
		},
		setState: (state) => {
			window.__state = state;
		},
		getState: () => window.__state,
	};
};

window.addEventListener("load", () => {
	window.postMessage(
		{ type: "init", pdfUrl: RESOURCE_ORIGIN + (params.get("pdf") || "/examples/test.pdf") },
		"*",
	);
});
