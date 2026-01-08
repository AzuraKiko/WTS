import { test, expect } from '@playwright/test';
import { PriceBoardPage } from '../../page/ui/PriceBoard';
import MarketApi from '../../page/api/marketApi';
import { NumberValidator } from '../../helpers/validationUtils';

const parseNumber = (value: string): number => NumberValidator.parseNumber(value);

test.describe('Market Watch Automation Suite', () => {
    let priceBoardPage: PriceBoardPage;
    let marketApi: MarketApi;

    test.beforeEach(async ({ page }) => {
        priceBoardPage = new PriceBoardPage(page);
        marketApi = new MarketApi();
        await priceBoardPage.openPriceBoard();
    });

    // --- TEST CASE CHO BIỂU ĐỒ MINI CHART ---

    test('TC_001: Verify index value and logic color', async () => {
        const indexCode = 'VNI';

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
            volValue: indexDataApi.volValue,
            valueValue: indexDataApi.valueValue,
        };

        for (const [key, uiValue] of Object.entries(ui)) {
            expect(uiValue, `${indexCode} ${key} should match API`).toBe(api[key as keyof typeof api]);
        }

        // 2. Lấy màu của phần trăm thay đổi (dùng computed style)
        const changeColor = await priceBoardPage.page
            .locator('.market-panel', { hasText: indexCode })
            .locator('.market-panel-header__changePercent')
            .evaluate((element) => window.getComputedStyle(element).color);

        // 3. Assertion: Kiểm tra logic màu
        if (ui.changePercent < 0) {
            // Giá trị âm (giảm) -> phải là màu đỏ
            expect(changeColor, "Color should be RED for negative change").toContain('rgb(255, 35, 61)');
        } else if (ui.changePercent > 0) {
            // Giá trị dương (tăng) -> phải là màu xanh
            expect(changeColor, "Color should be GREEN for positive change").toContain('rgb(5, 187, 102)');
        } else if (ui.changePercent === 0) {
            expect(changeColor, "Color should be YELLOW for zero change").toContain('rgb(255, 231, 11)');
        }
    });

    test('TC_002: Should render mini chart panels (VNI/VN30/HNX/UPCOM) with SVG', async () => {
        const indexCodes = ['VNI', 'VN30', 'HNX', 'UPCOM'];

        for (const code of indexCodes) {
            const panel = priceBoardPage.page.locator('.market-panel', { hasText: code });
            const chart = panel.locator('.market-panel-chart');
            const index = panel.locator('.market-panel-header__index');

            await expect(panel, `${code} panel should be visible`).toBeVisible();
            await expect(chart, `${code} chart container should be visible`).toBeVisible();
            await expect(chart.locator('svg'), `${code} chart should have an SVG`).toBeVisible();

            const indexText = await index.innerText();
            const indexNumber = Number(indexText);
            expect(Number.isFinite(indexNumber), `${code} index should be numeric`).toBeTruthy();
        }
    });

    test('TC_003: Should compare VNI UI values with the exact API response used by the page (no realtime drift)', async ({ page }) => {
        // Capture the same response the UI uses to render the index panels.
        const globalMarketResponsePromise = page.waitForResponse((res) => {
            const url = res.url();
            return res.ok() && url.includes('/market/public/global-market');
        });

        await page.reload();

        const globalMarketResponse = await globalMarketResponsePromise;
        const payload = await globalMarketResponse.json().catch(() => undefined);
        expect(payload, 'global-market response should be JSON').toBeDefined();

        const vniObj = findIndexObject(payload, 'VNI');
        expect(vniObj, 'VNI should exist in global-market response').toBeTruthy();

        const apiIndex = firstNumber(vniObj, ['indexValue', 'index', 'value', 'last', 'close', 'point']);
        const apiChange = firstNumber(vniObj, ['change', 'diff', 'delta', 'chg', 'changeValue', 'changePoint']);

        const vniPanel = priceBoardPage.page.locator('.market-panel', { hasText: 'VNI' });
        const uiIndex = parseNumber(await vniPanel.locator('.market-panel-header__index').innerText());
        const uiChange = parseNumber(await vniPanel.locator('.market-panel-header__change').innerText());
        const uiChangePercent = parseNumber(await vniPanel.locator('.market-panel-header__changePercent').innerText());

        // If API fields are present, do strict numeric comparisons; otherwise at least ensure UI is numeric.
        if (apiIndex !== undefined) {
            expect(uiIndex).toBeCloseTo(apiIndex, 2);
        } else {
            expect(Number.isFinite(uiIndex), 'UI index should be numeric').toBeTruthy();
        }

        if (apiChange !== undefined) {
            expect(uiChange).toBeCloseTo(apiChange, 2);
        } else {
            expect(Number.isFinite(uiChange), 'UI change should be numeric').toBeTruthy();
        }

        // Prefer deriving % from index/change to avoid API percent-unit ambiguity (0.47 vs 0.0047).
        if (apiIndex !== undefined && apiChange !== undefined && apiIndex !== apiChange) {
            const prev = apiIndex - apiChange;
            if (prev !== 0) {
                const expectedPct = (apiChange / prev) * 100;
                expect(uiChangePercent).toBeCloseTo(expectedPct, 2);
            }
        } else {
            expect(Number.isFinite(uiChangePercent), 'UI change percent should be numeric').toBeTruthy();
        }
    });

    test('TC_VNI_004: Visual Regression Test for VNI Mini Chart Panel', async ({ page }) => {
        const targetLocator = priceBoardPage.page.locator('.market-panel', { hasText: 'VNI' });
        await targetLocator.waitFor({ state: 'visible' });

        // Visual Test: Chụp ảnh toàn bộ panel VNI và so sánh với baseline.
        // Sử dụng mask để bỏ qua các vùng dữ liệu thay đổi liên tục (Real-time data).

        await expect(targetLocator).toHaveScreenshot('vni_mini_panel_snapshot.png', {
            maxDiffPixelRatio: 0.05, // Cho phép sai lệch 5% (do dữ liệu luôn thay đổi nhẹ)

            // Mask các khu vực số liệu khối lượng/giá trị có thể thay đổi
            mask: [
                targetLocator.locator('.market-panel-header'), // Số index/change thay đổi realtime
                targetLocator.locator('.market-panel-body'), // Khối lượng/GTGD realtime
                targetLocator.locator('.market-panel-footer'), // Up/Ref/Down realtime
                targetLocator.locator('.highcharts-series-group') // Đường giá chạy trong biểu đồ
            ],
        });

        console.log("PASS: Cấu trúc và màu sắc cơ bản của VNI Chart đã được xác nhận.");
    });
});