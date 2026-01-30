import { test, expect } from '@playwright/test';
import LoginPage from '../../page/ui/LoginPage';
import TranferCashPage from '../../page/ui/TranferCash';
import { TEST_CONFIG } from '../utils/testConfig';
import { attachScreenshot } from '../../helpers/reporterHelper';
import { NumberValidator } from '../../helpers/validationUtils';
import { AssetApi, getCashTransferHist } from '../../page/api/AssetApi';
import { getSharedLoginSession, resetSharedLoginSession } from "../api/sharedSession";
import { v4 as uuidv4 } from 'uuid';
import OrderPage from '../../page/ui/OrderPage';
import { WaitUtils } from '../../helpers/uiUtils';


test.describe('Transfer Cash Tests', () => {
    let loginPage: LoginPage;
    let transferCashPage: TranferCashPage;
    let orderPage: OrderPage;
    let maxWithdrawableSubAccount: { subAcntNo: string; wdrawAvail: number };
    let availableSubAccounts: string[] = [];
    let cashTransferHistNormal: any[] = [];

    let assetApi = new AssetApi({ baseUrl: TEST_CONFIG.WEB_LOGIN_URL });
    let getCashTransferHistApi = new getCashTransferHist({ baseUrl: TEST_CONFIG.WEB_LOGIN_URL });

    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        transferCashPage = new TranferCashPage(page);
        orderPage = new OrderPage(page);
        const loginData = await getSharedLoginSession();
        const { session, cif, token, acntNo, subAcntNormal, subAcntMargin, subAcntDerivative, subAcntFolio } = loginData;
        availableSubAccounts = [subAcntNormal, subAcntMargin, subAcntDerivative, subAcntFolio]
            .filter((subAcntNo): subAcntNo is string => Boolean(subAcntNo && subAcntNo.trim() !== ""));

        async function getwdrawAvailSubAccount(subAcntNo: string): Promise<number> {
            const response = await assetApi.getTotalAssetAll({
                user: TEST_CONFIG.TEST_USER,
                session,
                acntNo,
                subAcntNo,
                rqId: uuidv4(),
            });
            return response?.data?.data?.wdrawAvail;
        }

        const wdrawAvailEntries: { subAcntNo: string; wdrawAvail: number }[] = await Promise.all(
            availableSubAccounts.map(async (subAcntNo) => ({
                subAcntNo,
                wdrawAvail: await getwdrawAvailSubAccount(subAcntNo),
            }))
        );

        maxWithdrawableSubAccount = wdrawAvailEntries.reduce((max, current) => {
            return current.wdrawAvail > max.wdrawAvail ? current : max;
        }, wdrawAvailEntries[0]);


        async function fetchCashTransferHist(subAcntNo: string): Promise<any[]> {
            const response = await getCashTransferHistApi.getCashTransferHist({
                user: TEST_CONFIG.TEST_USER,
                session,
                acntNo,
                subAcntNo,
                rqId: uuidv4(),
            });
            const list = response.data?.data?.list ?? [];
            return list.map((item: any) => ({
                source: subAcntNo,
                destination: item.toAcntNo,
                amount: item.trdAmt,
                fee: item.trdFee,
                content: item.desc,
                createdDate: item.trdDt,
                status: item.status === "2" ? "Hoàn thành" : "Thất bại",
            }));
        }
        cashTransferHistNormal = await fetchCashTransferHist(subAcntNormal);

        // Login before each test
        await loginPage.loginSuccess();
        expect(await loginPage.verifyLoginSuccess(TEST_CONFIG.TEST_USER)).toBeTruthy();
        await attachScreenshot(page, 'After Login');

    });

    test('TC_001: Verify transfer cash page data', async ({ page }) => {

        await transferCashPage.navigateToTransferCash();

        const title = await transferCashPage.getTitle();
        expect(title).toContain('Chuyển tiền tiểu khoản');

        const [sourceAccount, destinationAccount] = await Promise.all([
            transferCashPage.getSourceAccountValue(),
            transferCashPage.getDestinationAccountValue(),
        ]);

        const getSubAccountNo = (account: string) => account.split('-')[0].trim();
        const assertAccountInfo = (info: { balance: string; withdrawable: string }) => {
            expect(NumberValidator.parseNumber(info.balance)).toBeGreaterThanOrEqual(0);
            expect(NumberValidator.parseNumber(info.withdrawable)).toBeGreaterThanOrEqual(0);
        };

        let sourceSubAccountNo = getSubAccountNo(sourceAccount);
        let destinationSubAccountNo = getSubAccountNo(destinationAccount);

        if (maxWithdrawableSubAccount.wdrawAvail <= 0) {
            console.log('Không có tiểu khoản có tiền để chuyển');

            const [sourceAccountInfo, destinationAccountInfo] = await Promise.all([
                transferCashPage.getSourceAccountInfo(),
                transferCashPage.getDestinationAccountInfo(),
            ]);

            assertAccountInfo(sourceAccountInfo);
            assertAccountInfo(destinationAccountInfo);

            // Check transfer content
            const note = await transferCashPage.getTransferContent();
            expect(note).toContain(`chuyển tiền online từ ${sourceSubAccountNo} đến ${destinationSubAccountNo}`);

        } else {
            if (sourceSubAccountNo !== maxWithdrawableSubAccount.subAcntNo) {
                await transferCashPage.selectSourceAccount(maxWithdrawableSubAccount.subAcntNo);
                sourceSubAccountNo = maxWithdrawableSubAccount.subAcntNo;
            }
            if (destinationSubAccountNo === sourceSubAccountNo) {
                const alternateSubAccountNo = availableSubAccounts.find(
                    (subAcntNo) => subAcntNo !== sourceSubAccountNo
                );
                if (alternateSubAccountNo) {
                    await transferCashPage.selectDestinationAccount(alternateSubAccountNo);
                    destinationSubAccountNo = alternateSubAccountNo;
                }
            }


            const [sourceAccountInfo, destinationAccountInfo] = await Promise.all([
                transferCashPage.getSourceAccountInfo(),
                transferCashPage.getDestinationAccountInfo(),
            ]);

            assertAccountInfo(sourceAccountInfo);
            assertAccountInfo(destinationAccountInfo);

            // Check transfer content
            const note = await transferCashPage.getTransferContent();
            expect(note).toContain(`chuyển tiền online từ ${sourceSubAccountNo} đến ${destinationSubAccountNo}`);

            // Transfer cash
            const amount = 10000;
            await transferCashPage.transferCash(amount);

            const messageError = await orderPage.getMessage();
            if (messageError.title.includes('Chuyển tiền không thành công')) {
                console.log('Transfer cash failed:', messageError);
            } else {
                await orderPage.verifyMessage(['Thông báo'], [`Quý khách vừa chuyển số tiền: ${amount} VNĐ từ tiểu khoản ${sourceSubAccountNo} sang tiểu khoản ${destinationSubAccountNo}`]);

                await WaitUtils.delay(8000);

                const [newSourceAccountInfo, newDestinationAccountInfo] = await Promise.all([
                    transferCashPage.getSourceAccountInfo(),
                    transferCashPage.getDestinationAccountInfo(),
                ]);

                expect(NumberValidator.parseNumber(newSourceAccountInfo.balance)).toBe(NumberValidator.parseNumber(sourceAccountInfo.balance) - amount);
                expect(NumberValidator.parseNumber(newDestinationAccountInfo.balance)).toBe(NumberValidator.parseNumber(destinationAccountInfo.balance) + amount);

                expect(NumberValidator.parseNumber(newSourceAccountInfo.withdrawable)).toBe(NumberValidator.parseNumber(sourceAccountInfo.withdrawable) - amount);
                expect(NumberValidator.parseNumber(newDestinationAccountInfo.withdrawable)).toBe(NumberValidator.parseNumber(destinationAccountInfo.withdrawable) + amount);
            }
        }

        // Check history table
        const headers = await transferCashPage.getHistoryTableHeaders();
        const expectedHeaders = ['Nguồn', 'Đích', 'Số tiền chuyển', 'Phí', 'Nội dung chuyển', 'Ngày tạo', 'Trạng thái'];
        for (const header of expectedHeaders) {
            expect(headers).toContain(header);
        }
        if (sourceSubAccountNo !== availableSubAccounts[0]) {
            await transferCashPage.selectSourceAccount(availableSubAccounts[0]);
        }

        const rowCount = await transferCashPage.getHistoryRowCount();
        if (rowCount > 0) {
            const rowUI = await transferCashPage.getHistoryRowData(0);
            const rowAPI = cashTransferHistNormal[0];
            for (const key in rowUI) {
                expect(rowUI[key]).toBe(rowAPI[key]);
            }
        } else {
            console.log('No data in history table');
        }

        await attachScreenshot(page, 'Transfer Cash Page');
    });
});
