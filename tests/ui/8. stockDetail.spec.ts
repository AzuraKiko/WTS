import { test, expect, type Page } from "@playwright/test";
import { PriceBoardPage } from "../../page/ui/PriceBoard";
import StockDetailPage from "../../page/ui/StockDetail";
import { attachScreenshot } from "../../helpers/reporterHelper";
import { TimeUtils } from "../../helpers/uiUtils";
import { MarketApi } from "../../page/api/MarketApi";
import { NumberValidator } from "../../helpers/validationUtils";
import { TableUtils } from "../../helpers/uiUtils";
import { compareApiRowWithUiRow } from "../../helpers/tableCompareUtils";



test.describe("Stock Detail Tests", () => {
    let page: Page;
    let priceBoardPage: PriceBoardPage;
    let stockDetailPage: StockDetailPage;
    let marketApi: MarketApi;


    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        priceBoardPage = new PriceBoardPage(page);
        stockDetailPage = new StockDetailPage(page);
        marketApi = new MarketApi();

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

        const symbolInfoUI = await stockDetailPage.getSymbolInfo();
        const responseSymbolInfo = await marketApi.getDataStock(stockCode, 'G1');
        const symbolInfoAPI = {
            symbolCode: responseSymbolInfo[0].sym,
            symbolExchange: responseSymbolInfo[0].mc === "10" ? "HOSE" : responseSymbolInfo[0].mc === "02" ? "HNX" : responseSymbolInfo[0].mc === "03" ? "UPCOM" : "",
            symbolName: responseSymbolInfo[0].name,
            symbolPrice: NumberValidator.parseNumber(responseSymbolInfo[0].lastPrice),
            symbolChange: (NumberValidator.parseNumber(responseSymbolInfo[0].lastPrice)) < NumberValidator.parseNumber(responseSymbolInfo[0].r) ? -NumberValidator.parseNumber(responseSymbolInfo[0].ot) : NumberValidator.parseNumber(responseSymbolInfo[0].ot),
            symbolChangePercent: (NumberValidator.parseNumber(responseSymbolInfo[0].lastPrice)) < NumberValidator.parseNumber(responseSymbolInfo[0].r) ? -NumberValidator.parseNumber(responseSymbolInfo[0].changePc) : NumberValidator.parseNumber(responseSymbolInfo[0].changePc),
            floorPrice: NumberValidator.parseNumber(responseSymbolInfo[0].f),
            referencePrice: NumberValidator.parseNumber(responseSymbolInfo[0].r),
            ceilingPrice: NumberValidator.parseNumber(responseSymbolInfo[0].c),
        };

        Object.keys(symbolInfoUI).forEach((key) => {
            expect(symbolInfoUI[key], `Symbol info ${key} should match API`).toBe(symbolInfoAPI[key]);
        });

        if (await TimeUtils.checkDataWithTimeRange(new Date(), 8, 15, 9, 15)) {
            console.warn("Clear data at the beginning of the day (8h15)");
        } else {
            await stockDetailPage.expectMatchListHasData();
            // const matchListUIrows = await TableUtils.getTableRowObjects(page, stockDetailPage.matchTableHeaders, stockDetailPage.matchTableRows, stockDetailPage.matchTableScrollContainer, true);
            // const matchListAPIresponse = await marketApi.getMatchPrice(stockCode, 'G1');

            // const matchListAPIrows = matchListAPIresponse.data.map((item: any) => ({
            //     date: item.time,
            //     lastPrice: item.lastPrice,
            //     change: item.cl === 'd' ? -item.ot : item.cl === 'i' ? item.ot : 0,
            //     lastVol: item.lastVol,
            // }));

            // const columnMap = {
            //     date: 'Ngày',
            //     lastPrice: 'Giá',
            //     change: '+/-',
            //     lastVol: 'KL',
            // };
            // const numericKeys = ['lastPrice', 'change', 'lastVol'];

            // const mismatches = compareApiRowWithUiRow(
            //     matchListAPIrows[0],
            //     matchListUIrows[0],
            //     columnMap,
            //     numericKeys
            // );
            // expect(mismatches, mismatches.join('\n')).toEqual([]);

            await stockDetailPage.expectPriceAnalysisListHasData();
        }

        await stockDetailPage.expectChartVisible();
        await stockDetailPage.expectPriceHistoryHasData();
        await stockDetailPage.expectFinanceHasData();

        await stockDetailPage.expectNewsListHasData();
        await stockDetailPage.expectStockProfileHasData();
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

        if (await TimeUtils.checkDataWithTimeRange(new Date(), 8, 15, 9, 15)) {
            console.warn("Clear data at the beginning of the day (8h15)");
        } else {
            await stockDetailPage.expectMatchListHasData();
            await stockDetailPage.expectPriceAnalysisListHasData();
        }

        await stockDetailPage.expectChartVisible();
        await stockDetailPage.expectPriceHistoryHasData();
        await stockDetailPage.expectFinanceHasData();

        await stockDetailPage.expectNewsListHasData();
        await stockDetailPage.expectCWProfileHasData();
        await stockDetailPage.expectEventListHasData();
        await stockDetailPage.expectPriceListCWVisible()

        await attachScreenshot(page, `CW Detail ${stockCode}`);
        await stockDetailPage.close();
    });
});
