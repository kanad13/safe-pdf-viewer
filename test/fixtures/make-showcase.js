/**
 * Generates examples/showcase.pdf, the document behind the README screenshots.
 *
 * Run: node test/fixtures/make-showcase.js
 * Chromium prints the HTML below, so the PDF has selectable text, an internal link and an
 * external link, which the viewer's links and find panel need. The output is committed.
 */
const path = require("path");
const { chromium } = require("@playwright/test");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: A5; margin: 18mm; }
body { font-family: Helvetica, Arial, sans-serif; color: #1f2933; font-size: 11pt; line-height: 1.45; }
h1 { font-size: 22pt; margin: 0 0 4pt; color: #0b3d91; }
h2 { font-size: 14pt; margin: 18pt 0 6pt; color: #0b3d91; }
.sub { color: #5f6c7b; margin: 0 0 14pt; }
.bar { height: 14pt; background: #2f80ed; margin: 3pt 0 8pt; border-radius: 2pt; }
.label { font-size: 9.5pt; color: #3e4c59; }
table { border-collapse: collapse; width: 100%; font-size: 10pt; }
td, th { border-bottom: 1px solid #cbd2d9; padding: 4pt 6pt; text-align: left; }
.page { page-break-after: always; }
a { color: #0b57d0; }
</style></head><body>
<div class="page">
<h1>Quarterly service review</h1>
<p class="sub">Platform team, third quarter</p>
<p>This quarter the platform team cut median latency by a third and kept the error budget intact. The summary below covers latency, reliability and the work planned for next quarter.</p>
<h2>Median latency by month</h2>
<div class="label">July: 420 ms</div><div class="bar" style="width: 90%"></div>
<div class="label">August: 340 ms</div><div class="bar" style="width: 72%"></div>
<div class="label">September: 280 ms</div><div class="bar" style="width: 60%"></div>
<p>Details and the full table are in the <a href="#appendix">appendix on page 3</a>.</p>
</div>
<div class="page">
<h2>Reliability</h2>
<p>The service met its availability target in every month. The longest incident lasted 14 minutes and came from a configuration change that was rolled back.</p>
<p>The incident review is published on the <a href="https://example.com/reviews">engineering reviews page</a>.</p>
<h2>Next quarter</h2>
<p>We plan to lower latency further, move the batch jobs to the new queue, and retire the legacy export. Each item has an owner and a date in the team plan.</p>
</div>
<div id="appendix">
<h2>Appendix: latency measurements</h2>
<table>
<tr><th>Month</th><th>Median</th><th>95th percentile</th></tr>
<tr><td>July</td><td>420 ms</td><td>910 ms</td></tr>
<tr><td>August</td><td>340 ms</td><td>760 ms</td></tr>
<tr><td>September</td><td>280 ms</td><td>640 ms</td></tr>
</table>
<p>Latency is measured at the edge and includes network time to the first byte.</p>
</div>
</body></html>`;

(async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage();
	await page.setContent(html);
	await page.pdf({
		path: path.join(__dirname, "../../examples/showcase.pdf"),
		printBackground: true,
		preferCSSPageSize: true,
	});
	await browser.close();
})();
