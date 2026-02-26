const { test, expect } = require('@playwright/test');
const { endActiveSession } = require('./helpers/api');
const { adminLoginUI, createQuestion } = require('./helpers/ui');

test.describe('Admin Question Management', () => {
    test.beforeEach(async ({ page, request }) => {
        await endActiveSession(request);
        await adminLoginUI(page);
    });

    test('should create and then delete a question', async ({ page }) => {
        const questionText = `Test Question ${Date.now()}`;
        const criteria = 'Test criteria';

        // 1. Create question
        console.log(`[STEP 1] Creating question: "${questionText}"`);
        await createQuestion(page, questionText, criteria);

        // Verify creation via toast and question card
        console.log('[STEP 1] Verifying question was created');
        const toast = page.getByTestId('toast');
        await expect(toast).toBeVisible();
        await expect(toast).toContainText('Question created successfully');

        const questionCard = page.locator('[data-testid^="question-card-"]').filter({ hasText: questionText });
        await expect(questionCard).toBeVisible();
        console.log('[STEP 1] Question card is visible on the page');

        // 2. Delete question — register dialog handler synchronously before the click
        console.log(`[STEP 2] Deleting question: "${questionText}"`);
        page.once('dialog', dialog => {
            console.log(`[DIALOG] Accepting: "${dialog.message()}"`);
            dialog.accept();
        });

        const deleteBtn = questionCard.locator('[data-testid^="delete-question-button-"]');
        await deleteBtn.click();

        // Verify deletion via toast and card disappearance
        console.log('[STEP 2] Verifying question was deleted');
        const deleteToast = page.getByTestId('toast');
        await expect(deleteToast).toBeVisible();
        await expect(deleteToast).toContainText('Question deleted successfully');

        await expect(questionCard).not.toBeVisible();
        console.log('[STEP 2] Question card is gone — deletion confirmed');
    });
});
