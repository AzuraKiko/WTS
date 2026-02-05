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
    if (await TimeUtils.checkDataWithExcludeTimeRange(new Date(), 8, 30, 15, 0)) {
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
    // --- TEST CASE CHO BIỂU ĐỒ MINI CHART ---

    // List of all available index codes to test
    // const indexCodes = Object.values(TEST_DATA.INDEX_CODES);
    const indexCodes = ['VNI', 'VN30', 'HNX', 'VN100'];


    for (const indexCode of indexCodes) {
        test(`TC_001: Check index value and logic color for ${indexCode}`, async () => {

            const [indexPanelData, indexDataApi] = await Promise.all([
                priceBoardPage.getIndexPanelData(indexCode),
                marketApi.getListIndexDetail(indexCode),
            ]);

            const ui = buildIndexUiData(indexPanelData);
            const api = buildIndexApiData(indexDataApi);

            await assertMatchOrPositive(
                indexCode,
                ui,
                api,
                `${indexCode} index value should be greater than 0`
            );

            // 2. Lấy màu (dùng computed style)
            const indexColor = await priceBoardPage.page
                .locator('.market-panel', { hasText: indexCode })
                .locator('.market-panel-header__index')
                .evaluate((element) => window.getComputedStyle(element).color);

            // 3. Assertion: Kiểm tra logic màu
            assertIndexColorByChange(indexColor, ui.indexChange);
        });
    }

    test(`TC_002: Check index value and logic color for DVX`, async () => {
        const latestDvx = await marketApi.getLatestDvx();
        const indexCode = latestDvx.indexCode;
        const [indexPanelData, indexDataApi] = await Promise.all([
            priceBoardPage.getIndexPanelData(indexCode),
            marketApi.getLatestDvx(),
        ]);
        const ui = buildIndexUiData(indexPanelData);
        const api = buildIndexApiData(indexDataApi, { valueValueDivisor: 10 });

        await assertMatchOrPositive(
            'DVX',
            ui,
            api,
            'DVX index value should be greater than 0'
        );

        const indexColor = await priceBoardPage.page
            .locator('.market-panel', { hasText: `${indexCode}` })
            .locator('.market-panel-header__index')
            .evaluate((element) => window.getComputedStyle(element).color);
        assertIndexColorByChange(indexColor, ui.indexChange);
    });

    test('TC_003: Check render mini chart panels (VNI/VN30/HNX/UPCOM/VN100/DVX) with SVG', async () => {
        const latestDvx = await marketApi.getLatestDvx();
        const indexCode = latestDvx.indexCode;
        const indexCodes = Object.values(TEST_DATA.INDEX_CODES).concat(indexCode);

        if (await TimeUtils.checkDataWithExcludeTimeRange(new Date(), 8, 30, 9, 0)) {
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
    });

    test('TC_004: Check trading view data for Mini Chart Panels', async () => {
        const latestDvx = await marketApi.getLatestDvx();
        const indexCode = latestDvx.indexCode;
        const indexCodes = Object.values(TEST_DATA.INDEX_CODES).concat(indexCode);
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
    });

    test('TC_005: Check overview data', async () => {
        const [overviewData, overviewDataApi] = await Promise.all([
            priceBoardPage.getOverviewData(),
            marketApi.getOverViewlData(),
        ]);
        if (!overviewData || !Object.values(overviewData).some((value) => /\d/.test(value))) {
            console.log('Overview data is not available');
            return;
        }

        const { matched, ui, api } = await retryCompareData(async () => {
            return {
                ui: {
                    // totalVolume: parseNumberWithUnit(overviewData.totalVolume),
                    totalValue: parseNumberWithUnit(overviewData.totalValue),
                    roomNN: parseNumberWithUnit(overviewData.roomNN),
                },
                api: {
                    // totalVolume: formatVolumeValue(overviewDataApi.totalVolume),
                    totalValue: formatValueValue(overviewDataApi.totalValue),
                    roomNN: Math.round(formatVolumeValue(overviewDataApi.roomNN)),
                }
            };

        });


    });

    test('TC_006: Check global data', async () => {
        const globalIndexNames = Object.values(TEST_DATA.Global_INDEX_CODES);
        if (await priceBoardPage.isGlobalNoData()) {
            console.log('Global data is not available');
            return;
        }

        for (const globalIndexName of globalIndexNames) {
            const globalDataApi = await marketGatewayApi.getGlobalDataByName(globalIndexName);
            if (globalDataApi == null) {
                console.warn(`Global index "${globalIndexName}" not found or API returned empty, skipping`);
                continue;
            }

            const { matched, ui, api } = await retryCompareData(async () => {
                const globalData = await priceBoardPage.getGlobalDataByLabel(globalIndexName);
                return {
                    ui: {
                        indexValue: parseNumber(globalData.indexValue),
                        indexChange: parseNumber(globalData.indexChange),
                        indexChangePercent: parseNumber(globalData.indexChangePercent),
                    },
                    api: {
                        indexValue: parseNumber(String(globalDataApi.indexValue)),
                        indexChange: parseNumber(String(globalDataApi.indexChange)),
                        indexChangePercent: parseNumber(String(globalDataApi.indexChangePercent)),
                    },
                };
            });

            assertMatchedOrPositive(
                matched,
                ui,
                api,
                `Global ${globalIndexName}`,
                ui.indexValue,
                `Global ${globalIndexName} index value should be greater than 0`
            );
        }
    });

    test('TC_007: Check commodity data', async () => {
        const commodityNames = Object.values(TEST_DATA.COMMODITY_CODES);
        if (await priceBoardPage.isCommodityNoData()) {
            console.log('Commodity data is not available');
            return;
        }

        for (const commodityName of commodityNames) {
            const commodityDataApi = await marketWapiApi.getCommodityDataByName(commodityName);
            if (commodityDataApi == null) {
                console.warn(`Commodity "${commodityName}" not found or API returned empty, skipping`);
                continue;
            }

            const { matched, ui, api } = await retryCompareData(async () => {
                const commodityData = await priceBoardPage.getCommodityDataByLabel(commodityName);
                return {
                    ui: {
                        commodityValue: parseNumber(commodityData.indexValue),
                        commodityChange: parseNumber(commodityData.indexChange),
                        commodityChangePercent: parseNumber(commodityData.indexChangePercent),
                    },
                    api: {
                        commodityValue: NumberValidator.formatNumberRound(commodityDataApi.indexValue),
                        commodityChange: NumberValidator.formatNumberRound(commodityDataApi.indexChange),
                        commodityChangePercent: NumberValidator.formatNumberRound(commodityDataApi.indexChangePercent),
                    },
                };
            });

            assertMatchedOrPositive(
                matched,
                ui,
                api,
                `Commodity ${commodityName}`,
                ui.commodityValue,
                `Commodity ${commodityName} commodity value should be greater than 0`
            );
        }
    });

    // --- TEST CASE CHỨC NĂNG BẢNG GIÁ  ---
    test('TC_008: Check data tab HSX, HNX, UPCOM, Lô lẻ (HSX), Lô lẻ (HNX), Lô lẻ (UPCOM)', async () => {
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
    });

    test('TC_009: Check data tab CW, ETF', async () => {
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
    });

    test('TC_010: Check default sort by Stock Code (Mã CK) in ASC order', async () => {
        await expect(priceBoardPage.stockTable).toBeVisible();

        // 2. Lấy danh sách các mã chứng khoán đầu tiên (Ví dụ: 5 mã đầu tiên)
        const firstFiveStockCodes = await priceBoardPage.stockTable
            .locator('tbody tr')
            .locator('td:first-child') // Giả định Mã CK nằm ở cột đầu tiên
            .allTextContents();

        // Chỉ lấy 5 mã đầu tiên để kiểm tra
        const topN = 5;
        const codesToCheck = firstFiveStockCodes.slice(0, topN).map(code => code.trim());
        console.log("check codes to check", codesToCheck);

        // Tạo một bản sao và sắp xếp bằng hàm JS
        const sortedCodes = [...codesToCheck].sort();

        // So sánh danh sách thực tế với danh sách đã sắp xếp của JS
        expect(codesToCheck, `5 mã CK đầu tiên phải được sắp xếp tăng dần mặc định.`).toEqual(sortedCodes);

        console.log(`PASS: Sắp xếp mặc định Mã CK tăng dần được xác nhận: ${codesToCheck.join(', ')}`);
        await attachScreenshot(priceBoardPage.page, 'After check default sort by Stock Code (Mã CK) in ASC order');
    });


    test('TC_011: Check sort stocks by Reference Price (T.C) in DESC order', async () => {
        // 1. Click vào cột T.C lần 1 để sắp xếp
        await priceBoardPage.refColumnHeader.click();
        await priceBoardPage.page.waitForTimeout(1000);

        // Lấy giá trị cột T.C của hàng thứ nhất (index 0)
        const price1Text = await priceBoardPage.stockTable.locator('tbody tr').nth(0).locator('td').nth(1).innerText();
        // Lấy giá trị cột T.C của hàng thứ hai (index 1)
        const price2Text = await priceBoardPage.stockTable.locator('tbody tr').nth(1).locator('td').nth(1).innerText();

        const price1 = parseFloat(price1Text.replace(/,/g, ''));
        const price2 = parseFloat(price2Text.replace(/,/g, ''));
        console.log("check price1", price1);
        console.log("check price2", price2);

        expect(price1).toBeGreaterThanOrEqual(price2);
        await attachScreenshot(priceBoardPage.page, 'After sort stocks by Reference Price (T.C) in DESC order');
    });

    test('TC_012: Check data derivatives', async () => {
        await menu.openMenuHeader("Phái sinh");
        const latestDvx = await marketApi.getLatestDvx();
        const firstDerivativeCodeApi = latestDvx.indexCode;
        const firstDerivativeCodeUI = await priceBoardPage.getFirstDerivativeCode();
        expect(firstDerivativeCodeUI, `First derivative code should match API`).toBe(firstDerivativeCodeApi);
        await attachScreenshot(priceBoardPage.page, 'After check data derivatives');

    });
});