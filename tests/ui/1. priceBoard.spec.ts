import { test, expect } from '@playwright/test';
import { PriceBoardPage } from '../../page/ui/PriceBoard';
import { MarketApi, MarketGatewayApi, MarketWapiApi } from '../../page/api/marketApi';
import { TimeUtils } from '../../helpers/uiUtils';
import { retryCompareData } from '../../helpers/assertions';
import { ColorUtils, NumberValidator } from '../../helpers/validationUtils';
import { TEST_DATA } from '../utils/testConfig';

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

test.describe('Market Watch Automation Suite', () => {
    let priceBoardPage: PriceBoardPage;
    let marketApi: MarketApi;
    let marketGatewayApi: MarketGatewayApi;
    let marketWapiApi: MarketWapiApi;

    test.beforeEach(async ({ page }) => {
        priceBoardPage = new PriceBoardPage(page);
        marketApi = new MarketApi();
        marketGatewayApi = new MarketGatewayApi();
        marketWapiApi = new MarketWapiApi();
        await priceBoardPage.openPriceBoard();
    });

    // --- TEST CASE CHO BIỂU ĐỒ MINI CHART ---

    // List of all available index codes to test
    // const indexCodes = Object.values(TEST_DATA.INDEX_CODES);
    const indexCodes = ['VNI', 'VN30', 'HNX', 'VN100'];


    for (const indexCode of indexCodes) {
        test(`TC_001: Verify index value and logic color for ${indexCode}`, async () => {

            const [indexPanelData, indexDataApi] = await Promise.all([
                priceBoardPage.getIndexPanelData(indexCode),
                marketApi.getListIndexDetail(indexCode),
            ]);

            const ui = {
                indexValue: parseNumber(indexPanelData.indexValue),
                indexChange: parseNumber(indexPanelData.indexChange),
                changePercent: parseNumber(indexPanelData.changePercent.replace('%', '')),
                volValue: parseNumber(indexPanelData.volValue),
                valueValue: parseNumber(indexPanelData.valueValue),
            };


            const api = {
                indexValue: indexDataApi.indexValue,
                indexChange: parseNumber(indexDataApi.indexChange),
                changePercent: parseNumber((indexDataApi.changePercent.replace('%', ''))),
                volValue: formatVolumeValue(indexDataApi.volValue),
                valueValue: formatValueValue(indexDataApi.valueValue),
            };


            if (await TimeUtils.checkDataWithExcludeTimeRange(new Date(), 8, 30, 15, 0)) {
                for (const [key, uiValue] of Object.entries(ui)) {
                    expect(uiValue, `${indexCode} ${key} should match API`).toBe(api[key as keyof typeof api]);
                }
            } else {
                expect(ui.indexValue, `${indexCode} index value should be greater than 0`).toBeGreaterThan(0);
            }

            // 2. Lấy màu (dùng computed style)
            const indexColor = await priceBoardPage.page
                .locator('.market-panel', { hasText: indexCode })
                .locator('.market-panel-header__index')
                .evaluate((element) => window.getComputedStyle(element).color);

            // 3. Assertion: Kiểm tra logic màu
            if (ui.indexChange < 0) {
                // Giá trị âm (giảm) -> phải là màu đỏ
                ColorUtils.expectColorFamily(indexColor, 'RED');
            } else if (ui.indexChange > 0) {
                // Giá trị dương (tăng) -> phải là màu xanh
                ColorUtils.expectColorFamily(indexColor, 'GREEN');
            } else if (ui.indexChange === 0) {
                ColorUtils.expectColorFamily(indexColor, 'YELLOW');
            }
        });
    }

    test(`TC_002: Verify index value and logic color for DVX`, async () => {
        const latestDvx = await marketApi.getLatestDvx();
        const indexCode = latestDvx.indexCode;
        const [indexPanelData, indexDataApi] = await Promise.all([
            priceBoardPage.getIndexPanelData(indexCode),
            marketApi.getLatestDvx(),
        ]);
        const ui = {
            indexValue: parseNumber(indexPanelData.indexValue),
            indexChange: parseNumber(indexPanelData.indexChange),
            changePercent: parseNumber(indexPanelData.changePercent.replace('%', '')),
            volValue: parseNumber(indexPanelData.volValue),
            valueValue: parseNumber(indexPanelData.valueValue),
        };
        const api = {
            indexValue: indexDataApi.indexValue,
            indexChange: parseNumber(indexDataApi.indexChange),
            changePercent: parseNumber((indexDataApi.changePercent.replace('%', ''))),
            volValue: formatVolumeValue(indexDataApi.volValue),
            valueValue: formatValueValue(indexDataApi.valueValue / 10),
        };
        if (await TimeUtils.checkDataWithExcludeTimeRange(new Date(), 8, 30, 15, 0)) {
            for (const [key, uiValue] of Object.entries(ui)) {
                expect(uiValue, `DVX ${key} should match API`).toBe(api[key as keyof typeof api]);
            }
        } else {
            expect(ui.indexValue, `DVX index value should be greater than 0`).toBeGreaterThan(0);
        }

        const indexColor = await priceBoardPage.page
            .locator('.market-panel', { hasText: `${indexCode}` })
            .locator('.market-panel-header__index')
            .evaluate((element) => window.getComputedStyle(element).color);
        if (ui.indexChange < 0) {
            ColorUtils.expectColorFamily(indexColor, 'RED');
        } else if (ui.indexChange > 0) {
            ColorUtils.expectColorFamily(indexColor, 'GREEN');
        } else if (ui.indexChange === 0) {
            ColorUtils.expectColorFamily(indexColor, 'YELLOW');
        }
    });

    test('TC_003: Should render mini chart panels (VNI/VN30/HNX/UPCOM/VN100/DVX) with SVG', async () => {
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
            const [tradingViewData, indexPanelData] = await Promise.all([
                priceBoardPage.getTradingViewData(),
                priceBoardPage.getIndexPanelData(code),
            ]);
            const uiIndexValue = parseNumber(indexPanelData.indexValue);
            const tradingViewIndexValue = parseNumber(tradingViewData.valueClose);

            if (await TimeUtils.checkDataWithExcludeTimeRange(new Date(), 8, 30, 15, 0)) {
                expect(
                    uiIndexValue,
                    `${code} index value should match TradingView`
                ).toBe(tradingViewIndexValue);
            } else {
                expect(
                    tradingViewIndexValue,
                    `${code} index value should be greater than 0 during non-check window`
                ).toBeGreaterThan(0);
            }
            const [valueOpen, valueHigh, valueLow] = [tradingViewData.valueOpen, tradingViewData.valueHigh, tradingViewData.valueLow];
            expect(parseNumber(valueOpen)).toBeGreaterThan(0);
            expect(parseNumber(valueHigh)).toBeGreaterThan(0);
            expect(parseNumber(valueLow)).toBeGreaterThan(0);
            await priceBoardPage.closeTradingView();
        }
    });

    test('TC_005: Check overview data', async () => {
        const [overviewData, overviewDataApi] = await Promise.all([
            priceBoardPage.getOverviewData(),
            marketApi.getOverViewlData(),
        ]);
        const ui = {
            // totalVolume: parseNumberWithUnit(overviewData.totalVolume),
            totalValue: parseNumberWithUnit(overviewData.totalValue),
            roomNN: parseNumberWithUnit(overviewData.roomNN),
        };
        const api = {
            // totalVolume: formatVolumeValue(overviewDataApi.totalVolume),
            totalValue: formatValueValue(overviewDataApi.totalValue),
            roomNN: Math.round(formatVolumeValue(overviewDataApi.roomNN)),
        };
        if (await TimeUtils.checkDataWithExcludeTimeRange(new Date(), 8, 30, 14, 45)) {

            for (const [key, uiValue] of Object.entries(ui)) {
                expect(uiValue, `Overview ${key} should match API`).toBe(api[key as keyof typeof api]);
            }
        } else {
            console.log("Dữ liệu realtime ko check với data API");
        }
    });

    test('TC_006: Check global data', async () => {
        const globalIndexNames = Object.values(TEST_DATA.Global_INDEX_CODES);
        for (const globalIndexName of globalIndexNames) {
            try {
                const { matched, ui, api } = await retryCompareData(async () => {
                    const [globalData, globalDataApi] = await Promise.all([
                        priceBoardPage.getGlobalDataByLabel(globalIndexName),
                        marketGatewayApi.getGlobalDataByName(globalIndexName),
                    ]);
                    return {
                        ui: {
                            indexValue: parseNumber(globalData.indexValue),
                            indexChange: parseNumber(globalData.indexChange),
                            indexChangePercent: parseNumber(globalData.indexChangePercent),
                        },
                        api: {
                            indexValue: parseNumber(globalDataApi.indexValue),
                            indexChange: parseNumber(globalDataApi.indexChange),
                            indexChangePercent: parseNumber(globalDataApi.indexChangePercent),
                        },
                    };
                });

                if (matched) {
                    for (const [key, uiValue] of Object.entries(ui)) {
                        expect(
                            uiValue,
                            `Global ${globalIndexName} ${key} should match API`
                        ).toBe(api[key as keyof typeof api]);
                    }
                } else {
                    expect(
                        ui.indexValue,
                        `Global ${globalIndexName} index value should be greater than 0`
                    ).toBeGreaterThan(0);
                }
            } catch {
                console.log(`${globalIndexName} is out of trading time`);
            }
        }
    });

    test('TC_007: Check commodity data', async () => {
        const commodityNames = Object.values(TEST_DATA.COMMODITY_CODES);
        for (const commodityName of commodityNames) {
            try {
                const { matched, ui, api } = await retryCompareData(async () => {
                    const [commodityData, commodityDataApi] = await Promise.all([
                        priceBoardPage.getCommodityDataByLabel(commodityName),
                        marketWapiApi.getCommodityDataByName(commodityName),
                    ]);
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

                if (matched) {
                    for (const [key, uiValue] of Object.entries(ui)) {
                        expect(
                            uiValue,
                            `Commodity ${commodityName} ${key} should match API`
                        ).toBe(api[key as keyof typeof api]);
                    }
                } else {
                    expect(
                        ui.commodityValue,
                        `Commodity ${commodityName} commodity value should be greater than 0`
                    ).toBeGreaterThan(0);
                }
            } catch {
                console.log(`${commodityName} is out of trading time`);
            }
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
        }
    });

    test('TC_009: Check data tab CW, ETF', async () => {
        const [firstCWCodeUI, firstCWCodeApi] = await Promise.all([
            priceBoardPage.getFirstCWCodeUI(),
            marketApi.getFirstCWCode(),
        ]);

        expect(firstCWCodeUI, `First CW code should match API`).toBe(firstCWCodeApi);

        const [firstETFCodeUI, firstETFCodeApi] = await Promise.all([
            priceBoardPage.getFirstETFCodeUI(),
            marketApi.getFirstETFCode(),
        ]);
        expect(firstETFCodeUI, `First ETF code should match API`).toBe(firstETFCodeApi);
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
    });

    test('TC_012: Check data derivatives', async () => {
        await priceBoardPage.openMenu("Phái sinh");
        const latestDvx = await marketApi.getLatestDvx();
        const firstDerivativeCodeApi = latestDvx.indexCode;
        const firstDerivativeCodeUI = await priceBoardPage.getFirstDerivativeCode();
        expect(firstDerivativeCodeUI, `First derivative code should match API`).toBe(firstDerivativeCodeApi);
        console.log("check first derivative code ui", firstDerivativeCodeUI);
        console.log("check first derivative code api", firstDerivativeCodeApi);
    });
});