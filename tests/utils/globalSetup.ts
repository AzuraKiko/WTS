import LoginApi from '../../page/api/LoginApi';
import { TEST_CONFIG } from './testConfig';
import { buildAvailableSubAccounts } from './accountHelpers';

/**
 * Playwright global setup
 * - Check once if system is running batch via API
 * - Build shared availableSubAccounts for the test account
 * - Expose results through process.env for all tests
 */
async function globalSetup() {
    const loginApi = new LoginApi(TEST_CONFIG.WEB_LOGIN_URL);

    try {
        const isBatching = await loginApi.isSystemBatchingApi();
        process.env.IS_BATCHING = isBatching ? 'true' : 'false';
        console.log(`[GlobalSetup] IS_BATCHING = ${process.env.IS_BATCHING}`);
    } catch (error) {
        console.error('[GlobalSetup] Failed to check batch status, defaulting to non-batch mode.', error);
        // Nếu check batch fail thì coi như không chạy batch để không block toàn bộ test
        process.env.IS_BATCHING = 'false';
    }

    try {
        // Login một lần để lấy danh sách tiểu khoản khả dụng
        const availableSubAccounts = await loginApi.getAvailableSubAccountsApi();
        const availableSubAccountsFiltered = buildAvailableSubAccounts(availableSubAccounts.subAccounts);
        process.env.AVAILABLE_SUBACCOUNTS = JSON.stringify(availableSubAccountsFiltered);
        console.log(`[GlobalSetup] AVAILABLE_SUBACCOUNTS = ${process.env.AVAILABLE_SUBACCOUNTS}`);
    } catch (error) {
        console.error('[GlobalSetup] Failed to build available sub accounts.', error);
        process.env.AVAILABLE_SUBACCOUNTS = '[]';
    }
}

export default globalSetup;


