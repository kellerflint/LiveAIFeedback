---
trigger: always_on
---

# Test Standards

This document is required reading before writing, modifying, or debugging any test. Follow every rule in this document. Do not deviate from these conventions unless explicitly told otherwise.


## End-to-End Tests

End-to-end tests are the primary quality gate for this application. They simulate real user workflows and verify that the application behaves correctly from the user's perspective.

Every interactive or assertable element in the UI must have a `data-testid` attribute. Use clear, descriptive names like `data-testid="create-task-button"` or `data-testid="task-list-item"`. All test selectors must reference `data-testid` attributes exclusively. Never select elements by CSS class, text content, XPath, or DOM structure.

Each test should cover a single, focused user workflow. A test that verifies task creation should not also verify task deletion. Keep them scoped.

Set timeouts to 30 seconds maximum per test. If a workflow genuinely requires more time, that is a sign the test is doing too much or the feature has a performance problem. Both of those should be addressed directly.

Tests must not share state with each other. Each test sets up what it needs, runs, and cleans up after itself. Execution order should never matter.


## Test Database

All automated tests must run against a dedicated test database that is completely separate from the development and production databases. Never reuse the dev database for automated testing. The test database should be wiped and reseeded as part of the test setup process.


## Contract Tests

Every API endpoint should have a contract test that verifies the shape of data going in and the shape of data coming out. POST to the endpoint with known input, then assert that the response body contains the expected fields and types. Also verify that the corresponding database record was created or modified correctly.

These tests serve a specific purpose: when an end-to-end test fails, the contract tests tell you immediately whether the problem is in the backend or the frontend. Keep them fast and narrowly scoped.


## Running Tests

After completing a change, run the full end-to-end suite once.

If a specific test fails, re-run only that test. Do not re-run the entire suite to check a fix for a single test. Only run the full suite again after the failing test passes in isolation, as a final verification.


## Diagnosing Failures

**This is the most important section in this document.**

When a test fails, you must be able to clearly and completely explain what is happening and why before you attempt any fix. If you cannot explain the failure in plain language, you are not ready to fix it.

If the existing test output is insufficient, add logging or inspection to get closer to full understanding, then re-run the test. Repeat until you can fully explain the problem.

Once the problem is completely clear, fix it.

Every assertion should log what it expected and what it actually received on failure. Include the step the test was on, the expected value, the actual value, and relevant context like the API response body or visible DOM state.


## Logging Philosophy

Tests should log meaningful checkpoints as they run, not just on failure. When a test starts a step (like submitting a form or waiting for a response), it should log that it is doing so, along with any relevant data like the request payload. Keep logs structured and concise. The goal is that reading the test output for a failed run gives you a complete narrative of what happened and where it diverged from expectations.

Do not dump entire DOM trees or massive objects into logs. Log the specific, relevant data: the response status, the key fields from a response body, the text or state of the element being asserted on.


## Self-Auditing

Periodically review the test suite for anti-patterns. Look for tests that are slow, tests that overlap significantly in what they cover, selectors that have drifted from the conventions in this document, and assertions that are too brittle or too loose. Run the full suite after any refactor to verify nothing broke.