const { test, expect } = require('@playwright/test');
const { endActiveSession } = require('./helpers/api');

test.describe('Student Join Errors', () => {
    test.beforeEach(async ({ request }) => {
        await endActiveSession(request);
    });

    test('should show an error when entering an invalid session code', async ({ page }) => {
        console.log('[STEP 1] Navigating to student join page');
        await page.goto('/');

        console.log('[STEP 1] Submitting a bogus session code');
        await page.getByTestId('session-code-input').fill('XXXXXX');
        await page.getByTestId('join-session-button').click();

        console.log('[STEP 1] Waiting for error message');
        const errorMsg = page.getByTestId('session-error-message');
        await expect(errorMsg).toBeVisible();
        const errorText = await errorMsg.innerText();
        console.log(`[STEP 1] Error shown: "${errorText}"`);
        // The backend returns 404 with detail "Session not found or invalid code"
        expect(errorText.toLowerCase()).toContain('invalid');

        // Stays on the join page — no navigation
        await expect(page).toHaveURL(/.*\/$/);
        console.log('[STEP 1] Student remains on join page — error path confirmed');
    });
});
