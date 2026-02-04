import { test, expect, type Page } from "@playwright/test";
import { PriceBoardPage } from "../../page/ui/PriceBoard";
import StockDetailPage from "../../page/ui/StockDetail";
import { attachScreenshot } from "../../helpers/reporterHelper";
import { TimeUtils, WaitUtils } from "../../helpers/uiUtils";
import { MarketApi } from "../../page/api/MarketApi";
import { NumberValidator } from "../../helpers/validationUtils";
import { ChartPage } from "../../page/ui/ChartPage";
import { chartHasDataPipeline } from "../../page/ui/CharPipeline";
import Menu from "../../page/ui/Menu";

async function expectMatchListMatchesAPI(
    stockDetailPage: StockDetailPage,
    marketApi: MarketApi,
    stockCode: string,
    board: string,
) {
    const matchListUI = await stockDetailPage.getFirstMatchListRowData();
    const matchListAPIresponse = await marketApi.getMatchPrice(stockCode, board);
    const matchListAPI = {
        date: matchListAPIresponse[0]?.time,
        lastPrice: NumberValidator.parseNumber(matchListAPIresponse[0]?.lastPrice),
        change: NumberValidator.parseNumber(
            matchListAPIresponse[0]?.cl === "d"
                ? -matchListAPIresponse[0]?.change
                : matchListAPIresponse[0]?.cl === "i"
                    ? matchListAPIresponse[0]?.change
                    : 0,
        ),
        lastVol: NumberValidator.parseNumber(matchListAPIresponse[0]?.lastVol),
    };

    Object.keys(matchListUI).forEach((key) => {
        expect(
            matchListUI[key],
            `Match list ${key} should match API`,
        ).toBe(matchListAPI[key as keyof typeof matchListAPI]);
    });
}

async function expectPriceAnalysisMatchesAPI(
    stockDetailPage: StockDetailPage,
    marketApi: MarketApi,
    stockCode: string,
    board: string,
) {
    const priceAnalysisUI = await stockDetailPage.getFirstPriceAnalysisRowData();
    const priceAnalysisAPIresponse = await marketApi.getPriceAnalysis(stockCode, board);
    const priceAnalysisAPI = {
        price: NumberValidator.parseNumber(priceAnalysisAPIresponse[0]?.price),
        total: NumberValidator.parseNumber(priceAnalysisAPIresponse[0]?.total),
    };

    Object.keys(priceAnalysisUI).forEach((key) => {
        expect(
            priceAnalysisUI[key],
            `Price analysis ${key} should match API`,
        ).toBe(priceAnalysisAPI[key as keyof typeof priceAnalysisAPI]);
    });
}

test.describe("Stock Detail Tests", () => {
    let page: Page;
    let priceBoardPage: PriceBoardPage;
    let stockDetailPage: StockDetailPage;
    let marketApi: MarketApi;
    let chartPage: ChartPage;
    let menu: Menu;


    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        priceBoardPage = new PriceBoardPage(page);
        stockDetailPage = new StockDetailPage(page);
        marketApi = new MarketApi();
        chartPage = new ChartPage(page, page.frameLocator('iframe.chart'));
        menu = new Menu(page);

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

        Object.keys(symbolInfoUI).forEach((key) => {
            expect(symbolInfoUI[key], `Symbol info ${key} should match API`).toBe(symbolInfoAPI[key]);
        });

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
        const { stockCode } = await stockDetailPage.openFromPriceBoardFirstRow();


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

    test("TC_003: Check stock detail of derivative code, not login", async () => {
        await menu.openMenuHeader("Phái sinh");
        const { stockCode } = await stockDetailPage.openFromPriceBoardFirstRow();

        await stockDetailPage.expectModalVisible(stockDetailPage.derivativeModal);
        await stockDetailPage.expectHeaderVisible();

        await stockDetailPage.expectSymbolMatched(stockCode);
        await stockDetailPage.expectSymbolInfoVisible();

        const symbolInfoUI = await stockDetailPage.getSymbolInfo();
        const responseSymbolInfo = await marketApi.getDataStock(stockCode, "G1");
        const symbolInfoAPI = {
            symbolCode: responseSymbolInfo[0].sym,
            symbolExchange:
                responseSymbolInfo[0].mc === "10"
                    ? "HOSE"
                    : responseSymbolInfo[0].mc === "02"
                    ? "HNX"
                    : responseSymbolInfo[0].mc === "03"
                    ? "UPCOM"
                    : "",
            symbolName: responseSymbolInfo[0].name,
            symbolPrice: NumberValidator.parseNumber(responseSymbolInfo[0].lastPrice),
            symbolChange:
                NumberValidator.parseNumber(responseSymbolInfo[0].lastPrice) <
                NumberValidator.parseNumber(responseSymbolInfo[0].r)
                    ? -NumberValidator.parseNumber(responseSymbolInfo[0].ot)
                    : NumberValidator.parseNumber(responseSymbolInfo[0].ot),
            symbolChangePercent:
                NumberValidator.parseNumber(responseSymbolInfo[0].lastPrice) <
                NumberValidator.parseNumber(responseSymbolInfo[0].r)
                    ? -NumberValidator.parseNumber(responseSymbolInfo[0].changePc)
                    : NumberValidator.parseNumber(responseSymbolInfo[0].changePc),
            floorPrice: NumberValidator.parseNumber(responseSymbolInfo[0].f),
            referencePrice: NumberValidator.parseNumber(responseSymbolInfo[0].r),
            ceilingPrice: NumberValidator.parseNumber(responseSymbolInfo[0].c),
        };

        if (symbolInfoAPI.symbolPrice === 0) {
            symbolInfoAPI.symbolChange = 0;
            symbolInfoAPI.symbolChangePercent = 0;
        }

        // Derivative detail header does not expose exchange/name,
        // so only compare the fields actually displayed in the UI.
        const derivativeFieldsToCompare: (keyof typeof symbolInfoUI)[] = [
            "symbolCode",
            "symbolPrice",
            "symbolChange",
            "symbolChangePercent",
            "floorPrice",
            "referencePrice",
            "ceilingPrice",
        ];

        derivativeFieldsToCompare.forEach((key) => {
            expect(
                symbolInfoUI[key],
                `Derivative symbol info ${key} should match API`,
            ).toBe(symbolInfoAPI[key]);
        });

        if (await TimeUtils.checkDataWithTimeRange(new Date(), 8, 15, 9, 15)) {
            console.warn("Clear data at the beginning of the day (8h15)");
        } else {
            await stockDetailPage.expectMatchListHasData();

            if (await TimeUtils.checkDataWithTimeRange(new Date(), 9, 0, 14, 45)) {
                console.warn("This time is realtime data, so we don't need to check match list");
            } else {
                await expectMatchListMatchesAPI(stockDetailPage, marketApi, stockCode, "G1");
            }
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


        await stockDetailPage.expectPriceListVisible();

        await attachScreenshot(page, `Stock Detail ${stockCode}`);
        await stockDetailPage.close();

    });
});
