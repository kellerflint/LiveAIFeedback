const { test, expect } = require('@playwright/test');
const { endActiveSession } = require('./helpers/api');
const { adminLoginUI, startSession, studentJoin, createQuestion, launchFirstQuestion, endSessionUI } = require('./helpers/ui');

test.describe('Core Session Flow', () => {
    test.beforeEach(async ({ request }) => {
        await endActiveSession(request);
    });

    test('Admin starts session, student joins, launches question, and student submits answer', async ({ browser }) => {
        const adminContext = await browser.newContext();
        const studentContext = await browser.newContext();
        const adminPage = await adminContext.newPage();
        const studentPage = await studentContext.newPage();

        // 1. Admin logs in
        await adminLoginUI(adminPage);

        // 2. Start session
        console.log('[STEP 2] Starting session');
        const code = await startSession(adminPage);

        // 3. Student joins
        console.log('[STEP 3] Student joining session');
        await studentJoin(studentPage, code, 'Alice');

        // 4. Admin creates and launches a question
        console.log('[STEP 4] Admin creating a question');
        await createQuestion(adminPage, 'What is 2+2?', '4');

        console.log('[STEP 4] Admin launching the question');
        await launchFirstQuestion(adminPage);

        // 5. Student submits answer
        console.log('[STEP 5] Student submitting answer');
        const textarea = studentPage.locator('[data-testid^="question-response-textarea-"]');
        await expect(textarea).toBeVisible();
        await textarea.fill('4');
        const submitBtn = studentPage.locator('[data-testid^="submit-answer-button-"]').first();
        await submitBtn.click();
        console.log('[STEP 5] Answer submitted — waiting for AI grading');

        // 6. Verify AI grading returned a score
        await expect(studentPage.getByTestId('response-score')).toBeVisible({ timeout: 15000 });
        const scoreText = await studentPage.getByTestId('response-score').innerText();
        console.log(`[STEP 6] Score element text: "${scoreText}"`);
        expect(scoreText).toContain('3');

        // 7. Admin sees student response in results panel
        console.log('[STEP 7] Verifying admin sees Alice\'s response');
        await expect(adminPage.getByTestId('student-response-summary-Alice')).toBeVisible();
        console.log('[STEP 7] Admin result for "Alice" is visible');

        // 8. Cleanup — end session
        console.log('[STEP 8] Ending session');
        await endSessionUI(adminPage);

        const endToast = adminPage.getByTestId('toast');
        await expect(endToast).toContainText('Session ended successfully');
        console.log('[STEP 8] Session ended successfully');

        await adminContext.close();
        await studentContext.close();
    });
});
