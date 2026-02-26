/**
 * Shared UI-level helpers for E2E tests.
 * Each function accepts a Playwright Page object (and any necessary args)
 * and performs a well-known, repeatable UI flow.
 *
 * Intentionally does NOT make assertions. Tests own their own assertion logic.
 */

const { expect } = require('@playwright/test');

/**
 * Logs in as admin via the browser UI and waits for the dashboard.
 * @param {import('@playwright/test').Page} page
 */
async function adminLoginUI(page) {
    console.log('[UI HELPER] Admin logging in via UI');
    await page.goto('/admin/login');
    await page.getByTestId('login-username').fill('admin');
    await page.getByTestId('login-password').fill('admin');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
    console.log('[UI HELPER] Admin login successful, on dashboard');
}

/**
 * Starts a new session (must already be on the dashboard / session live page with
 * the start-session-button visible). Clicks through the model picker and returns
 * the 6-character session code.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>} 6-character session code
 */
async function startSession(page) {
    console.log('[UI HELPER] Starting new session');
    await page.getByTestId('start-session-button').click();
    await page.getByTestId('model-option-test-model').click();
    await expect(page).toHaveURL(/.*\/admin\/session\/.*/);
    const codeText = await page.getByTestId('session-code-display').innerText();
    const code = codeText.trim().substring(0, 6);
    console.log(`[UI HELPER] Session started with code: ${code}`);
    return code;
}

/**
 * Joins a session as a student and waits until the "waiting for question" screen appears.
 * @param {import('@playwright/test').Page} studentPage - A dedicated student browser page
 * @param {string} code - 6-character session code
 * @param {string} name - Student display name
 */
async function studentJoin(studentPage, code, name) {
    console.log(`[UI HELPER] Student "${name}" joining session with code: ${code}`);
    await studentPage.goto('/');
    await studentPage.getByTestId('session-code-input').fill(code);
    await studentPage.getByTestId('join-session-button').click();
    await studentPage.getByTestId('student-name-input').fill(name);
    await studentPage.getByTestId('enter-session-button').click();
    await expect(studentPage.getByTestId('waiting-for-next-question')).toBeVisible();
    console.log(`[UI HELPER] Student "${name}" joined and is waiting for questions`);
}

/**
 * Opens the question creation modal, fills in the provided text and criteria,
 * and submits the form. Does NOT assert on the resulting toast — callers do that.
 * @param {import('@playwright/test').Page} page
 * @param {string} text - Question text
 * @param {string} criteria - Grading criteria
 */
async function createQuestion(page, text, criteria) {
    console.log(`[UI HELPER] Creating question: "${text}"`);
    await page.getByTestId('new-question-button').click();
    await page.getByTestId('question-text-input').fill(text);
    await page.getByTestId('grading-criteria-input').fill(criteria);
    await page.getByTestId('save-question-button').click();
}

/**
 * Clicks the first available launch button in the question list and waits for
 * the "Question launched" toast to confirm dispatch. Does NOT assert on the
 * toast text — callers do that if they need to.
 * @param {import('@playwright/test').Page} page
 */
async function launchFirstQuestion(page) {
    console.log('[UI HELPER] Launching first available question');
    const launchBtn = page.locator('[data-testid^="launch-question-button-"]').first();
    await launchBtn.click();
    await expect(page.getByTestId('toast')).toContainText('Question launched to students');
    console.log('[UI HELPER] Question launched — toast confirmed');
}

/**
 * Ends the active session via the UI. Registers the dialog handler synchronously
 * before clicking so there is no race window, then waits for the button to disappear.
 * @param {import('@playwright/test').Page} adminPage
 */
async function endSessionUI(adminPage) {
    console.log('[UI HELPER] Ending active session');
    adminPage.once('dialog', dialog => {
        console.log(`[DIALOG] Accepting: "${dialog.message()}"`);
        dialog.accept();
    });
    await adminPage.getByTestId('end-session-button').click();
    await expect(adminPage.getByTestId('end-session-button')).not.toBeVisible();
    console.log('[UI HELPER] Session ended');
}

module.exports = { adminLoginUI, startSession, studentJoin, createQuestion, launchFirstQuestion, endSessionUI };
