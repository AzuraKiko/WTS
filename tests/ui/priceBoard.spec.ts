import { test, expect } from '@playwright/test';
import { PriceBoardPage } from '../../page/ui/PriceBoard';
import MarketApi from '../../page/api/MarketApi';
import { NumberValidator } from '../../helpers/validationUtils';

const parseNumber = (value: string): number => {
    return NumberValidator.parseNumber(value);
};

const formatVolumeValue = (value: number): number => {
    if (value < 1000) {
        return value;
    } else if (value >= 1000000000) { // Tỷ
        return Math.round((value / 1000000000) * 100) / 100;
    } else if (value >= 1000000) { // Triệu
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

    test.beforeEach(async ({ page }) => {
        priceBoardPage = new PriceBoardPage(page);
        marketApi = new MarketApi();
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


            for (const [key, uiValue] of Object.entries(ui)) {
                expect(uiValue, `${indexCode} ${key} should match API`).toBe(api[key as keyof typeof api]);
            }

            // 2. Lấy màu (dùng computed style)
            const indexColor = await priceBoardPage.page
                .locator('.market-panel', { hasText: indexCode })
                .locator('.market-panel-header__index')
                .evaluate((element) => window.getComputedStyle(element).color);

            // 3. Assertion: Kiểm tra logic màu
            if (ui.indexChange < 0) {
                // Giá trị âm (giảm) -> phải là màu đỏ
                expect(indexColor, "Color should be RED for negative change").toContain('rgb(255, 35, 61)');
            } else if (ui.indexChange > 0) {
                // Giá trị dương (tăng) -> phải là màu xanh
                expect(indexColor, "Color should be GREEN for positive change").toContain('rgb(0, 255, 87)');
            } else if (ui.indexChange === 0) {
                expect(indexColor, "Color should be YELLOW for zero change").toContain('rgb(255, 231, 11)');
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
        for (const [key, uiValue] of Object.entries(ui)) {
            expect(uiValue, `DVX ${key} should match API`).toBe(api[key as keyof typeof api]);
        }
        const indexColor = await priceBoardPage.page
            .locator('.market-panel', { hasText: `${indexCode}` })
            .locator('.market-panel-header__index')
            .evaluate((element) => window.getComputedStyle(element).color);
        if (ui.indexChange < 0) {
            expect(indexColor, "Color should be RED for negative change").toContain('rgb(255, 35, 61)');
        } else if (ui.indexChange > 0) {
            expect(indexColor, "Color should be GREEN for positive change").toContain('rgb(0, 255, 87)');
        } else if (ui.indexChange === 0) {
            expect(indexColor, "Color should be YELLOW for zero change").toContain('rgb(255, 231, 11)');
        }
    });

    test('TC_003: Should render mini chart panels (VNI/VN30/HNX/UPCOM/VN100/DVX) with SVG', async () => {
        const latestDvx = await marketApi.getLatestDvx();
        const indexCode = latestDvx.indexCode;
        const indexCodes = ['VNI', 'VN30', 'HNX', 'UPCOM', 'VN100', indexCode];

        for (const code of indexCodes) {
            const panel = priceBoardPage.page.locator('.market-panel', { hasText: code });
            const chart = panel.locator('.market-panel-chart');

            await expect(panel, `${code} panel should be visible`).toBeVisible();
            await expect(chart, `${code} chart container should be visible`).toBeVisible();
            await expect(chart.locator('svg'), `${code} chart should have an SVG`).toBeVisible();
        }
    });

    test.only('TC_004: Check trading view data for Mini Chart Panels', async () => {
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
            expect(uiIndexValue, `${code} index value should match API`).toBe(tradingViewIndexValue);
            const [valueOpen, valueHigh, valueLow] = [tradingViewData.valueOpen, tradingViewData.valueHigh, tradingViewData.valueLow];
            expect(valueOpen).toBeGreaterThan(0);
            expect(valueHigh).toBeGreaterThan(0);
            expect(valueLow).toBeGreaterThan(0);
            await priceBoardPage.closeTradingView();
        }
    });
});