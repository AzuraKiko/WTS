import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { PriceBoardPage } from "../../page/ui/PriceBoard";
import StockDetailPage from "../../page/ui/StockDetail";
import { attachScreenshot } from "../../helpers/reporterHelper";
import { TimeUtils, WaitUtils } from "../../helpers/uiUtils";
import { MarketApi } from "../../page/api/MarketApi";
import { NumberValidator } from "../../helpers/validationUtils";
import { ChartPage } from "../../page/ui/ChartPage";
import { chartHasDataPipeline } from "../../page/ui/CharPipeline";
import Menu from "../../page/ui/Menu";
import { TEST_CONFIG } from "../utils/testConfig";
import LoginPage from "../../page/ui/LoginPage";

// Helper function to calculate change value based on color indicator
function calculateChange(apiResponse: any): number {
    if (!apiResponse) return 0;
    const change = NumberValidator.parseNumber(apiResponse.change);
    return apiResponse.cl === "d" ? -change : apiResponse.cl === "i" ? change : 0;
}

// Helper function to compare UI and API data
function expectDataMatches<T extends Record<string, any>>(
    uiData: T,
    apiData: T,
    dataType: string
): void {
    Object.keys(uiData).forEach((key) => {
        expect(
            uiData[key],
            `${dataType} ${key} should match API`,
        ).toBe(apiData[key as keyof T]);
    });
}

async function expectMatchListMatchesAPI(
    stockDetailPage: StockDetailPage,
    marketApi: MarketApi,
    stockCode: string,
    board: string,
) {
    const matchListUI = await stockDetailPage.getFirstMatchListRowData();
    const matchListAPIresponse = await marketApi.getMatchPrice(stockCode, board);
    const firstMatch = matchListAPIresponse[0];

    const matchListAPI = {
        date: firstMatch?.time,
        lastPrice: NumberValidator.parseNumber(firstMatch?.lastPrice),
        change: calculateChange(firstMatch),
        lastVol: NumberValidator.parseNumber(firstMatch?.lastVol),
    };

    expectDataMatches(matchListUI, matchListAPI, "Match list");
}

async function expectPriceAnalysisMatchesAPI(
    stockDetailPage: StockDetailPage,
    marketApi: MarketApi,
    stockCode: string,
    board: string,
) {
    const priceAnalysisUI = await stockDetailPage.getFirstPriceAnalysisRowData();
    const priceAnalysisAPIresponse = await marketApi.getPriceAnalysis(stockCode, board);
    const firstAnalysis = priceAnalysisAPIresponse[0];

    const priceAnalysisAPI = {
        price: NumberValidator.parseNumber(firstAnalysis?.price),
        total: NumberValidator.parseNumber(firstAnalysis?.total),
    };

    expectDataMatches(priceAnalysisUI, priceAnalysisAPI, "Price analysis");
}

test.describe("Stock Detail Tests", () => {
    let page: Page;
    let context: BrowserContext;
    let priceBoardPage: PriceBoardPage;
    let stockDetailPage: StockDetailPage;
    let marketApi: MarketApi;
    let chartPage: ChartPage;
    let menu: Menu;
    let loginPage: LoginPage;


    test.beforeAll(async ({ browser }) => {
        context = await browser.newContext({
            recordVideo: { dir: 'test-results' },
        });
        page = await context.newPage();
        priceBoardPage = new PriceBoardPage(page);
        stockDetailPage = new StockDetailPage(page);
        marketApi = new MarketApi();
        chartPage = new ChartPage(page, page.frameLocator('iframe.chart'));
        menu = new Menu(page);
        loginPage = new LoginPage(page);

        await priceBoardPage.openPriceBoard();

        await expect(
            page.locator("table.price-table"),
            "Price board table should be visible"
        ).toBeVisible();
    });

    test.afterAll(async () => {
        await context.close();
    });

    test("TC_001: Check stock detail of stock code", async () => {
        const { stockCode } = await stockDetailPage.openFromPriceBoardFirstRow(stockDetailPage.modal);

        await stockDetailPage.expectModalVisible(stockDetailPage.modal);
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

        if (symbolInfoAPI.symbolPrice === 0) {
            symbolInfoAPI.symbolChange = 0;
            symbolInfoAPI.symbolChangePercent = 0;
        }

        expectDataMatches(symbolInfoUI, symbolInfoAPI, "Symbol info");

        if (await TimeUtils.checkDataWithTimeRange(new Date(), 8, 15, 9, 15)) {
            console.warn("Clear data at the beginning of the day (8h15)");
        } else {
            await stockDetailPage.expectMatchListHasData();

            if (await TimeUtils.checkDataWithTimeRange(new Date(), 9, 0, 14, 45)) {
                console.warn("This time is realtime data, so we don't need to check match list");
            } else {
                await expectMatchListMatchesAPI(stockDetailPage, marketApi, stockCode, "G1");
                await stockDetailPage.clickOddLotSwitch();
                await WaitUtils.delay(3000);
                await expectMatchListMatchesAPI(stockDetailPage, marketApi, stockCode, "G4");
                await stockDetailPage.clickOddLotSwitch();
                await WaitUtils.delay(3000);
            }

            await stockDetailPage.expectPriceAnalysisListHasData();

            if (await TimeUtils.checkDataWithTimeRange(new Date(), 9, 0, 14, 45)) {
                console.warn("This time is realtime data, so we don't need to check price analysis");
            } else {
                await expectPriceAnalysisMatchesAPI(stockDetailPage, marketApi, stockCode, "G1");
            };
        }


        await stockDetailPage.expectChartVisible();

        const timeframeCurrent = await chartPage.getTimeframeCurrent();

        const symbolCurrent = await chartPage.getCurrentSymbol();
        expect(symbolCurrent).toBe(stockCode);

        const chartResult = await chartHasDataPipeline(page, {
            symbol: stockCode,
            timeframe: timeframeCurrent,
        }, {
            chartLocator: chartPage.chartLocator
        });

        expect(chartResult.hasData).toBeTruthy();
        // console.log('chartResult', chartResult.evidence);
        // console.log('chartResult bestZoom', chartResult.bestZoom);


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
        const { stockCode } = await stockDetailPage.openFromPriceBoardFirstRow(stockDetailPage.modal);


        await stockDetailPage.expectModalVisible(stockDetailPage.modal);
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

    test("TC_003: Check stock detail of derivative code", async () => {
        await menu.openMenuHeader("Phái sinh");
        const { stockCode } = await stockDetailPage.openFromPriceBoardFirstRow(stockDetailPage.derivativeModal);

        await stockDetailPage.expectModalVisible(stockDetailPage.derivativeModal);
        await stockDetailPage.expectHeaderDerivativeVisible();

        await stockDetailPage.expectSymbolDerivativeMatched(stockCode);

        await stockDetailPage.expectDerivativeChartVisible();

        const timeframeCurrent = await chartPage.getTimeframeCurrent();

        const symbolCurrent = await chartPage.getCurrentSymbol();
        expect(symbolCurrent).toBe(stockCode);

        const chartResult = await chartHasDataPipeline(page, {
            symbol: stockCode,
            timeframe: timeframeCurrent,
        }, {
            chartLocator: chartPage.chartLocator
        });

        expect(chartResult.hasData).toBeTruthy();
        // console.log('chartResult', chartResult.evidence);
        // console.log('chartResult bestZoom', chartResult.bestZoom);


        if (await TimeUtils.checkDataWithTimeRange(new Date(), 8, 15, 9, 15)) {
            console.warn("Clear data at the beginning of the day (8h15)");
        } else {
            await stockDetailPage.expectPriceListDerivativeVisible();
            await stockDetailPage.expectMatchListDerivativeHasData();
            await stockDetailPage.expectPriceAnalysisListDerivativeHasData();
        }
        await attachScreenshot(page, `Stock Detail ${stockCode}`);

        await stockDetailPage.clickLoginButton();
        await loginPage.enterUsernameAndPassword(TEST_CONFIG.TEST_USER, TEST_CONFIG.TEST_PASS);
        await loginPage.waitForPageLoad();
        await page.waitForTimeout(3000);
        await page.locator('.wts-modal').locator('.icon.iClose').locator('..').click();
        if (await page.locator('.modal-content .btn--reset').isVisible()) {
            await loginPage.page.locator('.modal-content .btn--reset').click();
        }

        await stockDetailPage.closeDerivative();
        expect(await loginPage.verifyLoginSuccess(TEST_CONFIG.TEST_USER)).toBeTruthy();

    });
});
