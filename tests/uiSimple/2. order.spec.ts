import { test, expect, Locator } from '@playwright/test';
import LoginPage from '../../page/ui/LoginPage';
import OrderPage from '../../page/ui/OrderPage';
import OrderBook from '../../page/ui/OrderBook';
import { getRandomStockCode, TEST_CONFIG, isSystemBatching } from '../utils/testConfig';
import { attachScreenshot } from '../../helpers/reporterHelper';
import LogoutPage from "../../page/ui/LogoutPage";
import { MarketApi } from '../../page/api/MarketApi';
import PortfolioPage from '../../page/ui/PortfolioPage';
import { TimeUtils } from '../../helpers/uiUtils';

const batching = isSystemBatching();

test.describe('Order Management Tests', () => {
  test.skip(batching, 'Hệ thống đang chạy batch - skip Order UI tests');

  let loginPage: LoginPage;
  let orderPage: OrderPage;
  let orderBook: OrderBook;
  let logoutPage: LogoutPage;
  let marketApi: MarketApi;
  let portfolioPage: PortfolioPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    orderPage = new OrderPage(page);
    orderBook = new OrderBook(page);
    marketApi = new MarketApi();
    logoutPage = new LogoutPage(page, loginPage);
    portfolioPage = new PortfolioPage(page);

    await loginPage.loginSuccess();
    expect(await loginPage.verifyLoginSuccess(TEST_CONFIG.TEST_USER)).toBeTruthy();
    await attachScreenshot(page, 'After Login');
    await orderPage.navigateToOrder();
  });

  test.afterEach(async ({ page }) => {
    await orderPage.closeOrder();
    await logoutPage.logout();
    expect(await logoutPage.verifyLogoutSuccess()).toBe(true);
    await attachScreenshot(page, 'After Logout');
  });

  test('TC_001: Check place and cancel a buy order', async () => {
    // Use random stock code from configuration
    const stockCode = getRandomStockCode();
    console.log(`Testing with stock code: ${stockCode}`);

    // Place buy order
    await orderPage.placeBuyOrder({ stockCode, quantity: 1 });

    const messageError = await orderPage.getMessage();
    if (messageError.description.includes('Hệ thống đang tạm dừng nhận lệnh, xin vui lòng quay lại sau.')) {
      console.log('Order placement failed:', messageError);
      return;
    }

    await orderPage.openOrderInDayTab();

    if (await orderPage.getStockCodeInDayRowData(0) !== stockCode) {
      throw new Error(messageError.title + ': ' + messageError.description);
    }

    expect(await orderPage.getStockCodeInDayRowData(0)).toBe(stockCode);
    console.log('stockCode in Table Order In Day:', await orderPage.getStockCodeInDayRowData(0));

    if (await orderBook.isModifyOrderEnabled(0) && await TimeUtils.checkDataWithTimeRange(new Date(), 9, 16, 14, 30)) {
      await orderBook.modifyOrder(0, undefined, 2);
      expect(await orderPage.getQuantityInDayRowData(0)).toBe("2");
    } else {
      console.warn("Trạng thái lệnh không cho phép sửa hoặc phiên ATO/ ATC")
    }

    if ((await TimeUtils.checkDataWithTimeRange(new Date(), 9, 0, 9, 15) || await TimeUtils.checkDataWithTimeRange(new Date(), 14, 30, 15, 0)) && !TimeUtils.isWeekend()) {
      console.warn("Phiên ATO/ATC ko được huỷ lệnh")
    } else {
      await orderBook.cancelOrder(0);
      expect(await orderPage.getStockCodeInDayRowData(0)).not.toBe(stockCode);
    }
  });
});