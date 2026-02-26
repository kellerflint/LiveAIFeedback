const { test, expect } = require('@playwright/test');
const { endActiveSession } = require('./helpers/api');
const { adminLoginUI, startSession, studentJoin, createQuestion, launchFirstQuestion, endSessionUI } = require('./helpers/ui');

test.describe('Admin Close Question', () => {
    test.beforeEach(async ({ request }) => {
        await endActiveSession(request);
    });

    test('should close a single active question mid-session and remove it from the student view', async ({ browser }) => {
        const adminContext = await browser.newContext();
        const studentContext = await browser.newContext();
        const adminPage = await adminContext.newPage();
        const studentPage = await studentContext.newPage();

        // 1. Admin logs in and starts a session
        await adminLoginUI(adminPage);
        console.log('[STEP 1] Starting a new session');
        const code = await startSession(adminPage);

        // 2. Student joins
        console.log('[STEP 2] Student joining session');
        await studentJoin(studentPage, code, 'Charlie');

        // 3. Admin creates and launches a question
        console.log('[STEP 3] Admin creating and launching a question');
        await createQuestion(adminPage, 'Close test question?', 'Any answer');
        await launchFirstQuestion(adminPage);

        // Verify student sees the question
        const studentTextarea = studentPage.locator('[data-testid^="question-response-textarea-"]');
        await expect(studentTextarea).toBeVisible();
        console.log('[STEP 3] Student can see the question input');

        // 4. Admin closes the question
        console.log('[STEP 4] Admin closing the question');
        const closeBtn = adminPage.locator('[data-testid^="close-question-button-"]').first();
        await closeBtn.click();

        const closeToast = adminPage.getByTestId('toast');
        await expect(closeToast).toBeVisible();
        await expect(closeToast).toContainText('Question closed');
        console.log('[STEP 4] Question closed — toast confirmed');

        // 5. Verify question disappears from student view
        console.log('[STEP 5] Verifying student no longer sees the question');
        await expect(studentTextarea).not.toBeVisible({ timeout: 10000 });
        await expect(studentPage.getByTestId('waiting-for-next-question')).toBeVisible();
        console.log('[STEP 5] Student is back to waiting state — close confirmed');

        // Cleanup
        console.log('[CLEANUP] Ending session');
        await endSessionUI(adminPage);

        await adminContext.close();
        await studentContext.close();
    });
});
