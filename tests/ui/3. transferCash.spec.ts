import { test, expect, type Page } from '@playwright/test';
import LoginPage from '../../page/ui/LoginPage';
import TransferCashPage from '../../page/ui/TransferCash';
import { TEST_CONFIG } from '../utils/testConfig';
import { attachScreenshot } from '../../helpers/reporterHelper';
import { NumberValidator } from '../../helpers/validationUtils';
import { getSharedLoginSession, resetSharedLoginSession } from "../api/sharedSession";
import OrderPage from '../../page/ui/OrderPage';
import { WaitUtils } from '../../helpers/uiUtils';
import {
    buildAvailableSubAccounts,
    createAssetApi,
    refreshMaxWithdrawableSubAccount,
    getSubAccountNo,
    selectIfDifferent,
} from '../utils/accountHelpers';
import AssetPage from '../../page/ui/Asset';



const CASH_TRANSFER_STATUS: Record<string, string> = {
    "1": "Đang chờ",
    "2": "Hoàn thành",
    "3": "Từ chối",
    "4": "Có lỗi từ bank",
};

const getCashTransferStatusLabel = (status: string) => CASH_TRANSFER_STATUS[status] ?? "";


test.describe('Transfer Cash Tests', () => {
    let loginPage: LoginPage;
    let transferCashPage: TransferCashPage;
    let orderPage: OrderPage;
    let assetPage: AssetPage;
    let maxWithdrawableSubAccount: { subAcntNo: string; wdrawAvail: number };
    let availableSubAccounts: string[] = [];
    let cashTransferHistAPI: any[] = [];
    let page: Page;
    let session = '';
    let acntNo = '';
    let isBatching = false;


    let assetApi = createAssetApi();

    // test.describe.configure({ mode: 'serial' });

    const assertAccountInfo = (info: { balance: string; withdrawable: string }) => {
        expect(NumberValidator.parseNumber(info.balance)).toBeGreaterThanOrEqual(0);
        expect(NumberValidator.parseNumber(info.withdrawable)).toBeGreaterThanOrEqual(0);
    };
    const refreshMaxWithdrawable = async () => {
        maxWithdrawableSubAccount = await refreshMaxWithdrawableSubAccount(assetApi, {
            session,
            acntNo,
            availableSubAccounts,
        });
    };

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        loginPage = new LoginPage(page);
        transferCashPage = new TransferCashPage(page);
        orderPage = new OrderPage(page);
        assetPage = new AssetPage(page);
        isBatching = await orderPage.isSystemBatching();

        if (!isBatching) {
            const loginData = await getSharedLoginSession("Matrix", true);
            const { session: sessionValue, acntNo: acntNoValue, subAcntNormal, subAcntMargin, subAcntDerivative, subAcntFolio } = loginData;
            session = sessionValue;
            acntNo = acntNoValue;
            availableSubAccounts = buildAvailableSubAccounts(loginData);

            await refreshMaxWithdrawable();
        }

        await loginPage.loginSuccess();
        expect(await loginPage.verifyLoginSuccess(TEST_CONFIG.TEST_USER)).toBeTruthy();
        await attachScreenshot(page, 'After Login');
        await transferCashPage.navigateToTransferCash();
    });

    test.afterAll(async () => {
        await page.close();
        resetSharedLoginSession();
    });

    test('TC_001: Check transfer cash function', async () => {

        const title = await transferCashPage.getTitle();
        expect(title).toContain('Chuyển tiền tiểu khoản');

        const [sourceAccount, destinationAccount] = await Promise.all([
            transferCashPage.getSourceAccountValue(),
            transferCashPage.getDestinationAccountValue(),
        ]);

        let sourceSubAccountNo = getSubAccountNo(sourceAccount);
        let destinationSubAccountNo = getSubAccountNo(destinationAccount);

        let [sourceAccountInfo, destinationAccountInfo] = await Promise.all([
            transferCashPage.getSourceAccountInfo(),
            transferCashPage.getDestinationAccountInfo(),
        ]);

        assertAccountInfo(sourceAccountInfo);
        assertAccountInfo(destinationAccountInfo);

        // Check transfer content
        const note = await transferCashPage.getTransferContent();
        expect(note).toContain(`chuyển tiền online từ ${sourceSubAccountNo} đến ${destinationSubAccountNo}`);

        if (isBatching) {
            console.log('Hệ thống đang chạy batch');
            return;
        }

        if (maxWithdrawableSubAccount.wdrawAvail <= 0) {
            console.log('Không có tiểu khoản có tiền để chuyển');
            return;
        }

        await selectIfDifferent(
            sourceSubAccountNo,
            maxWithdrawableSubAccount.subAcntNo,
            (target) => transferCashPage.selectSourceAccount(target)
        );
        sourceSubAccountNo = maxWithdrawableSubAccount.subAcntNo;
        sourceAccountInfo = await transferCashPage.getSourceAccountInfo();

        if (destinationSubAccountNo === sourceSubAccountNo) {
            const alternateSubAccountNo = availableSubAccounts.find(
                (subAcntNo) => subAcntNo !== sourceSubAccountNo
            );
            if (alternateSubAccountNo) {
                await selectIfDifferent(
                    destinationSubAccountNo,
                    alternateSubAccountNo,
                    (target) => transferCashPage.selectDestinationAccount(target)
                );
                destinationSubAccountNo = alternateSubAccountNo;
                destinationAccountInfo = await transferCashPage.getDestinationAccountInfo();
            }
        }

        // Transfer cash
        const amount = 10000;
        await transferCashPage.transferCash(amount);

        const messageError = await orderPage.getMessage();

        if (messageError.description.includes('Hệ thống đang chạy batch')) {
            console.log('Transfer cash failed:', messageError);
            return;
        } else if (messageError.description.includes('Quý khách vừa chuyển số tiền')) {
            await orderPage.verifyMessage(['Thông báo'], [`Quý khách vừa chuyển số tiền: ${amount} VNĐ từ tiểu khoản ${sourceSubAccountNo} sang tiểu khoản ${destinationSubAccountNo}`]);
            await attachScreenshot(page, 'Transfer Cash Page');
            await WaitUtils.delay(8000);

            const [newSourceAccountInfo, newDestinationAccountInfo] = await Promise.all([
                transferCashPage.getSourceAccountInfo(),
                transferCashPage.getDestinationAccountInfo(),
            ]);

            expect(NumberValidator.parseNumber(newSourceAccountInfo.balance)).toBe(NumberValidator.parseNumber(sourceAccountInfo.balance) - amount);
            expect(NumberValidator.parseNumber(newDestinationAccountInfo.balance)).toBe(NumberValidator.parseNumber(destinationAccountInfo.balance) + amount);

            expect(NumberValidator.parseNumber(newSourceAccountInfo.withdrawable)).toBe(NumberValidator.parseNumber(sourceAccountInfo.withdrawable) - amount);
            expect(NumberValidator.parseNumber(newDestinationAccountInfo.withdrawable)).toBe(NumberValidator.parseNumber(destinationAccountInfo.withdrawable) + amount);

            maxWithdrawableSubAccount.wdrawAvail = NumberValidator.parseNumber(newSourceAccountInfo.withdrawable);

        } else {
            throw new Error(messageError.title + ': ' + messageError.description);
        }
    });


    test('TC_002: Check history table', async () => {

        // Check history table
        const headers = await transferCashPage.getHistoryTableHeaders();
        const expectedHeaders = ['Nguồn', 'Đích', 'Số tiền chuyển', 'Phí', 'Nội dung chuyển', 'Ngày tạo', 'Trạng thái'];
        expectedHeaders.forEach((header) => {
            expect(headers).toContain(header);
        });

        const sourceAccount = await transferCashPage.getSourceAccountValue();
        let sourceSubAccountNo = getSubAccountNo(sourceAccount);

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
                        (target) => transferCashPage.selectSourceAccount(target)
                    );
                },
                [
                    'getCashTransferHist',
                    subAcntNo,
                ],
                '/CoreServlet.pt',
                20000,
            );

        let apiResponse = await waitForTransferHist(targetSubAcntNo);


        if (!apiResponse) {
            console.log('No getCashTransferHist response captured');
        } else {
            const apiData = await apiResponse.json();
            const list = apiData.data?.list ?? [];
            cashTransferHistAPI = list.map((item: any) => ({
                source: targetSubAcntNo,
                destination: item.toAcntNo,
                amount: item.trdAmt,
                fee: item.trdFee,
                content: item.desc,
                createdDate: item.trdDt,
                status: getCashTransferStatusLabel(item.status),
            }));
        }

        const rowCount = await transferCashPage.getHistoryRowCount();

        if (rowCount > 0) {
            const rowUI = await transferCashPage.getHistoryRowData(0);
            const rowAPI = cashTransferHistAPI[0];
            Object.keys(rowUI).forEach((key) => {
                expect(rowUI[key]).toBe(rowAPI[key]);
            });
        } else {
            console.log('No data in history table');
        }
    });


    test('TC_003: Check withdrawal money function', async () => {
        await assetPage.menu.openSubMenu('Tài sản', 'Tổng quan');
        if (isBatching) {
            test.skip(true, 'Hệ thống đang chạy batch');
        }
        await assetPage.openWithdrawalMoneyModal();
        let sourceAccount = await assetPage.getSelectValue();
        if (sourceAccount !== maxWithdrawableSubAccount.subAcntNo) {
            await assetPage.selectAccount(maxWithdrawableSubAccount.subAcntNo);
            sourceAccount = maxWithdrawableSubAccount.subAcntNo;
        }

        const [wdrawAvailUI, wdrawAvailAPI] = await Promise.all([
            assetPage.getValueByText('Số tiền có thể rút'),
            maxWithdrawableSubAccount.wdrawAvail,
        ]);
        expect(NumberValidator.parseNumber(wdrawAvailUI)).toEqual(wdrawAvailAPI);

        if (wdrawAvailAPI <= 0) {
            console.log('Không có tiểu khoản có tiền để rút');
            return;
        }

        // Check withdrawal money
        const amount = 2000;

        await assetPage.withdrawalMoney(amount);

        const messageError = await orderPage.getMessage();

        if (messageError.description.includes('Hệ thống đang chạy batch')) {
            console.log('Withdrawal money failed:', messageError);
        } else {
            await orderPage.verifyMessage(['Thông báo'], ['Đã chuyển thành công']);
        }

        await assetPage.openWithdrawalMoneyModal();
        const newWdrawAvailUI = await assetPage.getValueByText('Số tiền có thể rút');
        expect(NumberValidator.parseNumber(newWdrawAvailUI)).toEqual(NumberValidator.parseNumber(wdrawAvailUI) - amount);
        await attachScreenshot(page, `Withdrawal Money ${sourceAccount}`);
    });

});
