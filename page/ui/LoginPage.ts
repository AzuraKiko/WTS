import { Page, Locator } from '@playwright/test';
import BasePage from './BasePage';
import { TEST_CONFIG } from '../../tests/utils/testConfig';
import { WaitUtils } from '../../helpers/uiUtils';

class LoginPage extends BasePage {
    openLogin: Locator;
    usernameInput: Locator;
    passwordInput: Locator;
    loginButton: Locator;
    verifyUser: Locator;
    closeBanner: Locator;

    constructor(page: Page) {
        super(page);
        this.openLogin = page.locator('.header-btn.btn-login');
        this.usernameInput = page.locator('[name="username"]');
        this.passwordInput = page.locator('[name="password"]');
        this.loginButton = page.locator('.btn.btn-submit');
        this.verifyUser = page.locator('.header-btn .icon.iAccount + span');
        this.closeBanner = page.locator('.icon.iClose').locator('..');
    }

    async gotoWeb(baseURL: string) {
        await this.page.goto(baseURL);
    }

    async clickOpenLogin() {
        await this.openLogin.waitFor({ state: 'visible' });
        await this.openLogin.click();
    }

    async enterUsername(username: string) {
        await this.usernameInput.waitFor({ state: 'visible' });
        await this.usernameInput.fill(username);
    }

    async enterPassword(password: string) {
        await this.passwordInput.waitFor({ state: 'visible' });
        await this.passwordInput.fill(password);
    }

    async clickLoginButton() {
        await this.loginButton.click();
    }

    async clickCloseBanner() {
        await WaitUtils.delay(5000);
        if (await this.closeBanner.isVisible()) {
            await this.closeBanner.click();
        }
    }

    async login(username: string, password: string) {
        await this.clickOpenLogin();
        await this.enterUsername(username);
        await this.enterPassword(password);
        await this.clickLoginButton();
        await this.waitForPageLoad();
        await this.clickCloseBanner();
    }

    async enterUsernameAndPassword(username: string, password: string) {
        await this.enterUsername(username);
        await this.enterPassword(password);
        await this.clickLoginButton();
    }

    async loginSuccess() {
        await this.gotoWeb(TEST_CONFIG.WEB_LOGIN_URL);
        // Ensure the login form is open. If not, open it.
        const loginFormVisible = await this.usernameInput.isVisible().catch(() => false);
        if (!loginFormVisible) {
            await this.clickCloseBanner();
            await this.clickOpenLogin();
            await this.usernameInput.waitFor({ state: 'visible' });
        }
        await this.enterUsernameAndPassword(TEST_CONFIG.TEST_USER, TEST_CONFIG.TEST_PASS);
        await this.waitForPageLoad();
        await this.page.waitForTimeout(3000);
        await this.clickCloseBanner();
    }

    async verifyLoginSuccess(username: string) {
        await this.verifyUser.waitFor({ state: 'visible', timeout: 3000 });
        const text = await this.verifyUser.textContent();
        return text?.trim() === username;
    }

}

export default LoginPage;
