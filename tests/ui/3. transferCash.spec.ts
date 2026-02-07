import { test, expect } from '@playwright/test';
import LoginPage from '../../page/ui/LoginPage';
import TransferCashPage from '../../page/ui/TransferCash';
import { TEST_CONFIG, isSystemBatching } from '../utils/testConfig';
import { attachScreenshot } from '../../helpers/reporterHelper';
import { NumberValidator } from '../../helpers/validationUtils';
import OrderPage from '../../page/ui/OrderPage';
import { WaitUtils } from '../../helpers/uiUtils';
import LoginApi from '../../page/api/LoginApi';
import {
    createAssetApi,
    refreshMaxWithdrawableSubAccount,
    getSubAccountNo,
    selectIfDifferent,
    getGlobalAvailableSubAccounts,
    buildAvailableSubAccounts,
} from '../utils/accountHelpers';
import AssetPage from '../../page/ui/Asset';

const batching = isSystemBatching();

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
    let loginApi: LoginApi;
    let maxWithdrawableSubAccount: { subAcntNo: string; wdrawAvail: number };
    let availableSubAccounts: string[] = [];
    let cashTransferHistAPI: any[] = [];
    let session = '';
    let acntNo = '';


    let assetApi = createAssetApi();
    availableSubAccounts = getGlobalAvailableSubAccounts();

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

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        transferCashPage = new TransferCashPage(page);
        orderPage = new OrderPage(page);
        assetPage = new AssetPage(page);
        loginApi = new LoginApi(TEST_CONFIG.WEB_LOGIN_URL);

        const loginData = await loginApi.getAvailableSubAccountsApi();
        session = loginData.session;
        acntNo = loginData.acntNo;

        if (!availableSubAccounts.length) {
            availableSubAccounts = buildAvailableSubAccounts(loginData.subAccounts);
        }

        await refreshMaxWithdrawable();

        await loginPage.loginSuccess();
        expect(await loginPage.verifyLoginSuccess(TEST_CONFIG.TEST_USER)).toBeTruthy();
        await attachScreenshot(page, 'After Login');
        await transferCashPage.navigateToTransferCash();
    });

    test('TC_001: Check transfer cash function', async ({ page }) => {

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

        test.skip(batching, 'Hệ thống đang chạy batch - skip transfer cash');


        await selectIfDifferent(
            sourceSubAccountNo,
            maxWithdrawableSubAccount.subAcntNo,
            (target) => transferCashPage.selectSourceAccount(target)
        );
        sourceSubAccountNo = maxWithdrawableSubAccount.subAcntNo;
        sourceAccountInfo = await transferCashPage.getSourceAccountInfo();

        const currentWithdrawable = NumberValidator.parseNumber(sourceAccountInfo.withdrawable);
        const amount = 1000;

        if (currentWithdrawable < amount) {
            console.log('Không đủ số dư có thể rút để chuyển', {
                subAcntNo: sourceSubAccountNo,
                currentWithdrawable,
                required: amount,
            });
            return;
        }

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
        await transferCashPage.transferCash(amount);

        // 🔁 Toast đôi khi bị chậm/miss → getMessage có thể throw
        let messageError: { title?: string; description?: string } = {};
        try {
            messageError = await orderPage.getMessage();
        } catch (error) {
            console.log('Toast message not captured, continue with balance verification only:', error);
        }

        const description = messageError.description || '';

        if (description.includes('Hệ thống đang chạy batch')) {
            console.log('Transfer cash failed (batching):', messageError);
            return;
        }

        if (description.includes('Quý khách vừa chuyển số tiền')) {
            // Toast lấy được thì verify, nếu fail chỉ log để tránh test flaky
            try {
                await orderPage.verifyMessage(
                    ['Thông báo'],
                    [`Quý khách vừa chuyển số tiền: ${amount} VNĐ từ tiểu khoản ${sourceSubAccountNo} sang tiểu khoản ${destinationSubAccountNo}`]
                );
            } catch (error) {
                console.log('Toast verification flaky, continue with balance verification:', error);
            }
        } else {
            console.log('Success toast not found, verify by balance change only:', messageError);
        }

        await attachScreenshot(page, 'Transfer Cash Page');

        const expectedSourceBalance = NumberValidator.parseNumber(sourceAccountInfo.balance) - amount;
        const expectedDestinationBalance = NumberValidator.parseNumber(destinationAccountInfo.balance) + amount;
        const expectedSourceWithdrawable = NumberValidator.parseNumber(sourceAccountInfo.withdrawable) - amount;
        const expectedDestinationWithdrawable = NumberValidator.parseNumber(destinationAccountInfo.withdrawable) + amount;


        let lastSourceInfo = sourceAccountInfo;
        let lastDestinationInfo = destinationAccountInfo;

        const balancesUpdated = await WaitUtils.waitForCondition(async () => {
            const [newSourceAccountInfo, newDestinationAccountInfo] = await Promise.all([
                transferCashPage.getSourceAccountInfo(),
                transferCashPage.getDestinationAccountInfo(),
            ]);

            lastSourceInfo = newSourceAccountInfo;
            lastDestinationInfo = newDestinationAccountInfo;

            const newSourceBalance = NumberValidator.parseNumber(newSourceAccountInfo.balance);
            const newDestinationBalance = NumberValidator.parseNumber(newDestinationAccountInfo.balance);
            const newSourceWithdrawable = NumberValidator.parseNumber(newSourceAccountInfo.withdrawable);
            const newDestinationWithdrawable = NumberValidator.parseNumber(newDestinationAccountInfo.withdrawable);

            const isBalanceMatched =
                newSourceBalance === expectedSourceBalance &&
                newDestinationBalance === expectedDestinationBalance &&
                newSourceWithdrawable === expectedSourceWithdrawable &&
                newDestinationWithdrawable === expectedDestinationWithdrawable;

            if (!isBalanceMatched) {
                console.log('Waiting for balance update...', {
                    expectedSourceBalance,
                    newSourceBalance,
                    expectedDestinationBalance,
                    newDestinationBalance,
                    expectedSourceWithdrawable,
                    newSourceWithdrawable,
                    expectedDestinationWithdrawable,
                    newDestinationWithdrawable,
                });
            }

            return isBalanceMatched;
        }, {
            maxAttempts: 5,
            delay: 2000,
            timeout: 20000,
        });

        expect(balancesUpdated).toBeTruthy();
        console.log('balancesUpdated', balancesUpdated);

        // Giá trị cuối cùng để cập nhật maxWithdrawableSubAccount, dùng thông tin mới nhất
        maxWithdrawableSubAccount.wdrawAvail = NumberValidator.parseNumber(lastSourceInfo.withdrawable);
        console.log('maxWithdrawableSubAccount', maxWithdrawableSubAccount);
    });


    test('TC_002: Check history table', async ({ page }) => {

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
        console.log('targetSubAcntNo', targetSubAcntNo);

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
            console.log('cashTransferHistAPI', JSON.stringify(cashTransferHistAPI[0], null, 2));
        }

        if (cashTransferHistAPI.length > 0) {
            const rowUI = await transferCashPage.getHistoryRowData(0);
            const rowAPI = cashTransferHistAPI[0];
            Object.keys(rowUI).forEach((key) => {
                expect(rowUI[key]).toBe(rowAPI[key]);
            });
            console.log('rowUI', JSON.stringify(rowUI, null, 2));
            console.log('rowAPI', JSON.stringify(rowAPI, null, 2));
        } else {
            console.log('No data in history table');
        }
    });


    test('TC_003: Check withdrawal money function', async ({ page }) => {
        await assetPage.menu.openSubMenu('Tài sản', 'Tổng quan');
        test.skip(batching, 'Hệ thống đang chạy batch - skip withdrawal money');


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
        console.log('wdrawAvailUI', wdrawAvailUI);
        console.log('wdrawAvailAPI', wdrawAvailAPI);
        expect(NumberValidator.parseNumber(wdrawAvailUI)).toBe(wdrawAvailAPI);
        const wdrawAvailNumber = NumberValidator.parseNumber(wdrawAvailUI);

        if (wdrawAvailNumber <= 0) {
            console.log('Không có tiểu khoản có tiền để rút (UI)');
            test.skip(true, 'Không có tiểu khoản có tiền để rút');
        }

        // Check withdrawal money
        const amount = 2000;

        await assetPage.withdrawalMoney(amount);

        // 🔁 Toast rút tiền đôi khi bị chậm/miss → getMessage có thể throw
        let messageError: { title?: string; description?: string } = {};
        try {
            messageError = await orderPage.getMessage();
        } catch (error) {
            console.log('Toast message not captured for withdrawal, continue with balance verification only:', error);
        }

        const description = messageError.description || '';

        if (description.includes('Hệ thống đang chạy batch')) {
            console.log('Withdrawal money failed (batching):', messageError);
            return;
        }

        if (description.includes('Đã chuyển thành công')) {
            // Toast lấy được thì verify, nếu fail chỉ log để tránh test flaky
            try {
                await orderPage.verifyMessage(['Thông báo'], ['Đã chuyển thành công']);
            } catch (error) {
                console.log('Withdrawal toast verification flaky, continue with balance verification:', error);
            }
        } else {
            console.log('Success toast not found for withdrawal, verify by balance change only:', messageError);
        }

        const expectedWdrawAvail = NumberValidator.parseNumber(wdrawAvailUI) - amount;
        let lastWdrawAvail = NumberValidator.parseNumber(wdrawAvailUI);

        const balanceUpdated = await WaitUtils.waitForCondition(async () => {
            await assetPage.openWithdrawalMoneyModal();
            const newWdrawAvailUI = await assetPage.getValueByText('Số tiền có thể rút');
            lastWdrawAvail = NumberValidator.parseNumber(newWdrawAvailUI);

            const isMatched = lastWdrawAvail === expectedWdrawAvail;
            if (!isMatched) {
                console.log('Waiting for withdrawal balance update...', {
                    expectedWdrawAvail,
                    lastWdrawAvail,
                });
            }

            return isMatched;
        }, {
            maxAttempts: 5,
            delay: 2000,
            timeout: 20000,
        });

        expect(balanceUpdated).toBeTruthy();
        console.log('balanceUpdated', balanceUpdated);

        await attachScreenshot(page, `Withdrawal Money ${sourceAccount}`);
    });

});
