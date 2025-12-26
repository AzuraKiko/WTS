import { Page, Locator, expect } from "@playwright/test";
import { TEST_CONFIG } from "../../tests/utils/testConfig";

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

export class PriceBoardPage {
    readonly page: Page;
    // Locators mini chart
    readonly rightSlider: Locator;
    readonly leftSlider: Locator;
    readonly iconResize: Locator;
    readonly iconExpand: Locator;
    readonly overviewCard: Locator;


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

        // Locators mini chart
        this.rightSlider = page.locator('.slider-right');
        this.leftSlider = page.locator('.slider-left');
        this.iconResize = page.locator('.icon.iResize');
        this.iconExpand = page.locator('.icon.iExpand');
        this.overviewCard = page.locator('.overview-card');

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
    private createIndexPanelLocators(indexName: string): IndexPanelLocators {
        const panel = this.page.locator(`.market-panel:has-text("${indexName}")`);

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
        await this.page.waitForTimeout(10000);

        if (await this.page.locator('.adv-modal__body').isVisible()) {
            await this.page.click('.btn-icon.btn--cancel');
            await this.page.waitForTimeout(10000);
        }
    }

    /**
     * Mở trang Trading View
     */
    async openTradingView(indexName: string) {
        const indexPanel = this.createIndexPanelLocators(indexName);
        await indexPanel.openTradingView.click();
        await expect(this.page.locator('.modal-dialog .market-index-modal__header')).toHaveText('Chỉ số thị trường');
    }

    /**
     * Lấy data của trang Trading View
     */
    async getTradingViewData() {
        return {
            valueClose: await this.page
                .locator('.valueItem-l31H9iuA:has(.valueTitle-l31H9iuA:text("C")) .valueValue-l31H9iuA')
                .innerText(),
            valueOpen: await this.page
                .locator('.valueItem-l31H9iuA:has(.valueTitle-l31H9iuA:text("O")) .valueValue-l31H9iuA')
                .innerText(),
            valueHigh: await this.page
                .locator('.valueItem-l31H9iuA:has(.valueTitle-l31H9iuA:text("H")) .valueValue-l31H9iuA')
                .innerText(),
            valueLow: await this.page
                .locator('.valueItem-l31H9iuA:has(.valueTitle-l31H9iuA:text("L")) .valueValue-l31H9iuA')
                .innerText(),
        };
    }

    /**
     * Đóng trang Trading View
     */
    async closeTradingView() {
        await this.page.click('.icon iClose');
        await this.page.waitForTimeout(5000);
    }

    /**
     * Lấy dữ liệu của một index panel
     */
    async getIndexPanelData(indexName: string): Promise<IndexPanelData> {
        const indexPanel = this.createIndexPanelLocators(indexName);

        return {
            indexValue: await indexPanel.indexValue.innerText(),
            indexChange: await indexPanel.indexChange.innerText(),
            changePercent: await indexPanel.changePercent.innerText(),
            volValue: `${await indexPanel.volValue.innerText()} ${await indexPanel.volUnit.innerText()}`,
            valueValue: `${await indexPanel.valueValue.innerText()} ${await indexPanel.valueUnit.innerText()}`,
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
