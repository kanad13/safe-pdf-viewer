const { test, expect } = require('@playwright/test');

test.describe('Text Selection', () => {
    test('dragging over text yields non-empty getSelection()', async ({ page }) => {
        await page.goto('http://localhost:8080/');
        
        // Wait for the text layer to populate
        const textLayer = page.locator('#text-layer');
        await expect(textLayer).toBeVisible();
        await page.waitForFunction(() => {
            const tl = document.getElementById('text-layer');
            return tl && tl.children.length > 0;
        });

        // Get the bounding box of the text layer to perform dragging
        const bbox = await textLayer.boundingBox();
        expect(bbox).not.toBeNull();

        // Simulate dragging across a portion of the text layer
        await page.mouse.move(bbox.x + 50, bbox.y + 50);
        await page.mouse.down();
        await page.mouse.move(bbox.x + 200, bbox.y + 200, { steps: 5 });
        await page.mouse.up();

        // Check the selection
        const selectionText = await page.evaluate(() => {
            return window.getSelection().toString();
        });

        expect(selectionText.trim().length).toBeGreaterThan(0);
    });
});
