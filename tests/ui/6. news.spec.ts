import { test, expect, Page } from '@playwright/test';
import Menu from '../../page/ui/Menu';
import LoginPage from '../../page/ui/LoginPage';
import { TEST_CONFIG } from '../utils/testConfig';
import { InteractionUtils } from '../../helpers/uiUtils';
import {
    NewsPage,
    NEWS_ITEM_SELECTORS,
    EVENT_ITEM_SELECTORS,
    LEFT_PANEL_SELECTORS,
} from '../../page/ui/News';

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
            const cancelButton = page.locator('.btn-icon.btn--cancel');
            await InteractionUtils.ensureVisible(cancelButton);
            await cancelButton.click();
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
            await NewsPage.expectLeftPanelHasData(page);
        } catch {
            let leftChecked = false;
            const container = page.locator('.body-panel--left');

            try {
                await NewsPage.findVisibleNonEmptyItem(
                    container,
                    LEFT_PANEL_SELECTORS,
                    'Left panel'
                );
                leftChecked = true;
            } catch {
                throw new Error('No data found for Left panel');
            }

            if (!leftChecked) {
                await NewsPage.findVisibleNonEmptyItem(
                    page,
                    LEFT_PANEL_SELECTORS,
                    'Left panel'
                );
            }
        }

        try {
            await NewsPage.expectNewsListHasData(page);
        } catch {
            let newsChecked = false;
            const container = page.locator('.body-panel--center');

            try {
                await NewsPage.findVisibleNonEmptyItem(container, NEWS_ITEM_SELECTORS, 'bản tin');
                newsChecked = true;
            } catch {
                throw new Error('No data found for Newsfeed');
            }

            if (!newsChecked) {
                await NewsPage.findVisibleNonEmptyItem(page, NEWS_ITEM_SELECTORS, 'bản tin');
            }

            try {
                await NewsPage.expectEventListHasData(page);
            } catch {
                let eventChecked = false;
                const container = page.locator('.body-panel--right');
                try {
                    await NewsPage.findVisibleNonEmptyItem(container, EVENT_ITEM_SELECTORS, 'sự kiện');
                    eventChecked = true;
                } catch {
                    throw new Error('No data found for Events');
                }
                if (!eventChecked) {
                    await NewsPage.findVisibleNonEmptyItem(page, EVENT_ITEM_SELECTORS, 'sự kiện');

                }
            }
        }
    });
});