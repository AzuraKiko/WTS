import { Page, Locator } from '@playwright/test';
import BasePage from './BasePage';
import { TEST_CONFIG, ERROR_MESSAGES } from '../../tests/utils/testConfig';

class LoginPage extends BasePage {
    openLogin: Locator;
    usernameInput: Locator;
    passwordInput: Locator;
    loginButton: Locator;
    forgotPasswordLink: Locator;
    openAccountLink: Locator;
    verifyUser: Locator;
    invalidLogin: Locator;
    usernameError: Locator;
    passwordError: Locator;
    closeBanner: Locator;

    constructor(page: Page) {
        super(page);
        this.openLogin = page.locator('.header-btn.btn-login');
        this.usernameInput = page.locator('[name="username"]');
        this.passwordInput = page.locator('[name="password"]');
        this.loginButton = page.locator('.btn.btn-submit');
        this.forgotPasswordLink = page.locator('.btn.btn-forgot-password');
        this.openAccountLink = page.locator('.btn.btn--primary2.mt-3');
        this.verifyUser = page.locator('.header-btn .icon.iAccount + span');
        this.invalidLogin = page.locator('.d.mt-2 ul li');
        this.usernameError = page.locator('.order-text:has(input[name="username"]) + .d.mt-2');
        this.passwordError = page.locator('.order-text:has(input[name="password"]) + .d.mt-2');
        this.closeBanner = page.locator('.btn-icon.btn--light > span');
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

    async verifyValidateUsernameError(expectedError: string = ERROR_MESSAGES.EMPTY_FIELD) {
        await this.usernameError.waitFor({ state: 'visible', timeout: 3000 });
        const errorText = await this.usernameError.textContent();
        return errorText?.trim() === expectedError;
    }

    async verifyValidatePasswordError(expectedError: string = ERROR_MESSAGES.EMPTY_FIELD) {
        await this.passwordError.waitFor({ state: 'visible', timeout: 3000 });
        const errorText = await this.passwordError.textContent();
        return errorText?.trim() === expectedError;
    }

    async loginWithInvalidUsername(expectedError: string = ERROR_MESSAGES.INVALID_CUSTOMER) {
        await this.invalidLogin.waitFor({ state: 'visible', timeout: 3000 });
        const errorText = await this.invalidLogin.textContent();
        return errorText?.trim() === expectedError;
    }

    async verifyWrongPasswordAttempt(attemptNumber: number) {
        const errorMessages = {
            1: ERROR_MESSAGES.WRONG_PASSWORD_1,
            2: ERROR_MESSAGES.WRONG_PASSWORD_2,
            3: ERROR_MESSAGES.WRONG_PASSWORD_3,
            4: ERROR_MESSAGES.WRONG_PASSWORD_4,
            5: ERROR_MESSAGES.ACCOUNT_LOCKED
        };

        const expectedError = errorMessages[attemptNumber as keyof typeof errorMessages];
        if (!expectedError) {
            throw new Error(`Invalid attempt number: ${attemptNumber}. Must be between 1-5`);
        }

        await this.invalidLogin.waitFor({ state: 'visible', timeout: 3000 });
        const errorText = await this.invalidLogin.textContent();
        return errorText?.trim() === expectedError;
    }

    // Convenient methods for specific wrong password attempts
    async verifyWrongPassword1() {
        return await this.verifyWrongPasswordAttempt(1);
    }

    async verifyWrongPassword2() {
        return await this.verifyWrongPasswordAttempt(2);
    }

    async verifyWrongPassword3() {
        return await this.verifyWrongPasswordAttempt(3);
    }

    async verifyWrongPassword4() {
        return await this.verifyWrongPasswordAttempt(4);
    }

    async verifyAccountLocked() {
        return await this.verifyWrongPasswordAttempt(5);
    }

    async forgotPassword() {
        await this.forgotPasswordLink.click();
    }

    async openAccount() {
        await this.openAccountLink.click();
    }
}

export default LoginPage;
