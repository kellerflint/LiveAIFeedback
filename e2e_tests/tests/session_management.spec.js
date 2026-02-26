const { test, expect } = require('@playwright/test');
const { endActiveSession } = require('./helpers/api');
const { adminLoginUI, startSession, studentJoin, endSessionUI } = require('./helpers/ui');

test.describe('Session Management', () => {
    test.beforeEach(async ({ page, request }) => {
        await endActiveSession(request);
        await adminLoginUI(page);
    });

    test('should end an active session', async ({ page, browser }) => {
        // 1. Start a new session
        console.log('[STEP 1] Starting a new session');
        const sessionCode = await startSession(page);

        // 2. Student joins in a separate context
        console.log('[STEP 2] Student joining session');
        const studentContext = await browser.newContext();
        const studentPage = await studentContext.newPage();
        await studentJoin(studentPage, sessionCode, 'Bob');

        // 3. Admin ends session
        console.log('[STEP 3] Admin ending session');
        await endSessionUI(page);

        const toast = page.getByTestId('toast');
        await expect(toast).toBeVisible();
        await expect(toast).toContainText('Session ended successfully');
        await expect(page.getByTestId('end-session-button')).not.toBeVisible();
        console.log('[STEP 3] Session ended confirmed via toast');

        // 4. Verify student is redirected with session-closed message
        console.log('[STEP 4] Verifying student was kicked to the join page');
        await expect(studentPage).toHaveURL(/.*\/$/);
        const closedMsg = studentPage.getByTestId('session-error-message');
        await expect(closedMsg).toBeVisible();
        await expect(closedMsg).toContainText('The instructor has closed this session.');
        console.log('[STEP 4] Student redirect and closed-session message confirmed');

        await studentContext.close();
    });
});
