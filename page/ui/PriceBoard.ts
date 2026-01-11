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
        const iframeSelector = 'iframe[title="exchangeChart"]';

        // 1. Wait for the iframe to be visible on the main page first
        // This ensures the modal/dialog animation has finished
        const chartIframe = this.page.locator(iframeSelector).filter({ visible: true }).first();
        await chartIframe.waitFor({ state: 'visible', timeout: 15000 });

        // 2. Ensure the iframe has actually started loading content
        // Check that 'src' is present and not just 'about:blank'
        await expect(chartIframe).toHaveAttribute('src', /.+/, { timeout: 10000 });

        // 3. Define the frame context
        const tvFrame = chartIframe.contentFrame();
        // Using chartIframe.contentFrame() directly is often more stable
        // than frameLocator when dealing with dynamic modals.

        // 4. Wait for the canvas - ensure the TradingView library has drawn the UI
        const canvas = tvFrame.locator('canvas').first();
        await expect(canvas).toBeAttached({ timeout: 20000 });

        // 5. Interact to trigger legend rendering
        await canvas.hover().catch(() => { });
        await canvas.click({ position: { x: 50, y: 50 } }).catch(() => { });

        const getValue = async (label: string) => {
            // Use filter with hasText for exact matches to avoid 'C' matching 'Close'
            const row = tvFrame.locator('[class*="valueItem-"]').filter({
                has: tvFrame.locator('[class*="valueTitle-"]').filter({ hasText: label })
            }).first();

            return (await row.locator('[class*="valueValue-"]').innerText()).trim();
        };

        try {
            // Wait for data to settle from "n/a" or "0"
            await this.page.waitForTimeout(1500);

            const [valueClose, valueOpen, valueHigh, valueLow] = await Promise.all([
                getValue('C'),
                getValue('O'),
                getValue('H'),
                getValue('L'),
            ]);

            return { valueClose, valueOpen, valueHigh, valueLow };
        } catch (error) {
            const path = `debug-tv-${Date.now()}.png`;
            await this.page.screenshot({ path, fullPage: true });
            throw new Error(`Data extraction failed. Values might not be rendered. See: ${path}`);
        }
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
