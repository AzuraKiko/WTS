import { test, expect } from '@playwright/test';
import { PriceBoardPage } from '../../page/ui/PriceBoard';
import { MarketApi, MarketGatewayApi } from '../../page/api/MarketApi';
import { NumberValidator } from '../../helpers/validationUtils';
import { TimeUtils } from '../../helpers/uiUtils';
import { ColorUtils } from '../../helpers/validationUtils';

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

    test.beforeEach(async ({ page }) => {
        priceBoardPage = new PriceBoardPage(page);
        marketApi = new MarketApi();
        marketGatewayApi = new MarketGatewayApi();
        await priceBoardPage.openPriceBoard();
    });

    // --- TEST CASE CHO BIỂU ĐỒ MINI CHART ---

    // List of all available index codes to test
    const indexCodes = ['VNI', 'VN30', 'HNX', 'UPCOM', 'VN100'];

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


            if (await TimeUtils.checkDataWithTimeRule(new Date(), 8, 30, 15, 0)) {
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
        if (await TimeUtils.checkDataWithTimeRule(new Date(), 8, 30, 15, 0)) {
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
        const indexCodes = ['VNI', 'VN30', 'HNX', 'UPCOM', 'VN100', indexCode];

        if (await TimeUtils.checkDataWithTimeRule(new Date(), 8, 30, 9, 0)) {
            for (const code of indexCodes) {
                const panel = priceBoardPage.page.locator('.market-panel', { hasText: code });
                const chart = panel.locator('.market-panel-chart');

                await expect(panel, `${code} panel should be visible`).toBeVisible();
                await expect(chart, `${code} chart container should be visible`).toBeVisible();
                await expect(chart.locator('svg'), `${code} chart should have an SVG`).toBeVisible();
            }
        } else {
            console.log("Hiện tại là thời gian reset data đầu ngày");
        }
    });

    test('TC_004: Check trading view data for Mini Chart Panels', async () => {
        const latestDvx = await marketApi.getLatestDvx();
        const indexCode = latestDvx.indexCode;
        const indexCodes = ['VNI', 'VN30', 'HNX', 'UPCOM', 'VN100', indexCode];
        for (const code of indexCodes) {
            await priceBoardPage.openTradingView(code);
            const [tradingViewData, indexPanelData] = await Promise.all([
                priceBoardPage.getTradingViewData(),
                priceBoardPage.getIndexPanelData(code),
            ]);
            const uiIndexValue = parseNumber(indexPanelData.indexValue);
            const tradingViewIndexValue = parseNumber(tradingViewData.valueClose);

            if (await TimeUtils.checkDataWithTimeRule(new Date(), 8, 30, 15, 0)) {
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
        if (await TimeUtils.checkDataWithTimeRule(new Date(), 8, 30, 14, 45)) {

            for (const [key, uiValue] of Object.entries(ui)) {
                expect(uiValue, `Overview ${key} should match API`).toBe(api[key as keyof typeof api]);
            }
        } else {
            console.log("Hiện tại là thời gian reset data đầu ngày");
        }
    });

    test('TC_006: Check global data', async () => {
        const indexNames = ['Dow Jones', 'S&P 500', 'Nasdaq', 'Hang Seng', 'Nikkei', 'FTSE', 'CAC40', 'DAX', 'IBEX35', 'PSI20', 'AEX', 'OMX'];
        if (await TimeUtils.checkDataWithTimeRule(new Date(), 8, 30, 14, 45)) {
            for (const indexName of indexNames) {
                const [ui, api] = await Promise.all([
                    priceBoardPage.getGlobalDataByLabel(indexName),
                    marketGatewayApi.getGlobalDataByName(indexName),
                ]);
                for (const [key, uiValue] of Object.entries(ui)) {
                    expect(uiValue, `Global ${indexName} ${key} should match API`).toBe(api[key as keyof typeof api]);
                }
            }
        } else {
            console.log("Hiện tại là thời gian reset data đầu ngày");
        }
    });
});