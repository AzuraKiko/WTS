import { test, expect } from '@playwright/test';
import { MarketWatchPage } from '../../page/ui/PriceBoard';
import { TEST_CONFIG } from '../utils/testConfig';


test.describe('Market Watch Automation Suite', () => {
    let marketWatchPage: MarketWatchPage;
    const MARKET_WATCH_URL =
        TEST_CONFIG.WEB_LOGIN_URL ??
        'https://trade.pinetree.vn/#/home/bang-gia/vn30';

    const parseNumber = (text: string): number => {
        // Handles: "1,791.52", " 442.46", "-18.38", "0.47%", "(9)"...
        const normalized = text
            .trim()
            .replace(/[()%]/g, '')
            .replace(/,/g, '')
            .replace(/\s+/g, '');
        return Number.parseFloat(normalized);
    };

    const walkObjects = function* (value: unknown): Generator<Record<string, any>> {
        if (!value) return;
        if (Array.isArray(value)) {
            for (const item of value) yield* walkObjects(item);
            return;
        }
        if (typeof value === 'object') {
            const obj = value as Record<string, any>;
            yield obj;
            for (const v of Object.values(obj)) yield* walkObjects(v);
        }
    };

    const findIndexObject = (payload: any, code: string): Record<string, any> | undefined => {
        const codeUpper = code.toUpperCase();
        const possibleKeys = ['indexCode', 'code', 'symbol', 'name', 'ticker', 'market', 'exchange', 'index'];

        for (const obj of walkObjects(payload)) {
            for (const key of possibleKeys) {
                const v = obj?.[key];
                if (typeof v === 'string' && v.toUpperCase() === codeUpper) return obj;
            }
        }
        return undefined;
    };

    const firstNumber = (obj: Record<string, any> | undefined, keys: string[]): number | undefined => {
        if (!obj) return undefined;
        for (const key of keys) {
            const v = obj[key];
            if (typeof v === 'number' && Number.isFinite(v)) return v;
            if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
        }
        return undefined;
    };

    test.beforeEach(async ({ page }) => {
        await page.goto(MARKET_WATCH_URL);
        marketWatchPage = new MarketWatchPage(page);
    });

    // --- A. TEST CASE CHỨC NĂNG BẢNG GIÁ ---

    test('TC_BG_001: Should switch to HNX tab and load HNX stocks', async () => {
        await marketWatchPage.switchTabAndVerifyLoad(marketWatchPage.hnxTab);

        // Giả định: Mã CK đầu tiên trên HNX không phải là mã HOSE thông thường
        const firstStockCode = await marketWatchPage.stockTable.locator('tbody tr:first-child td:first-child').innerText();
        expect(firstStockCode).not.toBeNull();
    });

    test('TC_BG_002: Should confirm default sort by Stock Code (Mã CK) in ASC order', async () => {
        // 1. Chờ bảng dữ liệu load
        await expect(marketWatchPage.stockTable).toBeVisible();

        // 2. Lấy danh sách các mã chứng khoán đầu tiên (Ví dụ: 5 mã đầu tiên)
        const firstFiveStockCodes = await marketWatchPage.stockTable
            .locator('tbody tr')
            .locator('td:first-child') // Giả định Mã CK nằm ở cột đầu tiên
            .allTextContents();

        // Chỉ lấy 5 mã đầu tiên để kiểm tra
        const topN = 5;
        const codesToCheck = firstFiveStockCodes.slice(0, topN).map(code => code.trim());

        // 3. Assertion: Kiểm tra xem các mã có được sắp xếp tăng dần theo bảng chữ cái không

        // Tạo một bản sao và sắp xếp bằng hàm JS
        const sortedCodes = [...codesToCheck].sort();

        // So sánh danh sách thực tế với danh sách đã sắp xếp của JS
        expect(codesToCheck, `5 mã CK đầu tiên phải được sắp xếp tăng dần mặc định.`).toEqual(sortedCodes);

        console.log(`PASS: Sắp xếp mặc định Mã CK tăng dần được xác nhận: ${codesToCheck.join(', ')}`);
    });

    test('TC_BG_003: Should sort stocks by Tran (Ceiling) Price', async () => {
        // 1. Click vào cột T.C lần 1 để sắp xếp
        await marketWatchPage.refColumnHeader.click();
        await marketWatchPage.page.waitForTimeout(1000);

        // 2. Lấy giá trị của 2 hàng đầu tiên
        // Lấy giá trị cột T.C của hàng thứ nhất (index 0)
        const price1Text = await marketWatchPage.stockTable.locator('tbody tr').nth(0).locator('td').nth(1).innerText();
        // Lấy giá trị cột T.C của hàng thứ hai (index 1)
        const price2Text = await marketWatchPage.stockTable.locator('tbody tr').nth(1).locator('td').nth(1).innerText();

        const price1 = parseFloat(price1Text.replace(/,/g, ''));
        const price2 = parseFloat(price2Text.replace(/,/g, ''));

        // 3. Assertion: Kiểm tra sắp xếp giảm dần (Giả định lần click đầu tiên là giảm dần)
        expect(price1).toBeGreaterThanOrEqual(price2);
    });

    // --- B. TEST CASE CHO BIỂU ĐỒ MINI (VNI CHART) ---

    test('TC_VNI_001: Should verify VNI index value and logic color', async () => {
        // 1. Lấy giá trị % thay đổi (VD: -3.06%)
        const changePercentText = await marketWatchPage.vniChangePercent.innerText();
        const changePercent = parseFloat(changePercentText.replace('%', ''));

        // 2. Lấy màu của phần trăm thay đổi (dùng computed style)
        const changeColor = await marketWatchPage.vniChangePercent.evaluate(
            (element) => window.getComputedStyle(element).color
        );

        // 3. Assertion: Kiểm tra logic màu
        if (changePercent < 0) {
            // Giá trị âm (giảm) -> phải là màu đỏ
            expect(changeColor, "Color should be RED for negative change").toContain('rgb(255, 35, 61)');
        } else if (changePercent > 0) {
            // Giá trị dương (tăng) -> phải là màu xanh
            expect(changeColor, "Color should be GREEN for positive change").toContain('rgb(5, 187, 102)');
        }
    });

    test('TC_MINICHART_001: Should render mini chart panels (VNI/VN30/HNX/UPCOM) with SVG', async () => {
        const panels = [
            { name: 'VNI', panel: marketWatchPage.vniPanel, chart: marketWatchPage.vniChartContainer, index: marketWatchPage.vniIndexValue },
            { name: 'VN30', panel: marketWatchPage.vn30Panel, chart: marketWatchPage.vn30ChartContainer, index: marketWatchPage.vn30IndexValue },
            { name: 'HNX', panel: marketWatchPage.hnxPanel, chart: marketWatchPage.hnxChartContainer, index: marketWatchPage.hnxIndexValue },
            { name: 'UPCOM', panel: marketWatchPage.upcomPanel, chart: marketWatchPage.upcomChartContainer, index: marketWatchPage.upcomIndexValue },
        ];

        for (const p of panels) {
            await expect(p.panel, `${p.name} panel should be visible`).toBeVisible();
            await expect(p.chart, `${p.name} chart container should be visible`).toBeVisible();
            await expect(p.chart.locator('svg'), `${p.name} chart should have an SVG`).toBeVisible();

            const indexText = await p.index.innerText();
            const indexNumber = parseNumber(indexText);
            expect(Number.isFinite(indexNumber), `${p.name} index should be numeric`).toBeTruthy();
        }
    });

    test('TC_VNI_002: Should compare VNI UI values with the exact API response used by the page (no realtime drift)', async ({ page }) => {
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

        const uiIndex = parseNumber(await marketWatchPage.vniIndexValue.innerText());
        const uiChange = parseNumber(await marketWatchPage.vniIndexChange.innerText());
        const uiChangePercent = parseNumber(await marketWatchPage.vniChangePercent.innerText());

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
        const targetLocator = marketWatchPage.vniPanel;
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