import { test, expect } from '@playwright/test';
import LoginPage from '../../page/ui/LoginPage';
import TranferStockPage from '../../page/ui/TranferStock';
import { TEST_CONFIG } from '../utils/testConfig';
import { attachScreenshot } from '../../helpers/reporterHelper';
import { NumberValidator } from '../../helpers/validationUtils';
import { getSharedLoginSession } from "../api/sharedSession";
import OrderPage from '../../page/ui/OrderPage';
import { v4 as uuidv4 } from 'uuid';
import { WaitUtils } from '../../helpers/uiUtils';
import { getAvailStockList, getStockTransferHist } from '../../page/api/AssetApi';


test.describe('Transfer Stock Tests', () => {
    let loginPage: LoginPage;
    let transferStockPage: TranferStockPage;
    let orderPage: OrderPage;
    let availableSubAccounts: string[] = [];
    let availableStocks: any[] = [];
    let maxAvailableStock: { subAcntNo: string; stocks: any[] };
    let stockTransferHistNormal: any[] = [];

    let getAvailStockListApi = new getAvailStockList({ baseUrl: TEST_CONFIG.WEB_LOGIN_URL });
    let getStockTransferHistApi = new getStockTransferHist({ baseUrl: TEST_CONFIG.WEB_LOGIN_URL });

    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        transferStockPage = new TranferStockPage(page);
        orderPage = new OrderPage(page);

        const loginData = await getSharedLoginSession();
        const { session, cif, token, acntNo, subAcntNormal, subAcntMargin, subAcntDerivative, subAcntFolio } = loginData;
        availableSubAccounts = [subAcntNormal, subAcntMargin, subAcntDerivative, subAcntFolio]
            .filter((subAcntNo): subAcntNo is string => Boolean(subAcntNo && subAcntNo.trim() !== ""));

        async function getAvailStockListSubAccount(subAcntNo: string): Promise<any[]> {
            const response = await getAvailStockListApi.getAvailStockList({
                user: TEST_CONFIG.TEST_USER,
                session,
                acntNo,
                subAcntNo,
                rqId: uuidv4(),
            });
            return response?.data?.data?.list ?? [];
        }
        availableStocks = await Promise.all(availableSubAccounts.map(async (subAcntNo) => ({
            subAcntNo,
            stocks: await getAvailStockListSubAccount(subAcntNo),
        })));

        maxAvailableStock = availableStocks.reduce((max, current) => {
            return current.stocks.length > max.stocks.length ? current : max;
        }, availableStocks[0]);

        async function fetchStockTransferHist(subAcntNo: string): Promise<any[]> {
            const response = await getStockTransferHistApi.getStockTransferHist({
                user: TEST_CONFIG.TEST_USER,
                session,
                acntNo,
                subAcntNo,
                rqId: uuidv4(),
            });
            const list = response.data?.data?.list ?? [];
            return list.map((item: any) => ({
                source: subAcntNo,
                destination: item.toSubAcntNo,
                stockCode: item.symbol,
                quantity: item.quantity,
                content: item.desc,
                status: item.status === "0" || item.status == "1" ? "Thành công" : item.status === "2" ? "Không thành công" : item.status === "3" ? "Từ chối" : "",
                createdDate: item.trdDt,
            }));
        }
        stockTransferHistNormal = await fetchStockTransferHist(subAcntNormal);

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

        const getSubAccountNo = (account: string) => account.split('-')[0].trim();


        let sourceSubAccountNo = getSubAccountNo(sourceAccount);
        let destinationSubAccountNo = getSubAccountNo(destinationAccount);


        if (maxAvailableStock.stocks.length < 1) {
            console.log('Không sở hữu mã CK để chuyển');

            const [sourceStats, destinationStats] = await Promise.all([
                transferStockPage.getSourceHoldingStats(),
                transferStockPage.getDestinationHoldingStats(),
            ]);

            expect(NumberValidator.parseNumber(sourceStats.stockCount)).toBe(0);
            expect(NumberValidator.parseNumber(sourceStats.totalQty)).toBe(0);
            expect(NumberValidator.parseNumber(destinationStats.stockCount)).toBe(0);
            expect(NumberValidator.parseNumber(destinationStats.totalQty)).toBe(0);
        } else {

            if (sourceSubAccountNo !== maxAvailableStock.subAcntNo) {
                await transferStockPage.selectSourceAccount(maxAvailableStock.subAcntNo);
                sourceSubAccountNo = maxAvailableStock.subAcntNo;
            }
            console.log('sourceSubAccountNo', sourceSubAccountNo);
            const alternateSubAccountNo = availableSubAccounts.find(
                (subAcntNo) => subAcntNo !== sourceSubAccountNo && subAcntNo !== availableSubAccounts[2] && subAcntNo !== availableSubAccounts[3]
            );
            if (alternateSubAccountNo) {
                if (destinationSubAccountNo !== alternateSubAccountNo) {
                    await transferStockPage.selectDestinationAccount(alternateSubAccountNo);
                    destinationSubAccountNo = alternateSubAccountNo;
                }
            }

            const [sourceStats, destinationStats] = await Promise.all([
                transferStockPage.getSourceHoldingStats(),
                transferStockPage.getDestinationHoldingStats(),
            ]);

            expect(NumberValidator.parseNumber(sourceStats.stockCount)).toBe(maxAvailableStock.stocks.length);
            expect(NumberValidator.parseNumber(sourceStats.totalQty)).toBe(maxAvailableStock.stocks.reduce((total, stock) => total + NumberValidator.parseNumber(stock.quantity), 0));

            const rowSourceUI = await transferStockPage.getSourceRowData(0);
            const firstStock = maxAvailableStock.stocks[0];
            const rowSourceAPI = {
                stockCode: firstStock.symbol,
                holdingQty: firstStock.quantity,
                maxQty: firstStock.quantity,
            };

            for (const key in rowSourceUI) {
                expect(rowSourceUI[key]).toBe(rowSourceAPI[key]);
            }

            // Transfer stock
            const quantityEnter = 1;

            await transferStockPage.transferStock(0, quantityEnter);

            const messageError = await orderPage.getMessage();
            if (messageError.description.includes('Hệ thống đang chạy batch')) {
                console.log('Transfer stock failed:', messageError);
            } else {
                await orderPage.verifyMessage(['Thông báo'], ['Đã chuyển thành công']);
                await WaitUtils.delay(8000);
            }
        }
        // Check history table
        const headers = await transferStockPage.getHistoryTableHeaders();
        const expectedHeaders = ['Nguồn', 'Đích', 'Mã CK', 'KL', 'Mô tả', 'Trạng thái', 'Ngày tạo'];
        for (const header of expectedHeaders) {
            expect(headers).toContain(header);
        }

        if (sourceSubAccountNo !== availableSubAccounts[0]) {
            await transferStockPage.selectSourceAccount(availableSubAccounts[0]);
        }

        const rowCount = await transferStockPage.getHistoryRowCount();
        if (rowCount > 0) {
            const rowUI = await transferStockPage.getHistoryRowData(0);
            const rowAPI = stockTransferHistNormal[0];

            for (const key in rowUI) {
                expect(rowUI[key]).toBe(rowAPI[key]);
            }
        } else {
            console.log('No data in history table');
        }

        await attachScreenshot(page, 'Transfer Stock Page');
    });
});
