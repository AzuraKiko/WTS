import { test, expect } from "@playwright/test";
import LoginPage from "../../page/ui/LoginPage";
import { attachScreenshot } from '../../helpers/reporterHelper';
import LogoutPage from "../../page/ui/LogoutPage";
import { TEST_CONFIG } from '../utils/testConfig';

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
    expect(await logoutPage.verifyLogoutSuccess()).toBe(true);
  });
});

