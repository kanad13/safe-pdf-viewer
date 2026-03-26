/**
 * Mock for VS Code Webview API injected in Playwright tests
 */
window.acquireVsCodeApi = function() {
    return {
        postMessage: (msg) => {
            console.log('Mock acquireVsCodeApi postMessage:', msg);
        },
        setState: (state) => {
            console.log('Mock acquireVsCodeApi setState:', state);
        },
        getState: () => {
            return {};
        }
    };
};

window.addEventListener('load', () => {
    // Determine the path to the PDF based on the server 
    // Usually it will be served up relative to the root or test directory
    const pdfUrl = '/examples/test.pdf';
    
    // Dispatch the initialization message that the real extension would send
    window.postMessage({
        type: 'init',
        pdfUrl: pdfUrl,
        defaultZoom: 'fit-width'
    }, '*');
});
