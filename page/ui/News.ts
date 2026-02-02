import { Page, Locator, expect } from "@playwright/test";
import { WaitUtils } from "../../helpers/uiUtils";
import BasePage from "./BasePage";

export const NEWS_ITEM_SELECTORS = [
    ".newsfeed-container .news",
    ".newsfeed-container .news__content",
    ".card-panel.tabs .news",
];

export const EVENT_ITEM_SELECTORS = [
    ".event-list .event-item",
    ".event-list .event__content",
    ".card-panel.tabs .event-item",
];

export class NewsPage extends BasePage {
    constructor(page: Page) {
        super(page);
    }

    static expectNewsListHasData = async (page: Page): Promise<void> => {
        const newsItems = page.locator(
            ".body-panel--center .newsfeed-container .news"
        );
        const hasNews = await WaitUtils.waitForCondition(
            async () => {
                return (await newsItems.count()) > 0;
            },
            { timeout: 15000, delay: 500 }
        );

        if (!hasNews) {
            throw new Error("Không thấy item Bảng tin");
        }

        const firstNews = newsItems.first();
        await expect(firstNews, "News item should be visible").toBeVisible();
        await expect(
            firstNews.locator(".content__desc"),
            "News title should not be empty"
        ).toHaveText(/\S/);
        await expect(
            firstNews.locator(".news__img"),
            "News image should exist"
        ).toBeVisible();
    };

    static expectEventListHasData = async (page: Page): Promise<void> => {
        const eventItems = page.locator(
            ".body-panel--right .event-list .event-item"
        );
        const hasEvents = await WaitUtils.waitForCondition(
            async () => {
                return (await eventItems.count()) > 0;
            },
            { timeout: 15000, delay: 500 }
        );

        if (!hasEvents) {
            throw new Error("Không thấy item Sự kiện");
        }

        const firstEvent = eventItems.first();
        await expect(firstEvent, "Event item should be visible").toBeVisible();
        await expect(
            firstEvent.locator(".event__content .symbol"),
            "Event symbol should not be empty"
        ).toHaveText(/\S/);
        await expect(
            firstEvent.locator(".event__content .content__desc"),
            "Event description should not be empty"
        ).toHaveText(/\S/);
    };

    static findVisibleNonEmptyItem = async (
        container: Locator | Page,
        selectors: string[],
        label: string
    ): Promise<void> => {
        let matchedLocator: Locator | null = null;

        const found = await WaitUtils.waitForCondition(
            async () => {
                for (const selector of selectors) {
                    const candidate = container
                        .locator(selector)
                        .filter({ hasText: /\S/ });
                    if (await candidate.count()) {
                        matchedLocator = candidate;
                        return true;
                    }
                }
                return false;
            },
            { timeout: 15000, delay: 500 }
        );

        if (!found || !matchedLocator) {
            throw new Error(`Không tìm thấy ${label} hiển thị trên màn Tin tức`);
        }

        const firstMatch = matchedLocator as Locator;
        await expect(
            firstMatch.first(),
            `${label} should be visible`
        ).toBeVisible();
    };

    static getSectionContainers = (sectionHeader: Locator): Locator[] => [
        sectionHeader.locator("xpath=ancestor::*[self::section or self::div][1]"),
        sectionHeader.locator("xpath=ancestor::*[self::section or self::div][2]"),
    ];
}
