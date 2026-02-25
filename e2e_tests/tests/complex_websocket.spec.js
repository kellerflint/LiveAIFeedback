const { test, expect } = require('@playwright/test');

test.describe('Complex WebSocket Tracking & Broadcasting', () => {
    test.setTimeout(120000); // 120 seconds to give ample UI buffer

    test('Multiple students connect, receive questions, disconnect, and auto-kick flawlessly', async ({ browser }) => {
        // We will need three browser contexts: 1 Admin, 2 Students
        const adminContext = await browser.newContext();
        const student1Context = await browser.newContext();
        const student2Context = await browser.newContext();

        const adminPage = await adminContext.newPage();
        const student1Page = await student1Context.newPage();
        const student2Page = await student2Context.newPage();

        // Auto-accept confirmation dialogs
        adminPage.on('dialog', dialog => dialog.accept());

        // =============== 1. ADMIN CREATES SESSION ===============
        await adminPage.goto('/admin/login');
        await adminPage.fill('input[type="text"]', 'admin');
        await adminPage.fill('input[type="password"]', 'admin');
        await adminPage.click('button[type="submit"]');
        await expect(adminPage).toHaveURL(/.*\/admin\/dashboard/);

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

        // Create a new complex test question
        await adminPage.click('text=New Question');

        // Wait for modal to render
        await expect(adminPage.getByText('Create New Question')).toBeVisible();

        const questionText = `Complex E2E Socket Flow Verification ${Date.now()}`;
        await adminPage.fill('textarea[placeholder*="What is the powerhouse"]', questionText);
        await adminPage.fill('textarea[placeholder*="Mitochondria"]', 'Complex logic requires complex tests.');
        await adminPage.click('button:has-text("Create Question")');
        await expect(adminPage.locator(`text=${questionText}`)).toBeVisible();

        // Start session triggering auto-model prompt
        await adminPage.click('button:has-text("Start New Session")');
        await expect(adminPage.locator('h3:has-text("Select AI Model")')).toBeVisible();
        await adminPage.locator('.fixed').locator('text="test-model"').click();
        await expect(adminPage).toHaveURL(/.*\/admin\/session\/.*/);

        // Get the session code
        const sessionUrl = adminPage.url();
        const sessionCode = sessionUrl.split('/').pop();

        // =============== 2. STUDENTS JOIN ===============
        await student1Page.goto('/');
        await student1Page.fill('input[placeholder*="XYZ123"]', sessionCode);
        await student1Page.click('button:has-text("Join Session")');
        await expect(student1Page).toHaveURL(/.*\/session\/.*/);
        await student1Page.fill('input[placeholder="e.g. Jane Smith"]', 'Complex Student 1');
        await student1Page.click('button:has-text("Enter Session")');
        await expect(student1Page.locator('text="Waiting for next question"')).toBeVisible();

        await student2Page.goto('/');
        await student2Page.fill('input[placeholder*="XYZ123"]', sessionCode);
        await student2Page.click('button:has-text("Join Session")');
        await expect(student2Page).toHaveURL(/.*\/session\/.*/);
        await student2Page.fill('input[placeholder="e.g. Jane Smith"]', 'Complex Student 2');
        await student2Page.click('button:has-text("Enter Session")');
        await expect(student2Page.locator('text="Waiting for next question"')).toBeVisible();

        // Admin verifies connection parity
        await expect(adminPage.locator('button:has-text("2 Students")')).toBeVisible({ timeout: 15000 });

        // =============== 3. ADMIN LAUNCHES QUESTION ===============
        const questionCard = adminPage.locator('.border', { hasText: questionText }).first();
        await questionCard.locator('button:has-text("Launch")').click();

        // Wait for question to appear in the active UI tray block
        await expect(adminPage.getByText('Question launched to students')).toBeVisible();
        await expect(adminPage.locator('.border-blue-300', { hasText: questionText })).toBeVisible();

        // =============== 4. STUDENTS RECEIVE QUESTION ===============
        await expect(student1Page.locator(`text=${questionText}`)).toBeVisible();
        await expect(student2Page.locator(`text=${questionText}`)).toBeVisible();

        // =============== 5. ADMIN CLOSES QUESTION ===============
        // Click the Red "Close" button inside the active question block
        const activeQuestionBlock = adminPage.locator('.border-blue-300', { hasText: questionText });
        await activeQuestionBlock.locator('button:has-text("Close")').click();

        // Admin verifies question state switched to "Closed"
        await expect(adminPage.locator('.bg-gray-100.text-gray-600', { hasText: "Closed" })).toBeVisible();

        // Students should revert securely
        await expect(student1Page.locator('text="Waiting for next question"')).toBeVisible();
        await expect(student2Page.locator('text="Waiting for next question"')).toBeVisible();

        // =============== 6. PARTIAL DISCONNECTION TEST ===============
        // Let's hard reload student 1, tearing down their websocket abruptly, then verifying bounceback
        await student1Page.reload();
        await student1Page.fill('input[placeholder="e.g. Jane Smith"]', 'Complex Student 1 Retuned');
        await student1Page.click('button:has-text("Enter Session")');
        await expect(student1Page.locator('text="Waiting for next question"')).toBeVisible();

        // Actually killing a tab completely
        await student2Context.close();

        // Admin should instantly drop to 1 Student connection
        await expect(adminPage.locator('button:has-text("1 Student")')).toBeVisible({ timeout: 15000 });

        // Admin verifies the Modal only prints the returning student
        await adminPage.locator('button:has-text("1 Student")').click();
        await expect(adminPage.locator('h3:has-text("Connected Students")')).toBeVisible();
        await expect(adminPage.locator('span:has-text("Complex Student 1 Retuned")')).toBeVisible();
        await expect(adminPage.locator('span:has-text("Complex Student 2")')).toHaveCount(0);
        await adminPage.locator('button:has-text("Close")').click();

        // =============== 7. ADMIN ENDS SESSION (KICK VERIFICATION) ===============
        // Drop back out to dashboard
        await adminPage.locator('button:has(svg.lucide-arrow-left)').click();
        await expect(adminPage).toHaveURL(/.*\/admin\/dashboard/);

        // End the session
        await adminPage.reload();
        await adminPage.locator('button:has-text("End Session")').first().click();

        // Student 1 (the remaining survivor) watches the socket die and eject them
        await expect(student1Page).toHaveURL('/');
        await expect(student1Page.locator('text="The instructor has closed this session."')).toBeVisible();

        // Cleanup
        await adminContext.close();
        await student1Context.close();
    });
});
