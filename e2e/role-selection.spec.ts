/**
 * e2e/role-selection.spec.ts
 *
 * Regression test for the role selection bug:
 *   Selecting "worker" after being logged in as "employer" would redirect
 *   back to HomeEmployer due to a double-mutation race condition.
 *
 * Full LoginModal flow for a test user with userMode=null (profile reset on login):
 *   welcome → phone → OTP (auto-submit) → role → setup → success → modal closes
 *
 * Test strategy:
 *   - Uses the built-in "test" role user (+972548481498) which bypasses SMS OTP.
 *   - The OTP code for test users is the first 6 digits of the E.164 phone: "972548"
 *   - resetTestUserProfile() is called server-side on every test-user login,
 *     so each run starts with userMode=null → LoginModal goes to "role" step.
 *
 * Prerequisites:
 *   - Dev server running on http://localhost:3000
 *   - Test user exists in DB: phone=+972548481498, role=test
 */

import { test, expect, type Page } from "@playwright/test";

// ── Constants ────────────────────────────────────────────────────────────────
const BASE_URL = "http://localhost:3000";
/** Israeli phone number displayed in the input (formatted) */
const TEST_PHONE_DISPLAY = "054-848-1498";
/** First 6 digits of the E.164 number (+972548481498 → "972548") */
const TEST_OTP_CODE = "972548";
const OTP_LENGTH = 6;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Open the LoginModal by clicking the "כניסה" (Login) button in the Navbar.
 */
async function openLoginModal(page: Page): Promise<void> {
  const loginBtn = page.locator('button[aria-label="כניסה"]').first();
  await loginBtn.waitFor({ state: "visible", timeout: 8_000 });
  await loginBtn.click();
  // Wait for the modal backdrop to appear (the welcome step has a close button)
  await page.waitForSelector('button[aria-label="סגור"]', { timeout: 5_000 });
}

/**
 * Complete the phone-OTP login flow for the test user.
 * Assumes the LoginModal is already open at the "welcome" step.
 *
 * After OTP verification, the modal goes to the "role" step
 * (since test user profile is reset on login → userMode=null).
 */
async function loginWithTestUser(page: Page): Promise<void> {
  // Step 1: Click "התחברות" (Login) on the welcome screen
  await page.getByRole("button", { name: "התחברות" }).click();

  // Step 2: Wait for the phone input to appear (bottom sheet)
  const phoneInput = page.locator('input[placeholder="054-123-4567"]');
  await phoneInput.waitFor({ state: "visible", timeout: 8_000 });

  // Step 3: Fill in the phone number
  await phoneInput.fill(TEST_PHONE_DISPLAY);

  // Step 4: Click "קבל קוד ב-SMS" to trigger OTP send
  await page.getByRole("button", { name: /קבל קוד ב-SMS/i }).click();

  // Step 5: Wait for OTP inputs to appear (test bypass → no real SMS)
  const firstOtpInput = page.locator('input[inputmode="numeric"][maxlength="1"]').first();
  await firstOtpInput.waitFor({ state: "visible", timeout: 10_000 });

  // Step 6: Fill each OTP digit — the last digit triggers auto-submit
  const otpDigits = TEST_OTP_CODE.split("");
  const otpInputs = page.locator('input[inputmode="numeric"][maxlength="1"]');
  for (let i = 0; i < OTP_LENGTH; i++) {
    await otpInputs.nth(i).fill(otpDigits[i]);
    await page.waitForTimeout(60);
  }

  // Step 7: OTP auto-submits after the last digit.
  // Wait for the modal to transition to the "role" step
  await page.waitForSelector('text=איך תרצה להשתמש ב', { timeout: 12_000 });
}

/**
 * Select a role in the LoginModal's "role" step, then complete the setup step
 * by clicking "דלג" (skip). Waits for the modal to fully close.
 *
 * Full flow: role card click → setup step → click "דלג" → success step → modal closes
 */
async function selectRoleInModal(page: Page, role: "worker" | "employer"): Promise<void> {
  // Click the role card
  const buttonText = role === "worker" ? /אני מחפש עבודה/ : /אני מחפש עובדים/;
  await page.getByRole("button", { name: buttonText }).click();

  // Wait for the setup step to appear (shows "מה אתה מחפש?" or "איפה אתה צריך עובדים?")
  const setupHeading = role === "worker"
    ? page.locator('text=מה אתה מחפש')
    : page.locator('text=איפה אתה צריך עובדים');
  await setupHeading.waitFor({ state: "visible", timeout: 8_000 });

  // Click "דלג" (skip) to bypass the optional setup
  await page.getByRole("button", { name: "דלג" }).click();

  // Wait for the modal to fully close (success step has no close button, then modal unmounts)
  // We wait for the role step heading to disappear as confirmation
  await page.waitForFunction(
    () => !document.querySelector('[aria-label="סגור"]'),
    { timeout: 10_000 }
  );
}

/**
 * Logout via the Navbar dropdown.
 * Clicks the profile button to open the dropdown, then clicks "התנתק".
 */
async function logout(page: Page): Promise<void> {
  // The profile dropdown trigger is a button containing ChevronDown icon
  // It appears after login and shows the user's name or role badge
  // We locate it by finding a button with a ChevronDown SVG inside
  const profileBtn = page.locator('button').filter({
    has: page.locator('svg.lucide-chevron-down'),
  }).first();

  await profileBtn.waitFor({ state: "visible", timeout: 8_000 });
  await profileBtn.click();

  // Click "התנתק" (Logout) in the dropdown
  const logoutItem = page.getByRole("menuitem", { name: /התנתק/i });
  await logoutItem.waitFor({ state: "visible", timeout: 5_000 });
  await logoutItem.click();

  // Wait for auth state to clear — the login button should reappear
  await page.waitForSelector('button[aria-label="כניסה"]', { timeout: 8_000 });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Role Selection Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    // Dismiss cookie banner if present
    const cookieAccept = page.locator('button:has-text("אישור")').first();
    if (await cookieAccept.isVisible().catch(() => false)) {
      await cookieAccept.click();
    }
  });

  /**
   * Sanity test: role selection cards are visible in the LoginModal after login.
   */
  test("role selection screen shows both worker and employer cards after login", async ({ page }) => {
    await openLoginModal(page);
    await loginWithTestUser(page);

    // Both role cards should be visible in the LoginModal's role step
    await expect(page.getByRole("button", { name: /אני מחפש עבודה/ })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole("button", { name: /אני מחפש עובדים/ })).toBeVisible({ timeout: 5_000 });
  });

  /**
   * Sanity test: selecting employer role shows HomeEmployer.
   */
  test("selecting employer role shows HomeEmployer", async ({ page }) => {
    await openLoginModal(page);
    await loginWithTestUser(page);
    await selectRoleInModal(page, "employer");

    // HomeEmployer should be visible
    await expect(page.locator('[data-testid="home-employer"]')).toBeVisible({ timeout: 12_000 });
    await expect(page.locator('[data-testid="home-worker"]')).not.toBeVisible();
  });

  /**
   * Core regression test:
   * 1. Login → select employer → verify HomeEmployer
   * 2. Logout → login again → select worker → verify HomeWorker (NOT HomeEmployer)
   *
   * This test catches the double-mutation race condition bug where selecting "worker"
   * after previously being "employer" would redirect back to HomeEmployer.
   */
  test("selecting worker role shows HomeWorker, not HomeEmployer", async ({ page }) => {
    // ── Round 1: Login and select employer ──────────────────────────────────
    await openLoginModal(page);
    await loginWithTestUser(page);
    await selectRoleInModal(page, "employer");

    // Verify HomeEmployer is shown
    await expect(page.locator('[data-testid="home-employer"]')).toBeVisible({ timeout: 12_000 });

    // ── Logout ───────────────────────────────────────────────────────────────
    await logout(page);

    // ── Round 2: Login again and select worker ───────────────────────────────
    await openLoginModal(page);
    await loginWithTestUser(page);
    await selectRoleInModal(page, "worker");

    // ── Critical assertion: HomeWorker must be visible, NOT HomeEmployer ─────
    await expect(page.locator('[data-testid="home-worker"]')).toBeVisible({ timeout: 12_000 });
    await expect(page.locator('[data-testid="home-employer"]')).not.toBeVisible();
  });
});
