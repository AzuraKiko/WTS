import { test, expect } from '@playwright/test';
import { PriceBoardPage } from '../../page/ui/PriceBoard';
import Menu from '../../page/ui/Menu';
import { MarketApi, MarketGatewayApi, MarketWapiApi } from '../../page/api/MarketApi';
import { TimeUtils } from '../../helpers/uiUtils';
import { retryCompareData } from '../../helpers/assertions';
import { ColorUtils, NumberValidator } from '../../helpers/validationUtils';
import { TEST_DATA } from '../utils/testConfig';
import { attachScreenshot } from '../../helpers/reporterHelper';
import { chartHasDataPipeline } from '../../page/ui/CharPipeline';
import { ChartPage } from '../../page/ui/ChartPage';

const parseNumber = (value: string): number => {
    return NumberValidator.parseNumber(value);
};

const parseNumberWithUnit = (value: string): number => {
    return NumberValidator.parseNumberWithUnit(value);
};

const formatVolumeValue = (value: number): number => {
    const absValue = Math.abs(value);
    if (absValue < 1000) {
        return value;
    } else if (absValue >= 1000000000) { // Tỷ
        return Math.round((value / 1000000000) * 100) / 100;
    } else if (absValue >= 1000000) { // Triệu
        return Math.round((value / 1000000) * 100) / 100;
    } else { // Nghìn
        return Math.round((value / 1000) * 100) / 100;
    }
};

const formatValueValue = (value: number): number => {
    value = value * 1000000;
    if (value < 1000) {
        return value;
    } else if (value >= 1000000000) { // Tỷ
        return Math.round(value / 1000000000);
    } else if (value >= 1000000) { // Triệu
        return Math.round(value / 1000000);
    } else { // Nghìn
        return Math.round(value / 1000);
    }
};

type IndexUiData = {
    indexValue: number;
    indexChange: number;
    changePercent: number;
    volValue: number;
    valueValue: number;
};

const buildIndexUiData = (indexPanelData: {
    indexValue: string;
    indexChange: string;
    changePercent: string;
    volValue: string;
    valueValue: string;
}): IndexUiData => ({
    indexValue: parseNumber(indexPanelData.indexValue),
    indexChange: parseNumber(indexPanelData.indexChange),
    changePercent: parseNumber(indexPanelData.changePercent.replace('%', '')),
    volValue: parseNumber(indexPanelData.volValue),
    valueValue: parseNumber(indexPanelData.valueValue),
});

const buildIndexApiData = (
    indexDataApi: {
        indexValue: number;
        indexChange: string;
        changePercent: string;
        volValue: number;
        valueValue: number;
    },
    options?: { valueValueDivisor?: number }
): IndexUiData => ({
    indexValue: indexDataApi.indexValue,
    indexChange: parseNumber(indexDataApi.indexChange),
    changePercent: parseNumber(indexDataApi.changePercent.replace('%', '')),
    volValue: formatVolumeValue(indexDataApi.volValue),
    valueValue: formatValueValue(indexDataApi.valueValue / (options?.valueValueDivisor ?? 1)),
});

const assertIndexColorByChange = (indexColor: string, indexChange: number): void => {
    if (indexChange < 0) {
        ColorUtils.expectColorFamily(indexColor, 'RED');
    } else if (indexChange > 0) {
        ColorUtils.expectColorFamily(indexColor, 'GREEN');
    } else {
        ColorUtils.expectColorFamily(indexColor, 'YELLOW');
    }
};

const assertMatchOrPositive = async (
    checkLabel: string,
    ui: IndexUiData,
    api: IndexUiData,
    positiveLabel: string
): Promise<void> => {
    if (await TimeUtils.checkDataWithExcludeTimeRange(new Date(), 8, 15, 15, 0)) {
        for (const [key, uiValue] of Object.entries(ui)) {
            expect(uiValue, `${checkLabel} ${key} should match API`).toBe(api[key as keyof typeof api]);
        }
    } else {
        expect(ui.indexValue, positiveLabel).toBeGreaterThan(0);
    }
};

type NumericRecord = Record<string, number>;

const assertMatchedOrPositive = (
    matched: boolean,
    ui: NumericRecord,
    api: NumericRecord,
    matchLabelPrefix: string,
    positiveValue: number,
    positiveLabel: string
): void => {
    if (matched) {
        for (const [key, uiValue] of Object.entries(ui)) {
            expect(uiValue, `${matchLabelPrefix} ${key} should match API`).toBe(api[key]);
        }
    } else {
        expect(positiveValue, positiveLabel).toBeGreaterThan(0);
    }
};




test.describe('Price Board Tests', () => {
    let priceBoardPage: PriceBoardPage;
    let marketApi: MarketApi;
    let marketGatewayApi: MarketGatewayApi;
    let marketWapiApi: MarketWapiApi;
    let menu: Menu;
    let chartPage: ChartPage;


    test.beforeEach(async ({ page }) => {
        priceBoardPage = new PriceBoardPage(page);
        marketApi = new MarketApi();
        marketGatewayApi = new MarketGatewayApi();
        marketWapiApi = new MarketWapiApi();
        menu = new Menu(page);
        chartPage = new ChartPage(page, page.frameLocator('iframe.chart'));

        await priceBoardPage.openPriceBoard();
    });
    test('TC_001: Check market info - Price Board', async () => {
        const latestDvx = await marketApi.getLatestDvx();
        const indexCode = latestDvx.indexCode;
        const indexCodes = Object.values(TEST_DATA.INDEX_CODES).concat(indexCode);

        // Check render mini chart panels (VNI/VN30/HNX/UPCOM/VN100/DVX) with SVG
        if (await TimeUtils.checkDataWithExcludeTimeRange(new Date(), 8, 15, 9, 0)) {
            for (const code of indexCodes) {
                const panel = priceBoardPage.page.locator('.market-panel', { hasText: code });
                const chart = panel.locator('.market-panel-chart');

                await expect(panel, `${code} panel should be visible`).toBeVisible();
                await expect(chart, `${code} chart container should be visible`).toBeVisible();
                await expect(chart.locator('svg'), `${code} chart should have an SVG`).toBeVisible();
            }
        } else {
            console.log("This is the time to reset data at the beginning of the day");
        }

        // Check trading view data for Mini Chart Panels
        for (const code of indexCodes) {
            await priceBoardPage.openTradingView(code);
            await priceBoardPage.expectChartVisible();
            const timeframeCurrent = await chartPage.getTimeframeCurrent();

            const chartResult = await chartHasDataPipeline(priceBoardPage.page, {
                symbol: code,
                timeframe: timeframeCurrent,
            }, {
                chartLocator: chartPage.chartLocator
            });

            expect(chartResult.hasData).toBeTruthy();
            await attachScreenshot(priceBoardPage.page, 'After check trading view data for ' + code);
            await priceBoardPage.closeTradingView();
        }
  
        // Check data tab HSX, HNX, UPCOM, Lô lẻ (HSX), Lô lẻ (HNX), Lô lẻ (UPCOM)
        type TabCase = {
            dropdownName: string;
            tabName: string;
            boardId: string;
            board: string;
            noetf?: string;
        };

        const tabCases: TabCase[] = [
            { dropdownName: "HSX", tabName: "HSX", boardId: "10", board: "G1" },
            { dropdownName: "HNX", tabName: "HNX", boardId: "02", board: "G1" },
            { dropdownName: "UPCOM", tabName: "UPCOM", boardId: "03", board: "G1" },
            { dropdownName: "Lô lẻ", tabName: "Lô lẻ (HSX)", boardId: "10", board: "G4", noetf: "Y" },
            { dropdownName: "Lô lẻ", tabName: "Lô lẻ (HNX)", boardId: "02", board: "G4", noetf: "Y" },
            { dropdownName: "Lô lẻ", tabName: "Lô lẻ (UPCOM)", boardId: "03", board: "G4", noetf: "Y" },
        ];

        for (const tabCase of tabCases) {
            const [firstStockCodeUI, firstStockCodeApi] = await Promise.all([
                priceBoardPage.getFirstStockCodeUI(tabCase.dropdownName, tabCase.tabName),
                marketApi.getFirstStockCode(tabCase.boardId, tabCase.board, tabCase?.noetf),
            ]);

            expect(firstStockCodeUI, `First stock code ${tabCase.dropdownName} ${tabCase.tabName} should match API`).toBe(firstStockCodeApi);
            await attachScreenshot(priceBoardPage.page, 'After check data tab ' + tabCase.tabName);
            await priceBoardPage.page.waitForTimeout(1000);
        }
   

        // Check data tab CW, ETF
        const [firstCWCodeUI, firstCWCodeApi] = await Promise.all([
            priceBoardPage.getFirstCWCodeUI(),
            marketApi.getFirstCWCode(),
        ]);

        expect(firstCWCodeUI, `First CW code should match API`).toBe(firstCWCodeApi);
        await attachScreenshot(priceBoardPage.page, 'After check data tab CW');

        const [firstETFCodeUI, firstETFCodeApi] = await Promise.all([
            priceBoardPage.getFirstETFCodeUI(),
            marketApi.getFirstETFCode(),
        ]);
        expect(firstETFCodeUI, `First ETF code should match API`).toBe(firstETFCodeApi);
        await attachScreenshot(priceBoardPage.page, 'After check data tab ETF');

        // Check data tab derivatives
        await menu.openMenuHeader("Phái sinh");
        const firstDerivativeCodeApi = latestDvx.indexCode;
        const firstDerivativeCodeUI = (await priceBoardPage.getFirstDerivativeCode()).replace(/[^a-zA-Z0-9]/g, '');
        expect(firstDerivativeCodeUI, `First derivative code should match API`).toBe(firstDerivativeCodeApi);
        await attachScreenshot(priceBoardPage.page, 'After check data derivatives');
    });
});