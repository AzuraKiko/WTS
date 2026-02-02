import { test, expect, type Page, type Locator } from '@playwright/test';
import LoginPage from '../../page/ui/LoginPage';
import Menu from '../../page/ui/Menu';
import { TEST_CONFIG } from '../utils/testConfig';
import path from 'path';
import fs from 'fs/promises';


test.describe('PineB visual compare', () => {
    let page: Page;
    let loginPage: LoginPage;
    let menu: Menu;


    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        loginPage = new LoginPage(page);
        menu = new Menu(page);

        await loginPage.gotoWeb(TEST_CONFIG.WEB_LOGIN_URL);
        if (await page.locator('.adv-modal__body').isVisible()) {
            await page.click('.btn-icon.btn--cancel');
            await page.waitForTimeout(3000);
        }
        await menu.openMenuHeader('Trái phiếu');

    });

    test.afterAll(async () => {
        await page.close();
    });

    test('TC_001: PineB snapshot compare', async ({ }, testInfo) => {
        const bondListHeader = page.getByText('Danh sách trái phiếu', { exact: true });
        await expect(bondListHeader).toBeVisible();

        const policyHeader = page.getByText('Chính sách PineB', { exact: true });
        await expect(policyHeader).toBeVisible();

        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const appBody = page.locator('.app-body');
        const baselineSource = path.join(__dirname, '..', '..', 'image', 'pineb-baseline.png');
        const baselineSnapshot = testInfo.snapshotPath('pineb-baseline.png');
        try {
            await fs.access(baselineSnapshot);
        } catch {
            await fs.mkdir(path.dirname(baselineSnapshot), { recursive: true });
            await fs.copyFile(baselineSource, baselineSnapshot);
        }

        await expect(appBody).toHaveScreenshot('pineb-baseline.png', {
            animations: 'disabled',
            maxDiffPixels: 100,
            maxDiffPixelRatio: 0.01,
            threshold: 0.8,
        });
    });
});
