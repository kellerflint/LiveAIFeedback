const { test, expect } = require('@playwright/test');
const { endActiveSession } = require('./helpers/api');
const { adminLoginUI, startSession, studentJoin, createQuestion, endSessionUI } = require('./helpers/ui');

test.describe('Launch Collection', () => {
    test.beforeEach(async ({ request }) => {
        await endActiveSession(request);
    });

    test('should launch all questions in a collection at once and students see them', async ({ browser }) => {
        const adminContext = await browser.newContext();
        const studentContext = await browser.newContext();
        const adminPage = await adminContext.newPage();
        const studentPage = await studentContext.newPage();

        // 1. Admin logs in
        await adminLoginUI(adminPage);

        // 2. Create two questions in the Default collection
        console.log('[STEP 2] Creating two questions in the Default collection');
        await createQuestion(adminPage, 'Collection Q1', 'Any answer');
        await expect(adminPage.getByTestId('toast')).toContainText('Question created successfully');

        await createQuestion(adminPage, 'Collection Q2', 'Any answer');
        await expect(adminPage.getByTestId('toast')).toContainText('Question created successfully');
        console.log('[STEP 2] Both questions created');

        // 3. Start session
        console.log('[STEP 3] Starting a new session');
        const code = await startSession(adminPage);

        // 4. Student joins
        console.log('[STEP 4] Student joining session');
        await studentJoin(studentPage, code, 'Dana');

        // 5. Admin launches entire collection
        console.log('[STEP 5] Admin launching entire Default collection');
        const launchCollectionBtn = adminPage.getByTestId('launch-collection-button');
        await expect(launchCollectionBtn).toBeVisible();
        await launchCollectionBtn.click();

        const launchToast = adminPage.getByTestId('toast');
        await expect(launchToast).toBeVisible();
        await expect(launchToast).toContainText('question(s) to students');
        const toastText = await launchToast.innerText();
        console.log(`[STEP 5] Launch toast: "${toastText}"`);

        // 6. Verify student sees multiple question inputs
        console.log('[STEP 6] Verifying student sees multiple question textareas');
        const textareas = studentPage.locator('[data-testid^="question-response-textarea-"]');
        await expect(textareas.first()).toBeVisible({ timeout: 10000 });
        const questionCount = await textareas.count();
        console.log(`[STEP 6] Student sees ${questionCount} question(s)`);
        expect(questionCount).toBeGreaterThanOrEqual(2);

        // Cleanup
        console.log('[CLEANUP] Ending session');
        await endSessionUI(adminPage);

        await adminContext.close();
        await studentContext.close();
    });
});
