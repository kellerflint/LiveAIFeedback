const { test, expect } = require('@playwright/test');
const { endActiveSession } = require('./helpers/api');
const { adminLoginUI, startSession, studentJoin, createQuestion, launchFirstQuestion, endSessionUI } = require('./helpers/ui');

test.describe('CSV Export', () => {
    test.beforeEach(async ({ request }) => {
        await endActiveSession(request);
    });

    test('should show the download CSV button and trigger a download after a response is submitted', async ({ browser }) => {
        const adminContext = await browser.newContext();
        const studentContext = await browser.newContext();
        const adminPage = await adminContext.newPage();
        const studentPage = await studentContext.newPage();

        // 1. Admin logs in and starts a session
        await adminLoginUI(adminPage);
        console.log('[STEP 1] Starting session');
        const code = await startSession(adminPage);

        // 2. Student joins
        console.log('[STEP 2] Student joining');
        await studentJoin(studentPage, code, 'Eve');

        // 3. Admin creates and launches a question
        console.log('[STEP 3] Admin creating and launching a question');
        await createQuestion(adminPage, 'CSV test question?', 'Any answer');
        await launchFirstQuestion(adminPage);

        // 4. Student submits an answer
        console.log('[STEP 4] Student submitting answer');
        const textarea = studentPage.locator('[data-testid^="question-response-textarea-"]');
        await expect(textarea).toBeVisible();
        await textarea.fill('My answer for CSV export');
        const submitBtn = studentPage.locator('[data-testid^="submit-answer-button-"]').first();
        await submitBtn.click();
        console.log('[STEP 4] Answer submitted — waiting for score');
        await expect(studentPage.getByTestId('response-score')).toBeVisible({ timeout: 15000 });

        // 5. Verify the CSV button appears and triggers a download
        console.log('[STEP 5] Verifying Download CSV button is visible on admin panel');
        const csvBtn = adminPage.getByTestId('download-csv-button');
        await expect(csvBtn).toBeVisible();
        console.log('[STEP 5] Download CSV button is visible');

        const [download] = await Promise.all([
            adminPage.waitForEvent('download'),
            csvBtn.click(),
        ]);

        const filename = download.suggestedFilename();
        console.log(`[STEP 5] Download triggered — suggested filename: "${filename}"`);
        expect(filename).toMatch(/session_\d+_results\.csv/);

        const csvToast = adminPage.getByTestId('toast');
        await expect(csvToast).toContainText('CSV downloaded!');
        console.log('[STEP 5] CSV download confirmed via toast and download event');

        // Cleanup
        console.log('[CLEANUP] Ending session');
        await endSessionUI(adminPage);

        await adminContext.close();
        await studentContext.close();
    });
});
