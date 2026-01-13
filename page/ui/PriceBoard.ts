import { Page, Locator, expect } from "@playwright/test";
import { TEST_CONFIG } from "../../tests/utils/testConfig";
import { WaitUtils } from "../../helpers/uiUtils";

// Interface cho cấu trúc của một index panel
interface IndexPanelLocators {
    panel: Locator;
    indexValue: Locator;
    indexChange: Locator;
    changePercent: Locator;
    volValue: Locator;
    volUnit: Locator;
    valueValue: Locator;
    valueUnit: Locator;
    session: Locator;
    chartContainer: Locator;
    openTradingView: Locator;
}

// Interface cho dữ liệu của một index panel
interface IndexPanelData {
    indexValue: string;
    indexChange: string;
    changePercent: string;
    volValue: string;
    valueValue: string;
}

interface OverviewData {
    totalVolume: string;
    totalValue: string;
    roomNN: string;
}

interface GlobalData {
    indexValue: string;
    indexChange: string;
    indexChangePercent: string;
}

export class PriceBoardPage {
    readonly page: Page;
    readonly WaitUtils: WaitUtils;
    // Locators mini chart
    readonly rightSlider: Locator;
    readonly leftSlider: Locator;
    readonly iconResize: Locator;
    readonly iconExpand: Locator;
    readonly overviewCard: Locator;
    readonly globalCard: Locator;
    readonly commodityCard: Locator;
    readonly globalRightSlider: Locator;
    readonly commodityRightSlider: Locator;
    readonly globalLeftSlider: Locator;
    readonly commodityLeftSlider: Locator;


    // Locators cho các Tab Sàn Giao dịch
    readonly hsxTab: Locator;
    readonly hnxTab: Locator;
    readonly upcomTab: Locator;
    readonly cwTab: Locator;
    readonly oddLotTab: Locator;
    readonly etfTab: Locator;
    readonly majorTab: Locator;

    // Locator chung cho toàn bộ bảng dữ liệu
    readonly stockTable: Locator;

    // Locator cho tiêu đề cột T.C để kiểm tra Sorting
    readonly refColumnHeader: Locator;

    constructor(page: Page) {
        this.page = page;
        this.WaitUtils = new WaitUtils();

        // Locators mini chart
        this.rightSlider = page.locator('.slider-right');
        this.leftSlider = page.locator('.slider-left');
        this.iconResize = page.locator('.icon.iResize');
        this.iconExpand = page.locator('.icon.iExpand');
        this.overviewCard = page.locator(
            '.market-panel.card-index-info:has-text("Toàn thị trường")'
        );
        this.globalCard = page.locator(
            '.market-panel.card-index-info:has-text("TT Quốc tế")'
        );
        this.commodityCard = page.locator(
            '.market-panel.card-index-info:has-text("Hàng hóa")'
        );

        this.globalRightSlider = this.globalCard.locator('.icon.iNext');
        this.commodityRightSlider = this.commodityCard.locator('.icon.iNext');
        this.globalLeftSlider = this.globalCard.locator('.icon.iPrevious');
        this.commodityLeftSlider = this.commodityCard.locator('.icon.iPrevious');

        // Locators cho Tabs
        this.hnxTab = page.locator('button:has-text("HNX")');
        this.upcomTab = page.locator('button:has-text("UPCOM")');

        // Locator cho Bảng Giá chính
        this.stockTable = page.locator(
            '//div[contains(@class, "trading-board-table")]'
        );
        this.refColumnHeader = page.locator('th:has-text("T.C")');
    }

    /**
     * Tạo locators cho một index panel
     */
    private async createIndexPanelLocators(indexName: string): Promise<IndexPanelLocators> {
        const panel = this.page.locator(`.market-panel:has-text("${indexName}")`);
        if (!panel.isVisible()) {
            await this.rightSlider.click();
            await panel.waitFor({ state: 'visible', timeout: 10000 });
        }

        return {
            panel,
            indexValue: panel.locator(".market-panel-header__index"),
            indexChange: panel.locator(".market-panel-header__change"),
            changePercent: panel.locator(".market-panel-header__changePercent"),
            volValue: panel
                .locator(".market-panel-body .align-items-center .value")
                .nth(0),
            volUnit: panel
                .locator(".market-panel-body .align-items-center .unit")
                .nth(0),
            valueValue: panel
                .locator(".market-panel-body .align-items-center .value")
                .nth(1),
            valueUnit: panel
                .locator(".market-panel-body .align-items-center .unit")
                .nth(1),
            session: panel.locator(".market-panel-footer .market-session-state"),
            chartContainer: panel.locator(".market-panel-chart"),
            openTradingView: panel.locator(".icon.iZoomFull"),
        };
    }

    /**
     * Mở trang Price Board
     */
    async openPriceBoard() {
        await this.page.goto(TEST_CONFIG.WEB_LOGIN_URL);
        await this.page.waitForTimeout(3000);

        if (await this.page.locator('.adv-modal__body').isVisible()) {
            await this.page.click('.btn-icon.btn--cancel');
            await this.page.waitForTimeout(3000);
        }
    }


    /**
     * Mở trang Trading View
     */
    async openTradingView(indexName: string) {
        const indexPanel = await this.createIndexPanelLocators(indexName);
        await indexPanel.openTradingView.click();
        await expect(this.page.locator('.modal-dialog .market-index-modal__header')).toContainText('Chỉ số thị trường');
    }

    /**
     * Lấy data của trang Trading View
     */
    async getTradingViewData() {
        // 1. Outer TradingView iframe
        const outerFrame = this.page.frameLocator(
            'iframe[title="exchangeChart"]'
        );

        // 2. Inner TradingView iframe (nơi canvas thật sự tồn tại)
        const tvFrame = outerFrame.frameLocator('iframe');

        // 3. Canvas
        const canvas = tvFrame.locator('canvas').first();
        await expect(canvas).toBeAttached({ timeout: 30000 });

        // // 4. Trigger render (TradingView thường cần interaction)
        // await canvas.hover().catch(() => { });
        // await canvas.click({ position: { x: 50, y: 50 } }).catch(() => { });

        // 5. Helper lấy OHLC
        const getValue = async (label: string) => {
            const row = tvFrame
                .locator('[class*="valueItem-"]')
                .filter({
                    has: tvFrame
                        .locator('[class*="valueTitle-"]')
                        .filter({ hasText: label }),
                })
                .first();

            await expect(row).toBeAttached({ timeout: 10000 });

            return (await row
                .locator('[class*="valueValue-"]')
                .innerText()).trim();
        };

        // 6. Đợi data settle
        await this.page.waitForTimeout(1500);

        const [valueClose, valueOpen, valueHigh, valueLow] = await Promise.all([
            getValue('C'),
            getValue('O'),
            getValue('H'),
            getValue('H'),
        ]);

        return {
            valueClose,
            valueOpen,
            valueHigh,
            valueLow,
        };
    }

    /**
     * Đóng trang Trading View
     */
    async closeTradingView() {
        await this.page.click('.icon.iClose');
        await this.page.waitForTimeout(5000);
    }

    /**
     * Lấy dữ liệu của một index panel
     */
    async getIndexPanelData(indexName: string): Promise<IndexPanelData> {
        const indexPanel = await this.createIndexPanelLocators(indexName);

        return {
            indexValue: await indexPanel.indexValue.innerText(),
            indexChange: await indexPanel.indexChange.innerText(),
            changePercent: await indexPanel.changePercent.innerText(),
            volValue: `${await indexPanel.volValue.innerText()} ${await indexPanel.volUnit.innerText()}`,
            valueValue: `${await indexPanel.valueValue.innerText()} ${await indexPanel.valueUnit.innerText()}`,
        };
    }


    /**
     * Lấy data card Tổng quan
     */
    async getOverviewData(): Promise<OverviewData> {
        if (!(await this.overviewCard.isVisible())) {
            await this.rightSlider.click();
            await expect(this.overviewCard).toBeVisible({ timeout: 15000 });
        }

        const getValueByLabel = async (label: RegExp) => {
            const name = this.overviewCard
                .locator('.card-index-info-item__name')
                .filter({ hasText: label })
                .first();

            await expect(name).toBeVisible({ timeout: 10000 });

            const value = name
                .locator('..')
                .locator('.card-index-info-item__value');

            return (await value.innerText()).trim();
        };

        const [totalValue, totalVolume, roomNN] = await Promise.all([
            getValueByLabel(/Tổng\s*GD/),
            getValueByLabel(/Tổng\s*(GDTT|GTGD)/),
            getValueByLabel(/Khối\s*ngoại/),
        ]);

        return { totalVolume, totalValue, roomNN };
    }

    /**
     * Lấy data card Global
     */
    async getGlobalDataByLabel(label: string): Promise<GlobalData> {
        const item = this.globalCard
            .locator('.card-index-info-item')
            .filter({ hasText: label })
            .first();
        if (!(await item.isVisible())) {
            await WaitUtils.ensureItemVisible(item, this.globalRightSlider, this.page, 10);
        }

        const values = item.locator('.card-index-info-item__value span');

        return {
            indexValue: await values.nth(0).innerText(),
            indexChange: await values.nth(1).innerText(),
            indexChangePercent: await values.nth(2).innerText(),
        };
    }

    async getGlobalData(): Promise<any> {
        if (!(await this.globalCard.isVisible())) {
            await this.rightSlider.click();
            await expect(this.globalCard).toBeVisible({ timeout: 15000 });
        }

        return {
            dowJones: await this.getGlobalDataByLabel('Dow Jones'),
            sp500: await this.getGlobalDataByLabel('S&P 500'),
            nasdaq: await this.getGlobalDataByLabel('Nasdaq'),
            HangSeng: await this.getGlobalDataByLabel('Hang Seng'),
            Nikkei: await this.getGlobalDataByLabel('Nikkei'),
            FTSE: await this.getGlobalDataByLabel('FTSE'),
            CAC40: await this.getGlobalDataByLabel('CAC40'),
            DAX: await this.getGlobalDataByLabel('DAX'),
            IBEX35: await this.getGlobalDataByLabel('IBEX35'),
            PSI20: await this.getGlobalDataByLabel('PSI20'),
            AEX: await this.getGlobalDataByLabel('AEX'),
            OMX: await this.getGlobalDataByLabel('OMX'),
        };
    }

    /**
     * Chuyển tab và chờ dữ liệu mới load
     */
    async switchTabAndVerifyLoad(tabLocator: Locator) {
        // Lấy mã chứng khoán đầu tiên hiện tại để làm điểm neo
        const firstStockCodeBefore = await this.stockTable
            .locator("tbody tr:first-child td:first-child")
            .innerText();

        await tabLocator.click();

        // Chờ dữ liệu mới xuất hiện
        await expect(
            this.stockTable.locator("tbody tr:first-child td:first-child")
        ).not.toHaveText(firstStockCodeBefore, { timeout: 10000 });
        console.log(`Đã chuyển sang tab: ${await tabLocator.innerText()}`);
    }

    /**
     * Lấy giá trị của một ô dữ liệu cụ thể trong bảng
     */
    async getCellValue(stockCode: string, columnName: string): Promise<string> {
        const columnHeaders = await this.page.locator("thead th").allTextContents();
        const columnIndex = columnHeaders.findIndex(
            (header) => header.trim() === columnName.trim()
        );

        if (columnIndex === -1) {
            throw new Error(`Không tìm thấy cột có tiêu đề: ${columnName}`);
        }

        const cellLocator = this.page
            .locator(`//tr[td[text()='${stockCode}']]/td`)
            .nth(columnIndex);
        await expect(cellLocator).toBeVisible();

        return (await cellLocator.innerText()).trim();
    }
}
