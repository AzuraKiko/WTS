import { Page, Locator, expect } from '@playwright/test';

export class MarketWatchPage {
    readonly page: Page;
    
    // Locators cho các Tab Sàn Giao dịch (Giả định dựa trên HTML thông thường)
    readonly hnxTab: Locator;
    readonly upcomTab: Locator;
    
    // Locator chung cho toàn bộ bảng dữ liệu
    readonly stockTable: Locator;
    
    // Locator cho tiêu đề cột Giá Trần (T.C) để kiểm tra Sorting
    readonly tranColumnHeader: Locator; 
    
    // --- Locators cho Mini Chart VNI ---
    readonly vniPanel: Locator;
    readonly vniIndexValue: Locator;
    readonly vniChangePercent: Locator;
    readonly vniChartContainer: Locator;

    constructor(page: Page) {
        this.page = page;
        
        // Locators cho Tabs
        this.hnxTab = page.locator('button:has-text("HNX")');
        this.upcomTab = page.locator('button:has-text("UPCOM")');

        // Locator cho Bảng Giá chính
        this.stockTable = page.locator('//div[contains(@class, "trading-board-table")]');
        this.tranColumnHeader = page.locator('th:has-text("T.C")'); 

        // Locators cho VNI Mini Chart (Dựa trên HTML bạn cung cấp)
        this.vniPanel = page.locator('.market-panel:has-text("VNI")');
        this.vniIndexValue = this.vniPanel.locator('.market-panel-header__index');
        this.vniChangePercent = this.vniPanel.locator('.market-panel-header__changePercent');
        this.vniChartContainer = this.vniPanel.locator('.market-panel-chart');
    }

    /**
     * Chuyển tab và chờ dữ liệu mới load
     */
    async switchTabAndVerifyLoad(tabLocator: Locator) {
        // Lấy mã chứng khoán đầu tiên hiện tại để làm điểm neo
        const firstStockCodeBefore = await this.stockTable.locator('tbody tr:first-child td:first-child').innerText();
        
        await tabLocator.click();
        
        // Chờ dữ liệu mới xuất hiện (bằng cách chờ mã chứng khoán đầu tiên thay đổi)
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