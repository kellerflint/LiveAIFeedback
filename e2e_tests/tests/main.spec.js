const { test, expect } = require('@playwright/test');

test.describe('Real-Time Teaching Feedback E2E', () => {
    test.setTimeout(60000); // 60 seconds

    test('Admin can create a session and student can submit an answer', async ({ browser }) => {
        // We need two browser contexts to simulate two users simultaneously
        const adminContext = await browser.newContext();
        const studentContext = await browser.newContext();

        const adminPage = await adminContext.newPage();
        const studentPage = await studentContext.newPage();

        // Auto-accept confirmation dialogs
        adminPage.on('dialog', dialog => dialog.accept());

        // =============== ADMIN FLOW ===============
        // 1. Admin logs in
        await adminPage.goto('/admin/login');
        await adminPage.fill('input[type="text"]', 'admin');
        await adminPage.fill('input[type="password"]', 'admin');
        await adminPage.click('button[type="submit"]');

        // Wait for redirect to dashboard
        await expect(adminPage).toHaveURL(/.*\/admin\/dashboard/);

        // 2. Admin creates a new question
        await adminPage.click('text=New Question');
        const questionText = `E2E Test Question ${Date.now()}`;

        // Wait for modal to render
        await expect(adminPage.getByText('Create New Question')).toBeVisible();

        await adminPage.fill('textarea[placeholder*="What is the powerhouse"]', questionText);
        await adminPage.fill('textarea[placeholder*="Mitochondria"]', 'Give 4 points for Mitochondria');
        await adminPage.click('button:has-text("Create Question")');

        // Verify question appeared
        await expect(adminPage.locator(`text=${questionText}`)).toBeVisible();

        // Force a clean state: If there's an active session from a dead test run, end it.
        const startSessionBtn = adminPage.locator('button:has-text("Start New Session")');
        if (!(await startSessionBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
            await expect(adminPage.locator('text="Loading sessions..."')).toHaveCount(0, { timeout: 10000 });
            const endBtn = adminPage.locator('button:has-text("End Session")').first();
            if (await endBtn.isVisible()) {
                await endBtn.click();
            }
        }
        await expect(startSessionBtn).toBeVisible();

        // 3. Admin clicks start and triggers the auto-prompt since no model is saved in this context
        await adminPage.click('button:has-text("Start New Session")');
        await expect(adminPage.locator('h3:has-text("Select AI Model")')).toBeVisible();

        // Admin picks 'test-model', which auto-starts the session via the pending state
        await adminPage.locator('.fixed').locator('text="test-model"').click();
        await expect(adminPage).toHaveURL(/.*\/admin\/session\/.*/);

        // Get the session code
        const sessionUrl = adminPage.url();
        const sessionCode = sessionUrl.split('/').pop();

        // 4. Admin launches the question
        // We look for our created question in the library and launch it
        const questionCard = adminPage.locator('.border', { hasText: questionText });
        await questionCard.locator('button:has-text("Launch")').click();

        // Verify toast appears
        await expect(adminPage.getByText('Question launched to students')).toBeVisible();

        // Verify it appears in results as "Accepting Responses"
        await expect(adminPage.locator(`h3:has-text("${questionText}")`)).toBeVisible();

        // =============== STUDENT FLOW ===============
        // 5. Student joins the session
        await studentPage.goto('/');
        await studentPage.fill('input[placeholder*="XYZ123"]', sessionCode);
        await studentPage.click('button:has-text("Join Session")');

        // 6. Student enters name and submits a response
        await expect(studentPage).toHaveURL(/.*\/session\/.*/);

        // Verify name gate is rendering and blocks textarea
        const answerInput = studentPage.locator('textarea');
        await expect(answerInput).toHaveCount(0); // Should not exist yet

        // Fill out name and pass gate
        await studentPage.fill('input[placeholder="e.g. Jane Smith"]', 'Test Student');
        await studentPage.click('button:has-text("Enter Session")');

        // Now textarea should be enabled and visible
        await expect(answerInput).toBeVisible();
        await expect(answerInput).toBeEnabled();

        await answerInput.fill('Mitochondria is the powerhouse of the cell.');
        await studentPage.click('button:has-text("Submit Answer")');

        // Wait for the AI grading to complete and show the score
        await expect(studentPage.locator('text=Response recorded and graded!')).toBeVisible({ timeout: 15000 });
        // Since we mocked AI, wait to see if a score appears (OpenRouter returns mock when no key)
        const scoreVal = await studentPage.locator('.font-extrabold').innerText();
        expect(parseInt(scoreVal)).toBeGreaterThanOrEqual(1);

        // =============== ADMIN VERIFICATION ===============
        // 7. Admin sees the result
        // Expands the student response accordion
        await adminPage.click('summary:has-text("Test Student")');
        await expect(adminPage.locator('text=Mitochondria is the powerhouse')).toBeVisible();

        // 8. Admin closes the question
        await adminPage.click('button:has-text("Close")');
        await expect(adminPage.getByText('Question closed')).toBeVisible();
        await expect(adminPage.locator('text=Closed').nth(0)).toBeVisible(); // The status badge

        // 9. Admin goes back to dashboard and deletes the created question
        await adminPage.goto('/admin/dashboard');

        // Find our question card
        const questionItem = adminPage.locator('li', { hasText: questionText });

        // Click the delete trash can inside it (force it since it's opacity-0 by default)
        await questionItem.locator('button[title="Delete Question"]').click({ force: true });

        // Assert the Toast
        await expect(adminPage.getByText('Question deleted successfully')).toBeVisible();

        // Assert the question list item is gone
        await expect(questionItem).toHaveCount(0);

        await adminContext.close();
        await studentContext.close();
    });
});
