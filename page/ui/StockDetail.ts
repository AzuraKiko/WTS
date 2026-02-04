import { Page, Locator, expect } from "@playwright/test";
import BasePage from "./BasePage";
import { WaitUtils } from "../../helpers/uiUtils";
import { NumberValidator } from "../../helpers/validationUtils";

class StockDetailPage extends BasePage {
    modal: Locator;
    header: Locator;
    headerTitle: Locator;
    oddLotSwitch: Locator;
    closeButton: Locator;

    leftPanel: Locator;
    symbolSearchInput: Locator;
    symbolCode: Locator;
    symbolExchange: Locator;
    symbolName: Locator;
    symbolPrice: Locator;
    symbolChange: Locator;
    symbolChangePercent: Locator;
    floorPrice: Locator;
    referencePrice: Locator;
    ceilingPrice: Locator;

    matchTab: Locator;
    analysisTab: Locator;
    matchTableHeaders: Locator;
    matchTableRows: Locator;
    matchTableScrollContainer: Locator;
    priceAnalysisTable: Locator;
    priceAnalysisTableRows: Locator;

    centerPanel: Locator;
    chartTab: Locator;
    priceHistoryTab: Locator;
    financeTab: Locator;
    chartFrame: Locator;

    priceHistoryPanel: Locator;
    priceHistoryChart: Locator;
    priceHistoryRangeButtons: Locator;
    priceHistoryStatsButtons: Locator;
    priceTableHeaders: Locator;
    priceHistoryTableRows: Locator;
    financePanel: Locator;
    financeTabs: Locator;
    financePeriodButtons: Locator;
    financeTableRows: Locator;

    rightPanel: Locator;
    profileTab: Locator;
    newsTab: Locator;
    eventTab: Locator;
    newsItems: Locator;
    eventItems: Locator;

    profileTabBody: Locator;
    profileTitleName: Locator;
    profileAddress: Locator;
    profilePhone: Locator;
    profileMail: Locator;
    profileIntro: Locator;
    profileBadges: Locator;
    profileListings: Locator;
    profileChart: Locator;
    cwProfile: Locator;
    cwProfileChart: Locator;
    cwProfileItems: Locator;
    cwProfileBaseSymbol: Locator;

    priceListPanel: Locator;
    priceListSteps: Locator;
    chartListPanel: Locator;

    constructor(page: Page) {
        super(page);
        this.modal = page.locator(".stock-detail-modal");
        this.header = this.modal.locator(".stock-detail-modal-header");
        this.headerTitle = this.header.getByText("Chi tiết mã", { exact: true });
        this.oddLotSwitch = this.header.locator('input[type="checkbox"][role="switch"]');
        this.closeButton = this.header.locator(".btn-icon .iClose");

        this.leftPanel = this.modal.locator(".column-panel.left-panel");
        this.symbolSearchInput = this.leftPanel.locator(".card-panel-header__input");
        this.symbolCode = this.leftPanel.locator(".symbol-brand__name");
        this.symbolExchange = this.leftPanel.locator(".symbol-brand__exchange");
        this.symbolName = this.leftPanel.locator(".symbol-name");
        this.symbolPrice = this.leftPanel.locator(".symbol-price--big");
        this.symbolChange = this.leftPanel.locator(".symbol-price > span:nth-child(2)");
        this.symbolChangePercent = this.leftPanel.locator(".symbol-price > span:nth-child(3)");
        this.floorPrice = this.leftPanel.locator(".symbol-open-price .f");
        this.referencePrice = this.leftPanel.locator(".symbol-open-price .r");
        this.ceilingPrice = this.leftPanel.locator(".symbol-open-price .c");

        this.matchTab = this.leftPanel
            .locator(".card-panel.price-tabs .card-panel-header__title")
            .filter({ hasText: "Lệnh khớp" })
            .first();
        this.analysisTab = this.leftPanel
            .locator(".card-panel.price-tabs .card-panel-header__title")
            .filter({ hasText: "Phân tích giá" })
            .first();

        this.matchTableHeaders = this.leftPanel.locator(".match-analystic .grid-table thead tr th");
        this.matchTableRows = this.leftPanel.locator(".match-analystic .grid-table-header");
        this.matchTableScrollContainer = this.leftPanel.locator(".match-analystic .thumb-vertical");
        this.priceAnalysisTable = this.leftPanel.locator(".price-analystic");
        this.priceAnalysisTableRows = this.leftPanel.locator(".price-analystic .pa-row.as-grid");

        this.centerPanel = this.modal.locator(".column-panel.center-panel");
        this.chartTab = this.centerPanel
            .locator(".card-panel.center-tabs .card-panel-header__title")
            .filter({ hasText: "Biểu đồ" })
            .first();
        this.priceHistoryTab = this.centerPanel
            .locator(".card-panel.center-tabs .card-panel-header__title")
            .filter({ hasText: "Lịch sử giá" })
            .first();
        this.financeTab = this.centerPanel
            .locator(".card-panel.center-tabs .card-panel-header__title")
            .filter({ hasText: "Tài chính" })
            .first();
        this.chartFrame = this.centerPanel.locator("iframe.chart");

        this.priceHistoryPanel = this.centerPanel.locator(".trading-data");
        this.priceHistoryChart = this.priceHistoryPanel.locator(".highcharts-root");
        this.priceHistoryRangeButtons = this.priceHistoryPanel.locator(".btn-group").first().locator("button");
        this.priceHistoryStatsButtons = this.priceHistoryPanel.locator(".btn-group").nth(1).locator("button");
        this.priceTableHeaders = this.priceHistoryPanel.locator("table.table-bordered thead tr");
        this.priceHistoryTableRows = this.priceHistoryPanel.locator("table tbody tr");

        this.financePanel = this.centerPanel.locator(".finance");
        this.financeTabs = this.financePanel.locator(".finance-header .tabs .tab");
        this.financePeriodButtons = this.financePanel.locator(".finance-header .btn-group button");
        this.financeTableRows = this.financePanel.locator("table tbody tr");


        this.rightPanel = this.modal.locator(".column-panel.right-panel");
        this.profileTab = this.rightPanel
            .locator(".card-panel.tabs .card-panel-header__title")
            .filter({ hasText: "Hồ sơ" })
            .first();
        this.newsTab = this.rightPanel
            .locator(".card-panel.tabs .card-panel-header__title")
            .filter({ hasText: "Tin tức" })
            .first();
        this.eventTab = this.rightPanel
            .locator(".card-panel.tabs .card-panel-header__title")
            .filter({ hasText: "Sự kiện" })
            .first();
        this.newsItems = this.rightPanel.locator(".news-tab .news");
        this.eventItems = this.rightPanel.locator(".event-tab .event");

        this.profileTabBody = this.rightPanel.locator(".profile-tab");
        this.profileTitleName = this.profileTabBody.locator(".profile-title__name");
        this.profileAddress = this.profileTabBody.locator(".profile-desc__address span").nth(1);
        this.profilePhone = this.profileTabBody.locator(".profile-desc__phone span").nth(1);
        this.profileMail = this.profileTabBody.locator(".profile-desc__mail span").nth(1);
        this.profileIntro = this.profileTabBody.locator(".profile-intro");
        this.profileBadges = this.profileTabBody.locator(".mbadge");
        this.profileListings = this.profileTabBody.locator(".listing");
        this.profileChart = this.profileTabBody.locator(".highcharts-root");

        this.cwProfile = this.profileTabBody.locator(".cw-profile");
        this.cwProfileChart = this.cwProfile.locator(".highcharts-root");
        this.cwProfileItems = this.cwProfile.locator(".cw-profile__item");
        this.cwProfileBaseSymbol = this.cwProfile.locator(".cw-profile__item .d");

        this.priceListPanel = this.rightPanel.locator(".card-panel.price-list .price-list");
        this.priceListSteps = this.priceListPanel.locator(".price-list-step");
        this.chartListPanel = this.rightPanel.locator(".price-list-total");
    }

    private async clickTabSafely(tab: Locator, label: string): Promise<void> {
        await this.ensureVisible(tab);
        const handle = await tab.elementHandle();
        if (!handle) {
            throw new Error(`Tab not found: ${label}`);
        }

        try {
            await tab.click({ timeout: 10000 });
        } catch {
            await tab.click({ force: true });
        }

        try {
            await this.page.waitForFunction(
                (el) =>
                    el.classList.contains('active') ||
                    el.getAttribute('aria-selected') === 'true',
                handle,
                { timeout: 5000 }
            );
            return;
        } catch {
            await tab.evaluate((el) => (el as HTMLElement).click());
        }
    }

    async openFromPriceBoardFirstRow(): Promise<{ stockCode: string }> {
        const firstRow = this.page.locator("table.price-table tbody tr").first();
        await firstRow.waitFor({ state: "visible", timeout: 15000 });

        const stockCode = (await firstRow.locator("td").first().innerText()).trim();

        await this.safeClick(firstRow.locator("td a").first());
        let opened = await WaitUtils.waitForCondition(
            async () => await this.modal.isVisible(),
            { timeout: 10000, delay: 500, maxAttempts: 8 }
        );

        if (!opened) {
            throw new Error("Stock detail modal did not open");
        }

        await this.modal.waitFor({ state: "visible", timeout: 10000 });
        return { stockCode };
    }

    async expectModalVisible(): Promise<void> {
        await expect(this.modal, "Stock detail modal should be visible").toBeVisible();
    }

    async expectHeaderVisible(): Promise<void> {
        await expect(this.header, "Stock detail header should be visible").toBeVisible();
        await expect(this.headerTitle, "Stock detail title should be visible").toBeVisible();
        await expect(this.oddLotSwitch, "Odd lot switch should be visible").toBeVisible();
        await expect(this.closeButton, "Close button should be visible").toBeVisible();
    }

    async clickOddLotSwitch(): Promise<void> {
        await this.safeClick(this.oddLotSwitch);
    }

    async searchSymbol(stockCode: string): Promise<void> {
        await this.symbolSearchInput.fill(stockCode);
        await this.symbolSearchInput.press("Enter");
    }

    async expectSymbolInfoVisible(): Promise<void> {
        await expect(this.symbolSearchInput, "Search input should be visible").toBeVisible();
        await expect(this.symbolCode, "Symbol code should be visible").toHaveText(/\S/);
        await expect(this.symbolExchange, "Symbol exchange should be visible").toHaveText(/\S/);
        await expect(this.symbolName, "Symbol name should be visible").toHaveText(/\S/);
        await expect(this.symbolPrice, "Symbol price should be visible").toHaveText(/\S/);
        await expect(this.symbolChange, "Symbol change should be visible").toHaveText(/\S/);
        await expect(this.symbolChangePercent, "Symbol change percent should be visible").toHaveText(/\S/);
        await expect(this.floorPrice, "Floor price should be visible").toHaveText(/\S/);
        await expect(this.referencePrice, "Reference price should be visible").toHaveText(/\S/);
        await expect(this.ceilingPrice, "Ceiling price should be visible").toHaveText(/\S/);
    }

    async getSymbolInfo(): Promise<{
        symbolCode: string;
        symbolExchange: string;
        symbolName: string;
        symbolPrice: number;
        symbolChange: number;
        symbolChangePercent: number;
        floorPrice: number;
        referencePrice: number;
        ceilingPrice: number;
    }> {
        return {
            symbolCode: (await this.symbolCode.innerText()).trim(),
            symbolExchange: (await this.symbolExchange.innerText()).trim(),
            symbolName: (await this.symbolName.innerText()).trim(),
            symbolPrice: NumberValidator.parseNumber(await this.symbolPrice.innerText()),
            symbolChange: NumberValidator.parseNumber(await this.symbolChange.innerText()),
            symbolChangePercent: NumberValidator.parseNumber(await this.symbolChangePercent.innerText()),
            floorPrice: NumberValidator.parseNumber(await this.floorPrice.innerText()),
            referencePrice: NumberValidator.parseNumber(await this.referencePrice.innerText()),
            ceilingPrice: NumberValidator.parseNumber(await this.ceilingPrice.innerText()),
        };
    }

    async expectProgressBarVisible(): Promise<void> {
        await expect(this.modal.locator(".progress-bar"), "Progress bar should be visible").toBeVisible();
    }


    async expectSymbolMatched(stockCode: string): Promise<void> {
        await expect(this.symbolCode, "Symbol code should match stock code").toHaveText(stockCode);
    }


    async expectMatchListHasData(): Promise<void> {
        await this.clickTabSafely(this.matchTab, "Lệnh khớp");
        const hasRows = await WaitUtils.waitForCondition(
            async () => (await this.matchTableRows.count()) > 0,
            { timeout: 15000, delay: 500, maxAttempts: 10 }
        );

        if (!hasRows) {
            throw new Error("No matched orders found in Stock Detail");
        }

        await expect(this.matchTableRows.first(), "Match row should be visible").toBeVisible();
    }

    async expectPriceAnalysisListHasData(): Promise<void> {
        await this.clickTabSafely(this.analysisTab, "Phân tích giá");
        const hasRows = await WaitUtils.waitForCondition(
            async () => (await this.priceAnalysisTableRows.count()) > 0,
            { timeout: 15000, delay: 500, maxAttempts: 10 }
        );

        if (!hasRows) {
            throw new Error("No price analysis found in Stock Detail");
        }

        await expect(this.priceAnalysisTableRows.first(), "Price analysis row should be visible").toBeVisible();
    }

    async expectChartVisible(): Promise<void> {
        await this.clickTabSafely(this.chartTab, "Biểu đồ");
        await expect(this.chartFrame, "Chart iframe should be visible").toBeVisible();
        await expect(this.chartFrame, "Chart iframe should have src").toHaveAttribute(
            "src",
            /charts\.pinetree\.vn/
        );
    }

    async expectPriceHistoryHasData(): Promise<void> {
        await this.clickTabSafely(this.priceHistoryTab, "Lịch sử giá");
        await expect(this.priceHistoryPanel, "Price history panel should be visible").toBeVisible();
        await expect(this.priceHistoryChart, "Price history chart should be visible").toBeVisible();
        await expect(
            this.priceHistoryRangeButtons.first(),
            "Price history range buttons should be visible"
        ).toBeVisible();
        await expect(
            this.priceHistoryStatsButtons.first(),
            "Price history stats buttons should be visible"
        ).toBeVisible();
        const hasRows = await WaitUtils.waitForCondition(
            async () => (await this.priceHistoryTableRows.count()) > 0,
            { timeout: 15000, delay: 500, maxAttempts: 10 }
        );
        if (!hasRows) {
            throw new Error("No price history data found");
        }
        await expect(this.priceHistoryTableRows.first(), "Price history row should be visible").toBeVisible();
    }

    async expectFinanceHasData(): Promise<void> {
        await this.safeClick(this.financeTab);
        await expect(this.financePanel, "Finance panel should be visible").toBeVisible();
        await expect(this.financeTabs.first(), "Finance tabs should be visible").toBeVisible();
        await expect(
            this.financePeriodButtons.first(),
            "Finance period buttons should be visible"
        ).toBeVisible();

        const tabCount = await this.financeTabs.count();
        const periodCount = await this.financePeriodButtons.count();

        for (let tabIndex = 0; tabIndex < tabCount; tabIndex++) {
            const tab = this.financeTabs.nth(tabIndex);
            await this.safeClick(tab);

            for (let periodIndex = 0; periodIndex < periodCount; periodIndex++) {
                const periodButton = this.financePeriodButtons.nth(periodIndex);
                await this.safeClick(periodButton);

                const hasRows = await WaitUtils.waitForCondition(
                    async () => (await this.financeTableRows.count()) > 0,
                    { timeout: 15000, delay: 500, maxAttempts: 10 }
                );
                if (!hasRows) {
                    const tabLabel = (await tab.innerText()).trim();
                    const periodLabel = (await periodButton.innerText()).trim();
                    throw new Error(`No finance data found for "${tabLabel}" - "${periodLabel}"`);
                }
                await expect(
                    this.financeTableRows.first(),
                    "Finance row should be visible"
                ).toBeVisible();
            }
        }
    }

    async expectNewsListHasData(): Promise<void> {
        await this.safeClick(this.newsTab);
        const hasNews = await WaitUtils.waitForCondition(
            async () => (await this.newsItems.count()) > 0,
            { timeout: 15000, delay: 500, maxAttempts: 10 }
        );

        if (!hasNews) {
            throw new Error("No news found in Stock Detail");
        }

        const firstNews = this.newsItems.first();
        await expect(firstNews, "News item should be visible").toBeVisible();
        await expect(
            firstNews.locator(".news__title"),
            "News title should not be empty"
        ).toHaveText(/\S/);
    }

    async expectEventListHasData(): Promise<void> {
        await this.safeClick(this.eventTab);
        const hasEvents = await WaitUtils.waitForCondition(
            async () => (await this.eventItems.count()) > 0,
            { timeout: 15000, delay: 500, maxAttempts: 10 }
        );

        if (!hasEvents) {
            throw new Error("No events found in Stock Detail");
        }
        await expect(this.eventItems.first(), "Event item should be visible").toBeVisible();
        const firstEvent = this.eventItems.first();
        await expect(firstEvent, "Event item should be visible").toBeVisible();
        await expect(
            firstEvent.locator(".event__title"),
            "Event title should not be empty"
        ).toHaveText(/\S/);
    };

    async expectStockProfileHasData(): Promise<void> {
        await this.safeClick(this.profileTab);
        await expect(this.profileTabBody, "Profile tab should be visible").toBeVisible();
        await expect(this.profileTitleName, "Profile name should not be empty").toHaveText(/\S/);
        await expect(this.profileAddress, "Profile address should not be empty").toHaveText(/\S/);
        await expect(this.profilePhone, "Profile phone should not be empty").toHaveText(/\S/);
        await expect(this.profileMail, "Profile email should not be empty").toHaveText(/\S/);
        await expect(this.profileIntro, "Profile intro should be visible").toBeVisible();
        await expect(this.profileBadges.first(), "Profile badges should be visible").toBeVisible();
        await expect(this.profileListings.first(), "Profile listings should be visible").toBeVisible();
        await expect(this.profileChart, "Profile chart should be visible").toBeVisible();
    }

    async expectCWProfileHasData(): Promise<void> {
        await this.safeClick(this.profileTab);
        await expect(this.profileTabBody, "Profile tab should be visible").toBeVisible();
        await expect(this.cwProfile, "CW profile should be visible").toBeVisible();
        await expect(this.cwProfileChart, "CW profile chart should be visible").toBeVisible();
        const hasItems = await WaitUtils.waitForCondition(
            async () => (await this.cwProfileItems.count()) > 0,
            { timeout: 10000, delay: 500, maxAttempts: 8 }
        );
        if (!hasItems) {
            throw new Error("CW profile items not found");
        }
        await expect(
            this.cwProfileItems.first(),
            "CW profile item should be visible"
        ).toBeVisible();
    }

    async expectPriceListVisible(): Promise<void> {
        await expect(this.priceListPanel, "Price list panel should be visible").toBeVisible();
        const hasSteps = await WaitUtils.waitForCondition(
            async () => (await this.priceListSteps.count()) > 0,
            { timeout: 10000, delay: 500, maxAttempts: 8 }
        );

        if (!hasSteps) {
            throw new Error("Price list data not found in Stock Detail");
        }
        await expect(this.priceListSteps.first(), "Price list step should be visible").toBeVisible();
        await expect(this.chartListPanel, "Chart list panel should be visible").toBeVisible();
    }

    async expectPriceListCWVisible(): Promise<void> {
        const priceListCWPanel = this.rightPanel.locator(".card-panel.price-list").first();
        const underlyingPriceListPanel = this.rightPanel.locator(".card-panel.price-list").last();

        await expect(priceListCWPanel, "Price list CW panel should be visible").toBeVisible();
        await expect(underlyingPriceListPanel, "Underlying price list CW panel should be visible").toBeVisible();
        const hasSteps = await WaitUtils.waitForCondition(
            async () => (await this.priceListSteps.count()) > 0,
            { timeout: 10000, delay: 500, maxAttempts: 8 }
        );
        if (!hasSteps) {
            throw new Error("Price list data not found in Stock Detail");
        }
        await expect(this.priceListSteps.first(), "Price list step should be visible").toBeVisible();
        await expect(this.chartListPanel.first(), "Chart list CW panel should be visible").toBeVisible();
        await expect(this.chartListPanel.last(), "Underlying chart list panel should be visible").toBeVisible();
    }

    async close(): Promise<void> {
        await this.safeClick(this.closeButton);
        await this.modal.waitFor({ state: "hidden", timeout: 10000 });
    }
}

export default StockDetailPage;
