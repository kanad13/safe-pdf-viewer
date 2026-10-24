/**
 * Shared fake of the `vscode` module for tests that run outside an editor host.
 *
 * Requiring this file makes `require("vscode")` resolve to the fake. The returned object exposes
 * recorders and knobs so suites can assert on host calls without each re-implementing the fake.
 */
const Module = require("node:module");

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
	if (request === "vscode") {
		return "vscode";
	}
	return originalResolve.call(this, request, ...args);
};

const state = {
	config: {},
	inputBoxResults: [],
	inputBoxCalls: [],
	openedExternal: [],
	registrations: [],
};

/**
 * Restores recorders and knobs to their initial values. Call from `beforeEach`.
 */
function reset() {
	state.config = {};
	state.inputBoxResults = [];
	state.inputBoxCalls = [];
	state.openedExternal = [];
	state.registrations = [];
}

const makeUri = (fsPath, extra = {}) => ({
	fsPath,
	path: fsPath,
	toString: () => fsPath,
	...extra,
});

const vscodeFake = {
	workspace: {
		getConfiguration: () => ({
			get: (key, defaultValue) => (key in state.config ? state.config[key] : defaultValue),
		}),
	},
	window: {
		registerCustomEditorProvider: (viewType, provider, options) => {
			const registration = { viewType, provider, options, dispose() {} };
			state.registrations.push(registration);
			return registration;
		},
		showInputBox: async (options) => {
			state.inputBoxCalls.push(options);
			return state.inputBoxResults.length ? state.inputBoxResults.shift() : undefined;
		},
	},
	env: {
		openExternal: async (uri) => {
			state.openedExternal.push(uri.href);
			return true;
		},
	},
	Uri: {
		joinPath: (base, ...segments) => makeUri([base.fsPath, ...segments].join("/")),
		file: (p) => makeUri(p),
		parse: (href) => makeUri(href, { href }),
	},
};

require.cache["vscode"] = {
	id: "vscode",
	filename: "vscode",
	loaded: true,
	exports: vscodeFake,
};

/**
 * Builds a fake webview panel that records posted messages and exposes the registered listener.
 *
 * @returns {{panel: object, posted: object[], send: (msg: unknown) => Promise<void>, disposeListeners: object[], dispose: () => void}}
 */
function createFakePanel() {
	const posted = [];
	const messageListeners = [];
	const disposeListeners = [];
	const webview = {
		options: undefined,
		html: "",
		cspSource: "https://file+.vscode-resource.vscode-cdn.net",
		asWebviewUri: (uri) => ({ toString: () => `webview:${uri.fsPath}` }),
		postMessage: (msg) => {
			posted.push(msg);
			return Promise.resolve(true);
		},
		onDidReceiveMessage: (listener, thisArg, disposables) => {
			messageListeners.push(listener);
			const handle = {
				disposed: false,
				dispose() {
					handle.disposed = true;
				},
			};
			if (disposables) {
				disposables.push(handle);
			}
			return handle;
		},
	};
	const panel = {
		webview,
		onDidDispose: (listener) => {
			disposeListeners.push(listener);
			return { dispose() {} };
		},
	};
	return {
		panel,
		posted,
		disposeListeners,
		send: async (msg) => {
			for (const listener of messageListeners) {
				await listener(msg);
			}
		},
		dispose: () => disposeListeners.forEach((l) => l()),
	};
}

module.exports = { state, reset, createFakePanel, makeUri };
