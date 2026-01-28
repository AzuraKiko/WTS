import { test, expect } from '@playwright/test';
import LoginPage from '../../page/ui/LoginPage';
import OrderPage from '../../page/ui/OrderPage';
import OrderBook from '../../page/ui/OrderBook';
import { getRandomStockCode, TEST_CONFIG } from '../utils/testConfig';
import { attachScreenshot } from '../../helpers/reporterHelper';
import LogoutPage from "../../page/ui/LogoutPage";



test.describe('Order Management Tests', () => {
  let loginPage: LoginPage;
  let orderPage: OrderPage;
  let orderBook: OrderBook;
  let logoutPage: LogoutPage;

  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    orderPage = new OrderPage(page);
    orderBook = new OrderBook(page);
    logoutPage = new LogoutPage(page, loginPage);

    // Login before each test
    await loginPage.loginSuccess();
    expect(await loginPage.verifyLoginSuccess(TEST_CONFIG.TEST_USER)).toBeTruthy();
    await attachScreenshot(page, 'After Login');
    await orderPage.navigateToOrder();
  });

  test('Check place and cancel a buy order', async ({ }) => {
    // Use random stock code from configuration
    const stockCode = getRandomStockCode();
    console.log(`Testing with stock code: ${stockCode}`);

    try {
      // Execute complete order flow
      await orderPage.placeBuyOrder({ stockCode, quantity: 1 });
      await orderPage.verifyMessageOrder(['Đặt lệnh thành công', 'Thông báo'], ['Số hiệu lệnh', 'thành công']);

      await orderPage.openOrderInDayTab();
      expect((await orderBook.getOrderTableData())[0].stockCode).toBe(stockCode);

      if ((await orderBook.hasActionButtons(0)).hasModify) {
        await orderBook.modifyOrder(0, undefined, 2);
        await orderPage.verifyMessageOrder(['Sửa lệnh thành công', 'Thông báo'], ['Số hiệu lệnh', 'thành công']);
      } else {
        console.warn("Trạng thái lệnh không cho phép sửa")
      }
      await orderBook.cancelOrder(0);
      await orderPage.verifyMessageOrder(['Hủy lệnh thành công', 'Thông báo'], ['Số hiệu lệnh', 'thành công']);

    } catch {
      await orderPage.placeBuyOrder({ stockCode, quantity: 1 });
      await orderPage.verifyMessageOrder(['Đặt lệnh không thành công'], ['Error: Hệ thống đang tạm dừng nhận lệnh, xin vui lòng quay lại sau.']);
    }
  });

  test('Check place and cancel a sell order', async ({ }) => {
    try {
      await orderPage.placeSellOrderFromPorfolio();
      await orderPage.verifyMessageOrder(['Đặt lệnh thành công', 'Thông báo'], ['Số hiệu lệnh', 'thành công']);

      if ((await orderBook.hasActionButtons(0)).hasModify) {
        await orderBook.modifyOrder(0, undefined, 2);
        await orderPage.verifyMessageOrder(['Sửa lệnh thành công', 'Thông báo'], ['Số hiệu lệnh', 'thành công']);
      } else {
        console.warn("Trạng thái lệnh không cho phép sửa")
      }

      await orderBook.cancelOrder(0);
      await orderPage.verifyMessageOrder(['Hủy lệnh thành công', 'Thông báo'], ['Số hiệu lệnh', 'thành công']);

    } catch {
      await orderPage.placeSellOrderFromPorfolio();
      await orderPage.verifyMessageOrder(['Đặt lệnh không thành công'], ['Error: Hệ thống đang tạm dừng nhận lệnh, xin vui lòng quay lại sau.']);
    }
  });

  test('Check logout', async ({ page }) => {
    await logoutPage.logout();
    expect(await logoutPage.verifyLogoutSuccess()).toBe(true);
    await attachScreenshot(page, 'After Logout');
  });
});