import { test, expect, type Page } from '@playwright/test';
import LoginPage from '../../page/ui/LoginPage';
import TransferStockPage from '../../page/ui/TransferStock';
import { TEST_CONFIG } from '../utils/testConfig';
import { attachScreenshot } from '../../helpers/reporterHelper';
import { NumberValidator } from '../../helpers/validationUtils';
import { getSharedLoginSession, resetSharedLoginSession } from "../api/sharedSession";
import OrderPage from '../../page/ui/OrderPage';
import { v4 as uuidv4 } from 'uuid';
import { WaitUtils } from '../../helpers/uiUtils';
import { getAvailStockList } from '../../page/api/AssetApi';
import { getSubAccountNo, selectIfDifferent, buildAvailableSubAccounts } from '../utils/accountHelpers';

const STOCK_TRANSFER_STATUS: Record<string, string> = {
    "0": "Thành công",
    "1": "Thành công",
    "2": "Không thành công",
    "3": "Từ chối",
};

const getTransferStatusLabel = (status: string) => STOCK_TRANSFER_STATUS[status] ?? "";


test.describe('Transfer Stock Tests', () => {
    let loginPage: LoginPage;
    let transferStockPage: TransferStockPage;
    let orderPage: OrderPage;
    let availableSubAccounts: string[] = [];
    let availableStocks: any[] = [];
    let maxAvailableStock: { subAcntNo: string; stocks: any[] };
    let stockTransferHistAPI: any[] = [];
    let page: Page;

    let getAvailStockListApi = new getAvailStockList({ baseUrl: TEST_CONFIG.WEB_LOGIN_URL });

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        loginPage = new LoginPage(page);
        transferStockPage = new TransferStockPage(page);
        orderPage = new OrderPage(page);

        const loginData = await getSharedLoginSession("Matrix", true);
        const { session, acntNo, subAcntNormal, subAcntMargin, subAcntDerivative, subAcntFolio } = loginData;
        availableSubAccounts = buildAvailableSubAccounts(loginData);


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


        await loginPage.loginSuccess();
        expect(await loginPage.verifyLoginSuccess(TEST_CONFIG.TEST_USER)).toBeTruthy();
        await attachScreenshot(page, 'After Login');
        await transferStockPage.navigateToTransferStock();
    });

    test.afterAll(async () => {
        await page.close();
        resetSharedLoginSession();
    });

    test('TC_001: Check transfer stock function', async () => {

        const title = await transferStockPage.getTitle();
        expect(title).toContain('Chuyển cổ phiếu');

        const [sourceAccount, destinationAccount] = await Promise.all([
            transferStockPage.getSourceAccountValue(),
            transferStockPage.getDestinationAccountValue(),
        ]);

        let sourceSubAccountNo = getSubAccountNo(sourceAccount);
        let destinationSubAccountNo = getSubAccountNo(destinationAccount);

        let sourceStats = await transferStockPage.getSourceHoldingStats();
        console.log('sourceStats', sourceStats);


        if (maxAvailableStock.stocks.length < 1) {
            console.log('Không sở hữu mã CK để chuyển');
            return;
        }

        await selectIfDifferent(
            sourceSubAccountNo,
            maxAvailableStock.subAcntNo,
            (target) => transferStockPage.selectSourceAccount(target)
        );

        sourceSubAccountNo = maxAvailableStock.subAcntNo;
        await WaitUtils.delay(3000);
        sourceStats = await transferStockPage.getSourceHoldingStats();
        console.log('sourceStats', sourceStats);

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

        expect(NumberValidator.parseNumber(sourceStats.stockCount)).toBe(maxAvailableStock.stocks.length);
        expect(NumberValidator.parseNumber(sourceStats.totalQty)).toBe(maxAvailableStock.stocks.reduce((total, stock) => total + NumberValidator.parseNumber(stock.quantity), 0));

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

        // Transfer stock
        await transferStockPage.transferMaxStock(0);

        const messageError = await orderPage.getMessage();
        if (messageError.description.includes('Hệ thống đang chạy batch')) {
            console.log('Transfer stock failed:', messageError);
            return;
        } else if (messageError.description.includes('Đã chuyển thành công')) {
            await orderPage.verifyMessage(['Thông báo'], ['Đã chuyển thành công']);
            await attachScreenshot(page, 'Transfer Stock Page');
            if (await transferStockPage.sourceRows.count() > 0) {
                const newRowSourceUI = await transferStockPage.getSourceRowData(0);
                expect(newRowSourceUI.stockCode).not.toBe(rowSourceUI.stockCode);
                await WaitUtils.delay(8000);
            } else {
                console.log(`Source data no contain ${rowSourceUI.stockCode}`);
                return;
            }
        } else {
            throw new Error(messageError.title + ': ' + messageError.description);
        }
    });

    test('TC_002: Check history table', async () => {
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
        }

        const rowCount = await transferStockPage.getHistoryRowCount();
        if (rowCount > 0) {
            const rowUI = await transferStockPage.getHistoryRowData(0);
            const rowAPI = stockTransferHistAPI[0];

            Object.keys(rowUI).forEach((key) => {
                expect(rowUI[key]).toBe(rowAPI[key]);
            });
        } else {
            console.log('No data in history table');
        }
    });
});
