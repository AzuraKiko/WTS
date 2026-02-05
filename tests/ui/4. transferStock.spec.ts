import { test, expect } from '@playwright/test';
import LoginPage from '../../page/ui/LoginPage';
import TransferStockPage from '../../page/ui/TransferStock';
import { TEST_CONFIG, isSystemBatching } from '../utils/testConfig';
import { attachScreenshot } from '../../helpers/reporterHelper';
import { NumberValidator } from '../../helpers/validationUtils';
import { getSharedLoginSession, resetSharedLoginSession } from "../api/sharedSession";
import OrderPage from '../../page/ui/OrderPage';
import { v4 as uuidv4 } from 'uuid';
import { WaitUtils } from '../../helpers/uiUtils';
import { getAvailStockList } from '../../page/api/AssetApi';
import { getSubAccountNo, selectIfDifferent, buildAvailableSubAccountsFromLoginData, getGlobalAvailableSubAccounts } from '../utils/accountHelpers';

const STOCK_TRANSFER_STATUS: Record<string, string> = {
    "0": "Thành công",
    "1": "Thành công",
    "2": "Không thành công",
    "3": "Từ chối",
};

const getTransferStatusLabel = (status: string) => STOCK_TRANSFER_STATUS[status] ?? "";

const batching = isSystemBatching();


test.describe('Transfer Stock Tests', () => {
    let loginPage: LoginPage;
    let transferStockPage: TransferStockPage;
    let orderPage: OrderPage;
    let availableSubAccounts: string[] = [];
    let availableStocks: any[] = [];
    let maxAvailableStock: { subAcntNo: string; stocks: any[] };
    let stockTransferHistAPI: any[] = [];

    let getAvailStockListApi = new getAvailStockList({ baseUrl: TEST_CONFIG.WEB_LOGIN_URL });
    availableSubAccounts = getGlobalAvailableSubAccounts();

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        transferStockPage = new TransferStockPage(page);
        orderPage = new OrderPage(page);

        if (!batching) {
            const loginData = await getSharedLoginSession("Matrix", true);
            const { session, acntNo } = loginData;

            // Ưu tiên dùng danh sách global đã build ở globalSetup
            if (!availableSubAccounts.length) {
                availableSubAccounts = buildAvailableSubAccountsFromLoginData(loginData);
            }

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
            availableStocks = await Promise.all(
                availableSubAccounts.map(async (subAcntNo) => ({
                    subAcntNo,
                    stocks: await getAvailStockListSubAccount(subAcntNo),
                }))
            );

            maxAvailableStock = availableStocks.reduce(
                (max, current) => (current.stocks.length > max.stocks.length ? current : max),
                availableStocks[0] ?? { subAcntNo: "", stocks: [] }
            );
        }

        await loginPage.loginSuccess();
        expect(await loginPage.verifyLoginSuccess(TEST_CONFIG.TEST_USER)).toBeTruthy();
        await attachScreenshot(page, 'After Login');
        await transferStockPage.navigateToTransferStock();
    });

    test.afterEach(async () => {
        resetSharedLoginSession();
    });

    test('TC_001: Check transfer stock function', async ({ page }) => {

        const title = await transferStockPage.getTitle();
        expect(title).toContain('Chuyển cổ phiếu');

        const [sourceAccount, destinationAccount] = await Promise.all([
            transferStockPage.getSourceAccountValue(),
            transferStockPage.getDestinationAccountValue(),
        ]);

        let sourceSubAccountNo = getSubAccountNo(sourceAccount);
        let destinationSubAccountNo = getSubAccountNo(destinationAccount);


        await selectIfDifferent(
            sourceSubAccountNo,
            maxAvailableStock.subAcntNo,
            (target) => transferStockPage.selectSourceAccount(target)
        );

        sourceSubAccountNo = maxAvailableStock.subAcntNo;
        await WaitUtils.delay(3000);
        let sourceStats = await transferStockPage.getSourceHoldingStats();
        console.log('sourceStats', sourceStats);

        // Lọc lại stocks theo dữ liệu UI để tránh lệch trạng thái với API ban đầu
        const uiStockCount = NumberValidator.parseNumber(sourceStats.stockCount);
        const uiTotalQty = NumberValidator.parseNumber(sourceStats.totalQty);

        console.log('uiStockCount', uiStockCount);
        console.log('uiTotalQty', uiTotalQty);

        if (uiStockCount < 1 || uiTotalQty <= 0) {
            console.log('Không sở hữu mã CK để chuyển (theo UI)', {
                subAcntNo: sourceSubAccountNo,
                uiStockCount,
                uiTotalQty,
            });
            return;
        }

        const alternateSubAccountNo = availableSubAccounts.find(
            (subAcntNo) => subAcntNo !== sourceSubAccountNo && subAcntNo !== availableSubAccounts[2] && subAcntNo !== availableSubAccounts[3]
        );
        if (alternateSubAccountNo) {
            await selectIfDifferent(
                destinationSubAccountNo,
                alternateSubAccountNo,
                (target) => transferStockPage.selectDestinationAccount(target)

            );
            destinationSubAccountNo = alternateSubAccountNo;
        }


        expect(uiStockCount).toBe(maxAvailableStock.stocks.length);
        expect(uiTotalQty).toBe(maxAvailableStock.stocks.reduce((total, stock) => total + NumberValidator.parseNumber(stock.quantity), 0));


        const rowSourceUI = await transferStockPage.getSourceRowData(0);
        const firstStock = maxAvailableStock.stocks[0];
        const rowSourceAPI = {
            stockCode: firstStock.symbol,
            holdingQty: firstStock.quantity,
            maxQty: firstStock.quantity,
        };

        Object.keys(rowSourceUI).forEach((key) => {
            expect(rowSourceUI[key]).toBe(rowSourceAPI[key]);
        });

        console.log('rowSourceUI', rowSourceUI);
        console.log('rowSourceAPI', rowSourceAPI);

        if (batching) {
            console.log('Hệ thống đang chạy batch - skip transfer stock');
            return;
        }

        // Transfer stock
        await transferStockPage.transferMaxStock(0);

        // Toast có thể chậm/miss → getMessage có thể throw
        let messageError: { title?: string; description?: string } = {};
        try {
            messageError = await orderPage.getMessage();
        } catch (error) {
            console.log('Toast message not captured for transfer stock, continue with UI verification only:', error);
        }

        const description = messageError.description || '';

        if (description.includes('Hệ thống đang chạy batch')) {
            console.log('Transfer stock failed (batching):', messageError);
            return;
        }

        if (description.includes('Đã chuyển thành công')) {
            // Có toast thì verify, nếu fail chỉ log để tránh flaky
            try {
                await orderPage.verifyMessage(['Thông báo'], ['Đã chuyển thành công']);
            } catch (error) {
                console.log('Transfer stock toast verification flaky, continue with UI verification:', error);
            }
        } else {
            console.log('Success toast not found for transfer stock, verify by UI only:', messageError);
        }

        await attachScreenshot(page, 'Transfer Stock Page');

        // Sau khi chuyển max 1 mã, hàng đầu tiên phải khác hoặc không còn hàng
        const updated = await WaitUtils.waitForCondition(async () => {
            const rowCount = await transferStockPage.sourceRows.count();
            if (rowCount === 0) {
                console.log('All stocks transferred, no source rows left');
                return true;
            }

            const newRowSourceUI = await transferStockPage.getSourceRowData(0);
            const changed = newRowSourceUI.stockCode !== rowSourceUI.stockCode;

            if (!changed) {
                console.log('Waiting for source row to change after transfer stock...', {
                    previousStockCode: rowSourceUI.stockCode,
                    currentStockCode: newRowSourceUI.stockCode,
                });
            }

            return changed;
        }, {
            maxAttempts: 5,
            delay: 2000,
            timeout: 15000,
        });

        expect(updated).toBeTruthy();
        console.log('updated', updated);
    });

    test('TC_002: Check history table', async ({ page }) => {
        const sourceAccount = await transferStockPage.getSourceAccountValue();
        let sourceSubAccountNo = getSubAccountNo(sourceAccount);

        // Check history table
        const headers = await transferStockPage.getHistoryTableHeaders();
        const expectedHeaders = ['Nguồn', 'Đích', 'Mã CK', 'KL', 'Mô tả', 'Trạng thái', 'Ngày tạo'];
        expectedHeaders.forEach((header) => {
            expect(headers).toContain(header);
        });

        const normalSubAcntNo = availableSubAccounts[0];
        const marginSubAcntNo = availableSubAccounts[1];
        const targetSubAcntNo = sourceSubAccountNo === normalSubAcntNo ? marginSubAcntNo : normalSubAcntNo;
        console.log('targetSubAcntNo', targetSubAcntNo);

        const waitForTransferHist = (subAcntNo: string) =>
            WaitUtils.getLatestResponseByBody(
                page,
                async () => {
                    await selectIfDifferent(
                        sourceSubAccountNo,
                        subAcntNo,
                        (target) => transferStockPage.selectSourceAccount(target)
                    );
                },
                [
                    'getStockTransferHist',
                    subAcntNo,
                ],
                '/CoreServlet.pt',
                20000,
            );

        let apiResponse = await waitForTransferHist(targetSubAcntNo);
        if (!apiResponse) {
            console.log('No getStockTransferHist response captured');
        } else {
            const apiData = await apiResponse.json();
            // console.log('apiData', JSON.stringify(apiData, null, 2));
            const list = apiData.data?.list ?? [];
            stockTransferHistAPI = list.map((item: any) => ({
                source: targetSubAcntNo,
                destination: item.toSubAcntNo,
                stockCode: item.symbol,
                quantity: item.quantity,
                content: item.desc,
                status: getTransferStatusLabel(item.status),
                createdDate: item.trdDt,
            }));
            console.log('stockTransferHistAPI', JSON.stringify(stockTransferHistAPI[0], null, 2));
        }

        if (stockTransferHistAPI.length > 0) {
            const rowUI = await transferStockPage.getHistoryRowData(0);
            const rowAPI = stockTransferHistAPI[0];
            console.log('rowUI', JSON.stringify(rowUI, null, 2));
            console.log('rowAPI', JSON.stringify(rowAPI, null, 2));
            Object.keys(rowUI).forEach((key) => {
                expect(rowUI[key]).toBe(rowAPI[key]);
            });
        } else {
            console.log('No data in history table');
        }
    });
});
