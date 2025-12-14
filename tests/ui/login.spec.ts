import { test, expect } from "@playwright/test";
import LoginPage from "../../page/ui/LoginPage";
import { attachScreenshot } from '../../helpers/reporterHelper';
import LogoutPage from "../../page/ui/LogoutPage";
import { TEST_CONFIG, ERROR_MESSAGES, TEST_DATA } from '../utils/testConfig';

// Configure test suite for better isolation
test.describe("Login Functionality Tests", () => {
  // Configure mode to ensure proper browser isolation
  test.describe.configure({ mode: 'parallel' });

  test.afterEach(async ({ page, context }) => {
    // Clean up after each test
    try {
      await context.clearCookies();
      await page.close();
    } catch (error) {
      // Ignore errors during cleanup
      console.log('Cleanup error (ignored):', error);
    }
  });

  test("TC_01: Should login successfully with valid account", async ({ page, context }) => {
    // Create isolated page instances
    const loginPage = new LoginPage(page);
    const logoutPage = new LogoutPage(page, loginPage);

    await loginPage.gotoWeb(TEST_CONFIG.WEB_LOGIN_URL);
    await loginPage.login(TEST_CONFIG.TEST_USER, TEST_CONFIG.TEST_PASS);

    expect(await loginPage.verifyLoginSuccess(TEST_CONFIG.TEST_USER)).toBeTruthy();
    await attachScreenshot(page, 'After Login');

    await logoutPage.logout();
  });

  test("TC_02: Should show error message with empty username and password", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.gotoWeb(TEST_CONFIG.WEB_LOGIN_URL);
    await loginPage.clickOpenLogin();
    await loginPage.enterUsernameAndPassword('', '');

    expect(await loginPage.verifyValidateUsernameError(ERROR_MESSAGES.EMPTY_FIELD)).toBeTruthy();
    expect(await loginPage.verifyValidatePasswordError(ERROR_MESSAGES.EMPTY_FIELD)).toBeTruthy();
  });

  test("TC_03: Should show error message with invalid username", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.gotoWeb(TEST_CONFIG.WEB_LOGIN_URL);
    await loginPage.login(TEST_DATA.INVALID_CREDENTIALS.INVALID_USERNAME, TEST_CONFIG.TEST_PASS);

    expect(await loginPage.loginWithInvalidUsername(ERROR_MESSAGES.INVALID_CUSTOMER)).toBeTruthy();
  });

  // Group dangerous tests that could cause account lockout
  test.describe.serial("Password Validation Tests", () => {
    test("TC_04: Should show error message with wrong password multiple times", async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.gotoWeb(TEST_CONFIG.WEB_LOGIN_URL);

      // Test 1st wrong password attempt
      await loginPage.login(TEST_CONFIG.TEST_USER, TEST_DATA.INVALID_CREDENTIALS.INVALID_PASSWORD);
      expect(await loginPage.verifyWrongPassword1()).toBeTruthy();
      await page.waitForTimeout(1000);

      // Test 2nd wrong password attempt
      await loginPage.enterUsernameAndPassword(TEST_CONFIG.TEST_USER, TEST_DATA.INVALID_CREDENTIALS.INVALID_PASSWORD);
      expect(await loginPage.verifyWrongPassword2()).toBeTruthy();
      await page.waitForTimeout(1000);

      // Test 3rd wrong password attempt
      await loginPage.enterUsernameAndPassword(TEST_CONFIG.TEST_USER, TEST_DATA.INVALID_CREDENTIALS.INVALID_PASSWORD);
      expect(await loginPage.verifyWrongPassword3()).toBeTruthy();

      // // Test 4th wrong password attempt
      // await loginPage.enterUsernameAndPassword(TEST_CONFIG.TEST_USER, TEST_DATA.INVALID_CREDENTIALS.INVALID_PASSWORD);
      // expect(await loginPage.verifyWrongPassword4()).toBeTruthy();

      // // Test 5th wrong password attempt
      // await loginPage.enterUsernameAndPassword(TEST_CONFIG.TEST_USER, TEST_DATA.INVALID_CREDENTIALS.INVALID_PASSWORD);
      // expect(await loginPage.verifyAccountLocked()).toBeTruthy();
    });
  });
});

