import { test, expect, Locator, Page } from '@playwright/test';
import Menu from '../../page/ui/Menu';
import LoginPage from '../../page/ui/LoginPage';
import { TEST_CONFIG } from '../utils/testConfig';
import { NewsPage, NEWS_ITEM_SELECTORS, EVENT_ITEM_SELECTORS } from '../../page/ui/News';

test.describe('News screens', () => {
    let menu: Menu;
    let page: Page;
    let loginPage: LoginPage;
    let newsPage: NewsPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        menu = new Menu(page);
        newsPage = new NewsPage(page);
        loginPage = new LoginPage(page);

        await loginPage.gotoWeb(TEST_CONFIG.WEB_LOGIN_URL);

        if (await page.locator('.adv-modal__body').isVisible()) {
            await page.click('.btn-icon.btn--cancel');
            await page.waitForTimeout(3000);
        }
        await menu.openMenuHeader('Tin tức');

    });

    test.afterAll(async () => {
        await page.close();
    });

    test('TC_001: Check news data', async () => {
        const newsHeader = page.getByText('Bảng tin', { exact: true });
        await expect(newsHeader).toBeVisible();

        const eventHeader = page.getByText('Sự kiện', { exact: true });
        await expect(eventHeader).toBeVisible();

        try {
            await NewsPage.expectNewsListHasData(page);
        } catch {
            let newsChecked = false;
            for (const container of NewsPage.getSectionContainers(newsHeader)) {
                try {
                    await NewsPage.findVisibleNonEmptyItem(container, NEWS_ITEM_SELECTORS, 'bản tin');
                    newsChecked = true;
                    break;
                } catch {
                    continue;
                }
            }
            if (!newsChecked) {
                await NewsPage.findVisibleNonEmptyItem(page, NEWS_ITEM_SELECTORS, 'bản tin');
            }
        }

        try {
            await NewsPage.expectEventListHasData(page);
        } catch {
            let eventChecked = false;
            for (const container of NewsPage.getSectionContainers(eventHeader)) {
                try {
                    await NewsPage.findVisibleNonEmptyItem(container, EVENT_ITEM_SELECTORS, 'sự kiện');
                    eventChecked = true;
                    break;
                } catch {
                    continue;
                }
            }
            if (!eventChecked) {
                await NewsPage.findVisibleNonEmptyItem(page, EVENT_ITEM_SELECTORS, 'sự kiện');
            }
        }
    });
});
