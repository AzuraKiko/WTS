import { test, expect } from '@playwright/test';
import LoginPage from '../../page/ui/LoginPage';
import TranferStockPage from '../../page/ui/TranferStock';
import { TEST_CONFIG } from '../utils/testConfig';
import { attachScreenshot } from '../../helpers/reporterHelper';
import { NumberValidator, StockCodeValidator } from '../../helpers/validationUtils';
import { getSharedLoginSession } from "../api/sharedSession";

test.describe('Transfer Stock Tests', () => {
    let loginPage: LoginPage;
    let transferStockPage: TranferStockPage;
    let availableSubAccounts: string[] = [];

    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        transferStockPage = new TranferStockPage(page);
        const loginData = await getSharedLoginSession();
        const { subAcntNormal, subAcntMargin, subAcntDerivative, subAcntFolio } = loginData;
        availableSubAccounts = [subAcntNormal, subAcntMargin, subAcntDerivative, subAcntFolio]
            .filter((subAcntNo): subAcntNo is string => Boolean(subAcntNo && subAcntNo.trim() !== ""));

        // Login before each test
        await loginPage.loginSuccess();
        expect(await loginPage.verifyLoginSuccess(TEST_CONFIG.TEST_USER)).toBeTruthy();
        await attachScreenshot(page, 'After Login');

    });

    test('TS_001: Verify transfer stock page data', async ({ page }) => {

        await transferStockPage.navigateToTransferStock();

        const title = await transferStockPage.getTitle();
        expect(title).toContain('Chuyển cổ phiếu');

        const [sourceAccount, destinationAccount] = await Promise.all([
            transferStockPage.getSourceAccountValue(),
            transferStockPage.getDestinationAccountValue(),
        ]);

        const sourceSubAccountNo = sourceAccount.split('-')[0].trim();
        const destinationSubAccountNo = destinationAccount.split('-')[0].trim();

        expect(availableSubAccounts).toContain(sourceSubAccountNo);
        expect(availableSubAccounts).toContain(destinationSubAccountNo);

        const [sourceStats, destinationStats] = await Promise.all([
            transferStockPage.getSourceHoldingStats(),
            transferStockPage.getDestinationHoldingStats(),
        ]);

        expect(NumberValidator.parseNumber(sourceStats.stockCount)).toBeGreaterThanOrEqual(0);
        expect(NumberValidator.parseNumber(sourceStats.totalQty)).toBeGreaterThanOrEqual(0);
        expect(NumberValidator.parseNumber(destinationStats.stockCount)).toBeGreaterThanOrEqual(0);
        expect(NumberValidator.parseNumber(destinationStats.totalQty)).toBeGreaterThanOrEqual(0);

        const rowCount = await transferStockPage.getSourceRowCount();
        if (rowCount > 0) {
            const row = await transferStockPage.getSourceRowData(0);
            expect(StockCodeValidator.validate(row.stockCode).isValid).toBeTruthy();
            expect(NumberValidator.parseNumber(row.holdingQty)).toBeGreaterThanOrEqual(0);
            const maxQty = NumberValidator.parseNumber(row.maxQty);
            expect(maxQty).toBeGreaterThanOrEqual(0);

            if (maxQty > 0) {
                await transferStockPage.selectSourceRow(0);
                await transferStockPage.fillTransferQuantity(0, Math.min(1, maxQty));
            }
        } else {
            console.log('No data in source stock table');
        }

        const headers = await transferStockPage.getHistoryTableHeaders();
        const expectedHeaders = ['Nguồn', 'Đích', 'Mã CK', 'KL', 'Mô tả', 'Trạng thái', 'Ngày tạo'];
        for (const header of expectedHeaders) {
            expect(headers).toContain(header);
        }

        const historyRowCount = await transferStockPage.getHistoryRowCount();
        if (historyRowCount > 0) {
            const historyRow = await transferStockPage.getHistoryRowData(0);
            expect(historyRow.source).not.toBe('');
            expect(historyRow.destination).not.toBe('');
            expect(StockCodeValidator.validate(historyRow.stockCode).isValid).toBeTruthy();
            expect(NumberValidator.parseNumber(historyRow.quantity)).toBeGreaterThanOrEqual(0);
            expect(historyRow.status).not.toBe('');
            expect(historyRow.createdDate).not.toBe('');
        } else {
            console.log('No data in history table');
        }

        await attachScreenshot(page, 'Transfer Stock Page');
    });
});
