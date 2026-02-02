import { test, expect, type Page } from "@playwright/test";
import { PriceBoardPage } from "../../page/ui/PriceBoard";
import StockDetailPage from "../../page/ui/StockDetail";
import { attachScreenshot } from "../../helpers/reporterHelper";

test.describe("Stock Detail modal", () => {
    let page: Page;
    let priceBoardPage: PriceBoardPage;
    let stockDetailPage: StockDetailPage;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        priceBoardPage = new PriceBoardPage(page);
        stockDetailPage = new StockDetailPage(page);

        await priceBoardPage.openPriceBoard();

        await expect(
            page.locator("table.price-table"),
            "Price board table should be visible"
        ).toBeVisible();
    });

    test.afterAll(async () => {
        await page.close();
    });

    test("TC_001: Check stock detail of stock code", async () => {
        const { stockCode } = await stockDetailPage.openFromPriceBoardFirstRow();

        await stockDetailPage.expectModalVisible();
        await stockDetailPage.expectHeaderVisible();
        await stockDetailPage.expectSymbolMatched(stockCode);
        await stockDetailPage.expectSymbolInfoVisible();
        await stockDetailPage.expectMatchListHasData();
        await stockDetailPage.expectPriceHistoryHasData();
        await stockDetailPage.expectFinanceHasData();
        await stockDetailPage.expectChartVisible();
        await stockDetailPage.expectStockProfileHasData();
        await stockDetailPage.expectNewsListHasData();
        await stockDetailPage.expectEventListHasData();
        await stockDetailPage.expectPriceListVisible();

        await attachScreenshot(page, `Stock Detail ${stockCode}`);
        await stockDetailPage.close();
    });

    test("TC_002: Check stock detail of CW code", async () => {
        await priceBoardPage.getFirstCWCodeUI();
        const { stockCode } = await stockDetailPage.openFromPriceBoardFirstRow();

        await stockDetailPage.expectModalVisible();
        await stockDetailPage.expectHeaderVisible();
        await stockDetailPage.expectSymbolMatched(stockCode);
        await stockDetailPage.expectSymbolInfoVisible();
        await stockDetailPage.expectMatchListHasData();
        await stockDetailPage.expectPriceHistoryHasData();
        await stockDetailPage.expectFinanceHasData();
        await stockDetailPage.expectChartVisible();
        await stockDetailPage.expectCWProfileHasData();
        await stockDetailPage.expectNewsListHasData();
        await stockDetailPage.expectEventListHasData();
        await stockDetailPage.expectPriceListVisible();

        await attachScreenshot(page, `CW Detail ${stockCode}`);
        await stockDetailPage.close();
    });
});
