import { test, expect } from '@playwright/test';
import { MarketWatchPage } from '../../page/ui/PriceBoard';

test.describe('Market Watch Automation Suite', () => {
    let marketWatchPage: MarketWatchPage;

    test.beforeEach(async ({ page }) => {
        // Sử dụng baseURL từ config
        await page.goto('/'); 
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
        // 1. Click vào cột T.C (Giá Trần) lần 1 để sắp xếp
        await marketWatchPage.tranColumnHeader.click();
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

    test('TC_VNI_002: Visual Regression Test for VNI Mini Chart Panel', async ({ page }) => {
        const targetLocator = marketWatchPage.vniPanel;
        await targetLocator.waitFor({ state: 'visible' });

        // Visual Test: Chụp ảnh toàn bộ panel VNI và so sánh với baseline.
        // Sử dụng mask để bỏ qua các vùng dữ liệu thay đổi liên tục (Real-time data).
        
        await expect(targetLocator).toHaveScreenshot('vni_mini_panel_snapshot.png', {
            maxDiffPixelRatio: 0.05, // Cho phép sai lệch 5% (do dữ liệu luôn thay đổi nhẹ)
            
            // Mask các khu vực số liệu khối lượng/giá trị có thể thay đổi
            mask: [
                page.locator('.market-panel-body'), // Khối lượng (919.27 Tr)
                page.locator('.highcharts-series-group') // Che đường giá chạy trong biểu đồ
            ],
        });
        
        console.log("PASS: Cấu trúc và màu sắc cơ bản của VNI Chart đã được xác nhận.");
    });
});