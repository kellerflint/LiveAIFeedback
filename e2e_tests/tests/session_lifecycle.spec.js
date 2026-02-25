import { test, expect } from '@playwright/test';

test.describe('Session Lifecycle Management', () => {

    test('Admin can end a session and active students are auto-kicked', async ({ browser }) => {
        // 1. Setup Admin Context
        const adminContext = await browser.newContext();
        const adminPage = await adminContext.newPage();

        // Auto-accept all alerts/confirms
        adminPage.on('dialog', dialog => dialog.accept());

        await adminPage.goto('http://localhost:5173/admin/login');
        await adminPage.fill('input[type="text"]', 'admin');
        await adminPage.fill('input[type="password"]', 'admin');
        await adminPage.click('button[type="submit"]');
        await expect(adminPage).toHaveURL('http://localhost:5173/admin/dashboard');

        // Force a clean state: If there's an active session from a dead test run, end it.
        const startSessionBtn = adminPage.locator('button:has-text("Start New Session")');
        if (!(await startSessionBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
            // Wait for history table to load
            await expect(adminPage.locator('text="Loading sessions..."')).toHaveCount(0, { timeout: 10000 });
            const endBtn = adminPage.locator('button:has-text("End Session")').first();
            if (await endBtn.isVisible()) {
                await endBtn.click();
            }
        }
        await expect(startSessionBtn).toBeVisible();

        // 2. Start a New Session 
        // Start session triggering auto-model prompt
        await adminPage.click('button:has-text("Start New Session")');
        await expect(adminPage.locator('h3:has-text("Select AI Model")')).toBeVisible();
        await adminPage.locator('.fixed').locator('text="test-model"').click();
        await expect(adminPage).toHaveURL(/.*\/admin\/session\/.*/);

        // Extract session code
        const sessionUrl = adminPage.url();
        const sessionCode = sessionUrl.split('/').pop();

        // 3. Student Joins the Session
        const studentContext = await browser.newContext();
        const studentPage = await studentContext.newPage();
        await studentPage.goto('http://localhost:5173/');
        await studentPage.fill('input[type="text"]', sessionCode);
        await studentPage.click('button[type="submit"]');

        await expect(studentPage).toHaveURL(/.*\/session\/.*/);

        // Student sets name
        await studentPage.fill('input[placeholder="e.g. Jane Smith"]', 'Ejected Student');
        await studentPage.click('button:has-text("Enter Session")');

        // Student is waiting for questions
        await expect(studentPage.locator('text="Waiting for next question"')).toBeVisible();

        // 4. Admin returns to dashboard and ends session
        await expect(adminPage.locator('h1:has-text("Live Session")')).toBeVisible(); // Wait to ensure load
        await adminPage.click('button:has(svg.lucide-arrow-left)'); // Go back to dashboard using the Arrow icon button

        await expect(adminPage).toHaveURL('http://localhost:5173/admin/dashboard');

        // Force a reload to guarantee the Admin dashboard pulls the freshest Database state
        await adminPage.reload();
        await expect(adminPage.locator('text="Session History"')).toBeVisible();

        // Find the "End Session" button in the table and click it. 
        // We use .first() just in case the backend had straggling data.
        const htmlDump = await adminPage.content();
        console.log("HTML DUMP OF DASHBOARD:", htmlDump);
        await adminPage.locator('button:has-text("End Session")').first().click();

        // It should disappear, replaced by "View Results" and a Trash icon
        await expect(adminPage.locator('button:has-text("View Results")').first()).toBeVisible();

        // 5. Verify Student Kick
        // The student should automatically get rerouted home
        await expect(studentPage).toHaveURL('http://localhost:5173/');
        // The toast/error text should appear on the student UI
        await expect(studentPage.locator('text="The instructor has closed this session."')).toBeVisible();

        // 6. Admin Deletes the Session
        // Click the Trash icon (it has a title "Delete Session")
        await adminPage.click('button[title="Delete Session"]');

        // Wait a bit to ensure the deletion finishes before close
        await adminPage.waitForTimeout(500);

        await adminContext.close();
        await studentContext.close();
    });

});
