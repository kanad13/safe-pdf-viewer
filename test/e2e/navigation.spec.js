const { test, expect } = require('@playwright/test');

test.describe('Navigation', () => {
    test('clicking next-page button increments the page counter', async ({ page }) => {
        await page.goto('http://localhost:8080/');

        // Wait for intial render
        const pageNumInput = page.locator('#page-input');
        const nextButton = page.locator('#btn-next');

        await expect(pageNumInput).toBeVisible();
        await expect(nextButton).toBeVisible();

        // Wait for page to be initially 1
        await expect(pageNumInput).toHaveValue('1');

        // Click next
        await nextButton.click();

        // Wait for page counter to become 2
        await expect(pageNumInput).toHaveValue('2');
    });
});
