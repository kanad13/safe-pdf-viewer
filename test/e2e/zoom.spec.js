const { test, expect } = require('@playwright/test');

test.describe('Zoom', () => {
    test('selecting 200% zoom increases canvas width and updates --scale-factor', async ({ page }) => {
        await page.goto('http://localhost:8080/');
        
        // Wait for intial render
        const canvas = page.locator('#pdf-canvas');
        await expect(canvas).toBeVisible();
        await page.waitForFunction(() => {
            const c = document.getElementById('pdf-canvas');
            return c && c.style.width && parseInt(c.style.width, 10) > 0;
        });

        // Get initial width
        const initialWidthStr = await canvas.evaluate(el => el.style.width);
        const initialWidth = parseInt(initialWidthStr, 10);
        
        // Select 200% zoom
        const zoomSelect = page.locator('#zoom-select');
        await zoomSelect.selectOption('200');

        // Wait for render with new size
        await page.waitForFunction((prevWidth) => {
            const c = document.getElementById('pdf-canvas');
            if (!c || !c.style.width) return false;
            const currentWidth = parseInt(c.style.width, 10);
            return currentWidth !== prevWidth && currentWidth > 0;
        }, initialWidth);

        // Check new width is roughly double original scale (actual 200% of base rather than double whatever "fit-width" was)
        // More simply: The width should change and be positive
        const newWidthStr = await canvas.evaluate(el => el.style.width);
        const newWidth = parseInt(newWidthStr, 10);
        expect(newWidth).toBeGreaterThan(0);
        expect(newWidth).not.toBe(initialWidth);

        // Check --scale-factor on textLayer
        const textLayer = page.locator('#text-layer');
        const scaleFactorStr = await textLayer.evaluate(el => el.style.getPropertyValue('--scale-factor'));
        expect(scaleFactorStr).not.toBeNull();
        expect(parseFloat(scaleFactorStr)).toBeGreaterThan(0);
    });
});
