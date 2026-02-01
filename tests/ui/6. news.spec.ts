import { test, expect, Locator, Page } from '@playwright/test';
import LoginPage from '../../page/ui/LoginPage';
import Menu from '../../page/ui/Menu';
import { WaitUtils } from '../../helpers/uiUtils';
import { TEST_CONFIG } from '../utils/testConfig';

const NEWS_ITEM_SELECTORS = [
    '.newsfeed-container .news',
    '.newsfeed-container .news__content',
    '.card-panel.tabs .news',
];

const EVENT_ITEM_SELECTORS = [
    '.event-list .event-item',
    '.event-list .event__content',
    '.card-panel.tabs .event-item',
];

const expectNewsListHasData = async (page: Page): Promise<void> => {
    const newsItems = page.locator('.body-panel--center .newsfeed-container .news');
    const hasNews = await WaitUtils.waitForCondition(async () => {
        return (await newsItems.count()) > 0;
    }, { timeout: 15000, delay: 500 });

    if (!hasNews) {
        throw new Error('Không thấy item Bảng tin');
    }

    const firstNews = newsItems.first();
    await expect(firstNews, 'News item should be visible').toBeVisible();
    await expect(firstNews.locator('.content__desc'), 'News title should not be empty')
        .toHaveText(/\S/);
    await expect(firstNews.locator('.news__img'), 'News image should exist').toBeVisible();
};

const expectEventListHasData = async (page: Page): Promise<void> => {
    const eventItems = page.locator('.body-panel--right .event-list .event-item');
    const hasEvents = await WaitUtils.waitForCondition(async () => {
        return (await eventItems.count()) > 0;
    }, { timeout: 15000, delay: 500 });

    if (!hasEvents) {
        throw new Error('Không thấy item Sự kiện');
    }

    const firstEvent = eventItems.first();
    await expect(firstEvent, 'Event item should be visible').toBeVisible();
    await expect(firstEvent.locator('.event__content .symbol'), 'Event symbol should not be empty')
        .toHaveText(/\S/);
    await expect(firstEvent.locator('.event__content .content__desc'), 'Event description should not be empty')
        .toHaveText(/\S/);
};

const findVisibleNonEmptyItem = async (
    container: Locator | Page,
    selectors: string[],
    label: string
): Promise<void> => {
    let matchedLocator: Locator | null = null;

    const found = await WaitUtils.waitForCondition(async () => {
        for (const selector of selectors) {
            const candidate = container.locator(selector).filter({ hasText: /\S/ });
            if (await candidate.count()) {
                matchedLocator = candidate;
                return true;
            }
        }
        return false;
    }, { timeout: 15000, delay: 500 });

    if (!found || !matchedLocator) {
        throw new Error(`Không tìm thấy ${label} hiển thị trên màn Tin tức`);
    }

    const firstMatch = matchedLocator as Locator;
    await expect(firstMatch.first(), `${label} should be visible`).toBeVisible();
};

const getSectionContainers = (sectionHeader: Locator): Locator[] => ([
    sectionHeader.locator('xpath=ancestor::*[self::section or self::div][1]'),
    sectionHeader.locator('xpath=ancestor::*[self::section or self::div][2]'),
]);

test.describe('Others screens', () => {
    let loginPage: LoginPage;
    let menu: Menu;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        menu = new Menu(page);

        await loginPage.loginSuccess();
        expect(await loginPage.verifyLoginSuccess(TEST_CONFIG.TEST_USER)).toBeTruthy();
    });

    test('Quick check Tin tức has data', async ({ page }) => {
        await menu.openMenuHeader('Tin tức');

        const newsHeader = page.getByText('Bảng tin', { exact: true });
        await expect(newsHeader).toBeVisible();

        const eventHeader = page.getByText('Sự kiện', { exact: true });
        await expect(eventHeader).toBeVisible();

        try {
            await expectNewsListHasData(page);
        } catch {
            let newsChecked = false;
            for (const container of getSectionContainers(newsHeader)) {
                try {
                    await findVisibleNonEmptyItem(container, NEWS_ITEM_SELECTORS, 'bản tin');
                    newsChecked = true;
                    break;
                } catch {
                    continue;
                }
            }
            if (!newsChecked) {
                await findVisibleNonEmptyItem(page, NEWS_ITEM_SELECTORS, 'bản tin');
            }
        }

        try {
            await expectEventListHasData(page);
        } catch {
            let eventChecked = false;
            for (const container of getSectionContainers(eventHeader)) {
                try {
                    await findVisibleNonEmptyItem(container, EVENT_ITEM_SELECTORS, 'sự kiện');
                    eventChecked = true;
                    break;
                } catch {
                    continue;
                }
            }
            if (!eventChecked) {
                await findVisibleNonEmptyItem(page, EVENT_ITEM_SELECTORS, 'sự kiện');
            }
        }
    });
});
