const { test, expect } = require('@playwright/test');

test.describe('Connection Tracking via WebSockets', () => {
    test.setTimeout(90000);

    test('Admin can see students connect and disconnect in real-time', async ({ browser }) => {
        // We will need three browser contexts: 1 Admin, 2 Students
        const adminContext = await browser.newContext();
        const student1Context = await browser.newContext();
        const student2Context = await browser.newContext();

        const adminPage = await adminContext.newPage();
        const student1Page = await student1Context.newPage();
        const student2Page = await student2Context.newPage();

        // =============== 1. ADMIN CREATES SESSION ===============
        await adminPage.goto('/admin/login');
        await adminPage.fill('input[type="text"]', 'admin');
        await adminPage.fill('input[type="password"]', 'admin');
        await adminPage.click('button[type="submit"]');
        await expect(adminPage).toHaveURL(/.*\/admin\/dashboard/);

        // Start session with isolated model
        await adminPage.click('button[title="meta-llama/llama-3-8b-instruct:free"]');
        await expect(adminPage.locator('text="Select AI Model"')).toBeVisible();
        await adminPage.click('text="test-model"');
        await adminPage.click('button:has-text("Start New Session")');
        await expect(adminPage).toHaveURL(/.*\/admin\/session\/.*/);

        // Get the session code
        const sessionUrl = adminPage.url();
        const sessionCode = sessionUrl.split('/').pop();

        // Verify initial 0 connections
        await expect(adminPage.locator('button:has-text("0 Students")')).toBeVisible();

        // =============== 2. STUDENT 1 JOINS ===============
        await student1Page.goto('/');
        await student1Page.fill('input[placeholder*="XYZ123"]', sessionCode);
        await student1Page.click('button:has-text("Join Session")');
        await expect(student1Page).toHaveURL(/.*\/session\/.*/);

        // Name Gate
        await student1Page.fill('input[placeholder="e.g. Jane Smith"]', 'Alice Test');
        await student1Page.click('button:has-text("Enter Session")');

        // Admin sees 1 connection
        await expect(adminPage.locator('button:has-text("1 Student")')).toBeVisible({ timeout: 15000 });

        // Admin opens modal to verify name
        await adminPage.locator('button:has-text("1 Student")').click();
        await expect(adminPage.locator('.fixed')).toBeVisible(); // Modal overlay
        await expect(adminPage.locator('span:has-text("Alice Test")')).toBeVisible();
        await adminPage.locator('button:has-text("Close")').click(); // Close Modal

        // =============== 3. STUDENT 2 JOINS ===============
        await student2Page.goto('/');
        await student2Page.fill('input[placeholder*="XYZ123"]', sessionCode);
        await student2Page.click('button:has-text("Join Session")');

        await student2Page.fill('input[placeholder="e.g. Jane Smith"]', 'Bob Test');
        await student2Page.click('button:has-text("Enter Session")');

        // Admin sees 2 connections
        await expect(adminPage.locator('button:has-text("2 Students")')).toBeVisible({ timeout: 15000 });

        // Modal verifies both names
        await adminPage.locator('button:has-text("2 Students")').click();
        await expect(adminPage.locator('span:has-text("Alice Test")')).toBeVisible();
        await expect(adminPage.locator('span:has-text("Bob Test")')).toBeVisible();
        await adminPage.locator('button:has-text("Close")').click();

        // =============== 4. STUDENT 1 DISCONNECTS ===============
        // Closing the browser tab outright
        await student1Context.close();

        // Admin should instantly see connections drop back down to 1
        await expect(adminPage.locator('button:has-text("1 Student")')).toBeVisible({ timeout: 15000 });

        // Modal should only contain Bob now
        await adminPage.locator('button:has-text("1 Student")').click();
        await expect(adminPage.locator('span:has-text("Alice Test")')).toHaveCount(0);
        await expect(adminPage.locator('span:has-text("Bob Test")')).toBeVisible();

        // Cleanup
        await adminContext.close();
        await student2Context.close();
    });
});
