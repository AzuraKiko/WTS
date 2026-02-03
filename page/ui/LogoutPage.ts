import { Page, Locator } from '@playwright/test';
import LoginPage from './LoginPage';
import BasePage from './BasePage';

class LogoutPage extends BasePage {
    logoutButton: Locator;
    loginPage: LoginPage;

    constructor(page: Page, loginPage: LoginPage) {
        super(page);
        this.logoutButton = page.locator('.category:has(.icon.iLogout)');
        this.loginPage = loginPage;
    }

    async logout() {
        await this.safeClick(this.loginPage.verifyUser);
        await this.safeClick(this.logoutButton);
        await this.waitForPageLoad();
    }

    async verifyLogoutSuccess() {
        await this.logoutButton.isVisible();
        return true;
    }
}

export default LogoutPage;