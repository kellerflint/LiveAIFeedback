/**
 * Shared API helpers for E2E test setup and teardown.
 * Uses Playwright's `request` fixture to hit the backend directly,
 * keeping setup out of the UI and making tests order-independent.
 */

const BASE_URL = process.env.BASE_URL || 'http://host.docker.internal:8001';

/**
 * Logs in as admin and returns a bearer token.
 * @param {import('@playwright/test').APIRequestContext} request
 * @returns {Promise<string>} Bearer token
 */
async function adminLogin(request) {
    console.log('[API HELPER] Logging in as admin via API');
    const res = await request.post(`${BASE_URL}/api/admin/login`, {
        form: { username: 'admin', password: 'admin' }
    });
    if (!res.ok()) {
        throw new Error(`[API HELPER] Admin login failed: ${res.status()} ${await res.text()}`);
    }
    const token = (await res.json()).access_token;
    console.log('[API HELPER] Admin login successful, token acquired');
    return token;
}

/**
 * Finds any active session and ends it via the API.
 * This ensures each test starts with a clean slate — no lingering sessions.
 * @param {import('@playwright/test').APIRequestContext} request
 */
async function endActiveSession(request) {
    const token = await adminLogin(request);
    const headers = { Authorization: `Bearer ${token}` };

    console.log('[API HELPER] Checking for active sessions');
    const sessionsRes = await request.get(`${BASE_URL}/api/admin/sessions`, { headers });
    if (!sessionsRes.ok()) {
        console.log(`[API HELPER] Could not fetch sessions: ${sessionsRes.status()}`);
        return;
    }

    const sessions = await sessionsRes.json();
    const active = sessions.filter(s => s.status === 'active');

    if (active.length === 0) {
        console.log('[API HELPER] No active sessions found — state is clean');
        return;
    }

    for (const session of active) {
        console.log(`[API HELPER] Ending active session id=${session.id}`);
        const endRes = await request.put(`${BASE_URL}/api/admin/sessions/${session.id}/end`, { headers });
        if (endRes.ok()) {
            console.log(`[API HELPER] Session id=${session.id} ended successfully`);
        } else {
            console.log(`[API HELPER] Failed to end session id=${session.id}: ${endRes.status()} ${await endRes.text()}`);
        }
    }
}

module.exports = { adminLogin, endActiveSession };
