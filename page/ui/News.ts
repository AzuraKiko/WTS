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

export const LEFT_PANEL_SELECTORS = [
    ".body-panel--left .card-index-info__body .card-index-info-item",
    ".body-panel--left .video-list .video-container",
    ".body-panel--left .video__title",
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
            throw new Error("No data found for Newsfeed");
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
            throw new Error("No data found for Events");
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

    static expectLeftPanelHasData = async (page: Page): Promise<void> => {
        const indexItems = page.locator(
            ".body-panel--left .card-index-info__body .card-index-info-item"
        );
        const videoItems = page.locator(
            ".body-panel--left .video-list .video-container"
        );

        const briefTab = page.locator(
            ".body-panel--left .left-bottom .card-panel-header__left .card-panel-header__title:has-text('Bản tin thị trường')"
        );

        const hasIndex = await WaitUtils.waitForCondition(
            async () => {
                return (await indexItems.count()) > 0;
            },
            { timeout: 15000, delay: 500 }
        );

        if (!hasIndex) {
            throw new Error("No data found for Index");
        }

        const hasVideos = await WaitUtils.waitForCondition(
            async () => {
                return (await videoItems.count()) > 0;
            },
            { timeout: 15000, delay: 500 }
        );

        if (!hasVideos) {
            throw new Error("No data found for Videos");
        }


        const firstIndex = indexItems.first();
        await expect(
            firstIndex,
            "Left index item should be visible"
        ).toBeVisible();

        await expect(
            firstIndex.locator(".market-panel-header__name"),
            "Left index name should not be empty"
        ).toHaveText(/\S/);

        await expect(
            firstIndex.locator(".market-panel-header__index"),
            "Left index value should not be empty"
        ).toHaveText(/\S/);

        const firstVideo = videoItems.first();
        await expect(
            firstVideo,
            "Left video item should be visible"
        ).toBeVisible();

        await expect(
            firstVideo.locator(".video__title"),
            "Left video title should not be empty"
        ).toHaveText(/\S/);

        await expect(briefTab, "Brief tab should be visible").toBeVisible();
        await briefTab.click();
        const briefItems = page.locator(".body-panel--left .brief-list .brief-container");


        const hasBrief = await WaitUtils.waitForCondition(
            async () => {
                return (await briefItems.count()) > 0;
            },
            { timeout: 15000, delay: 500 }
        );

        if (!hasBrief) {
            throw new Error("No data found for Brief");
        }

        const firstBrief = briefItems.first();
        await expect(
            firstBrief,
            "Left brief item should be visible"
        ).toBeVisible();

        await expect(
            firstBrief.locator(".brief__title"),
            "Left brief title should not be empty"
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
            throw new Error(`No data found for ${label}`);
        }

        const firstMatch = matchedLocator as Locator;
        await expect(
            firstMatch.first(),
            `${label} should be visible`
        ).toBeVisible();
    };
}
