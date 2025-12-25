import { Page, Locator, expect } from '@playwright/test';

export class MarketWatchPage {
    readonly page: Page;

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

    // --- Locators cho Mini Chart VNI ---
    readonly vniPanel: Locator;
    readonly vniIndexValue: Locator;
    readonly vniIndexChange: Locator;
    readonly vniChangePercent: Locator;
    readonly vniChartContainer: Locator;

    // Locators cho Mini Chart VN30
    readonly vn30Panel: Locator;
    readonly vn30IndexValue: Locator;
    readonly vn30IndexChange: Locator;
    readonly vn30ChangePercent: Locator;
    readonly vn30ChartContainer: Locator;

    // Locators cho Mini Chart HNX
    readonly hnxPanel: Locator;
    readonly hnxIndexValue: Locator;
    readonly hnxIndexChange: Locator;
    readonly hnxChangePercent: Locator;
    readonly hnxChartContainer: Locator;

    // Locators cho Mini Chart UPCOM
    readonly upcomPanel: Locator;
    readonly upcomIndexValue: Locator;
    readonly upcomIndexChange: Locator;
    readonly upcomChangePercent: Locator;
    readonly upcomChartContainer: Locator;

    constructor(page: Page) {
        this.page = page;

        // Locators cho Tabs
        this.hnxTab = page.locator('button:has-text("HNX")');
        this.upcomTab = page.locator('button:has-text("UPCOM")');

        // Locator cho Bảng Giá chính
        this.stockTable = page.locator('//div[contains(@class, "trading-board-table")]');
        this.refColumnHeader = page.locator('th:has-text("T.C")');

        // Locators cho Mini Chart
        this.vniPanel = page.locator('.market-panel:has-text("VNI")');
        this.vniIndexValue = this.vniPanel.locator('.market-panel-header__index');
        this.vniIndexChange = this.vniPanel.locator('.market-panel-header__change');
        this.vniChangePercent = this.vniPanel.locator('.market-panel-header__changePercent');
        this.vniChartContainer = this.vniPanel.locator('.market-panel-chart');

        this.vn30Panel = page.locator('.market-panel:has-text("VN30")');
        this.vn30IndexValue = this.vn30Panel.locator('.market-panel-header__index');
        this.vn30IndexChange = this.vn30Panel.locator('.market-panel-header__change');
        this.vn30ChangePercent = this.vn30Panel.locator('.market-panel-header__changePercent');
        this.vn30ChartContainer = this.vn30Panel.locator('.market-panel-chart');

        this.hnxPanel = page.locator('.market-panel:has-text("HNX")');
        this.hnxIndexValue = this.hnxPanel.locator('.market-panel-header__index');
        this.hnxIndexChange = this.hnxPanel.locator('.market-panel-header__change');
        this.hnxChangePercent = this.hnxPanel.locator('.market-panel-header__changePercent');
        this.hnxChartContainer = this.hnxPanel.locator('.market-panel-chart');

        this.upcomPanel = page.locator('.market-panel:has-text("UPCOM")');
        this.upcomIndexValue = this.upcomPanel.locator('.market-panel-header__index');
        this.upcomIndexChange = this.upcomPanel.locator('.market-panel-header__change');
        this.upcomChangePercent = this.upcomPanel.locator('.market-panel-header__changePercent');
        this.upcomChartContainer = this.upcomPanel.locator('.market-panel-chart');
    }

    /**
     * Chuyển tab và chờ dữ liệu mới load
     */
    async switchTabAndVerifyLoad(tabLocator: Locator) {
        // Lấy mã chứng khoán đầu tiên hiện tại để làm điểm neo
        const firstStockCodeBefore = await this.stockTable.locator('tbody tr:first-child td:first-child').innerText();

        await tabLocator.click();

        // Chờ dữ liệu mới xuất hiện
        await expect(this.stockTable.locator('tbody tr:first-child td:first-child')).not.toHaveText(firstStockCodeBefore, { timeout: 10000 });
        console.log(`Đã chuyển sang tab: ${await tabLocator.innerText()}`);
    }

    /**
     * Lấy giá trị của một ô dữ liệu cụ thể trong bảng
     */
    async getCellValue(stockCode: string, columnName: string): Promise<string> {
        const columnHeaders = await this.page.locator('thead th').allTextContents();
        const columnIndex = columnHeaders.findIndex(header => header.trim() === columnName.trim());

        if (columnIndex === -1) {
            throw new Error(`Không tìm thấy cột có tiêu đề: ${columnName}`);
        }

        const cellLocator = this.page.locator(`//tr[td[text()='${stockCode}']]/td`).nth(columnIndex);
        await expect(cellLocator).toBeVisible();

        return (await cellLocator.innerText()).trim();
    }
}