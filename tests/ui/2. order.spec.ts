import { test, expect } from '@playwright/test';
import LoginPage from '../../page/ui/LoginPage';
import OrderPage from '../../page/ui/OrderPage';
import OrderBook from '../../page/ui/OrderBook';
import { getRandomStockCode, TEST_CONFIG } from '../utils/testConfig';
import { attachScreenshot } from '../../helpers/reporterHelper';
import LogoutPage from "../../page/ui/LogoutPage";
import { MarketApi } from '../../page/api/MarketApi';
import PortfolioPage from '../../page/ui/PorfolioPage';



test.describe('Order Management Tests', () => {
  let loginPage: LoginPage;
  let orderPage: OrderPage;
  let orderBook: OrderBook;
  let logoutPage: LogoutPage;
  let marketApi: MarketApi;
  let portfolioPage: PortfolioPage;

  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    orderPage = new OrderPage(page);
    orderBook = new OrderBook(page);
    marketApi = new MarketApi();
    logoutPage = new LogoutPage(page, loginPage);
    portfolioPage = new PortfolioPage(page);

    // Login before each test
    await loginPage.loginSuccess();
    expect(await loginPage.verifyLoginSuccess(TEST_CONFIG.TEST_USER)).toBeTruthy();
    await attachScreenshot(page, 'After Login');
  });

  test('Check place and cancel a order', async ({ page }) => {
    await orderPage.navigateToOrder();
    // Use random stock code from configuration
    const stockCode = getRandomStockCode();
    console.log(`Testing with stock code: ${stockCode}`);

    // Place buy order
    await orderPage.placeBuyOrder({ stockCode, quantity: 1 });

    const messageError = await orderPage.getMessage();
    if (messageError.title.includes('Đặt lệnh không thành công')) {
      console.log('Order placement failed:', messageError);
    } else {
      await orderPage.openOrderInDayTab();
      expect(await orderPage.getStockCodeInDayRowData(0)).toBe(stockCode);

      if (await orderBook.isModifyOrderEnabled(0)) {
        await orderBook.modifyOrder(0, undefined, 2);
        expect(await orderPage.getQuantityInDayRowData(0)).toBe("2");
      } else {
        console.warn("Trạng thái lệnh không cho phép sửa")
      }

      await orderBook.cancelOrder(0);
      expect(await orderPage.getStockCodeInDayRowData(0)).not.toBe(stockCode);
    }

    // Sell order from portfolio
    await portfolioPage.navigateToPortfolio();
    const isNoData = await portfolioPage.verifyNoDataMessage();

    if (isNoData) {
      console.log("Portfolio is empty");
    } else {
      const usedStockCode = await orderPage.placeSellOrderFromPorfolio({ quantity: 1 });
      await orderPage.openOrderInDayTab();
      expect(await orderPage.getStockCodeInDayRowData(0)).toBe(usedStockCode);
      const messageError = await orderPage.getMessage();
      if (messageError.title.includes('Đặt lệnh không thành công')) {
        console.log('Order placement failed:', messageError);
      } else {
        if (await orderBook.isModifyOrderEnabled(0)) {
          const priceText = await orderPage.priceFloor.textContent();
          const newPrice = Number(priceText) + 0.1;
          await orderBook.modifyOrder(0, newPrice, undefined);
          expect(await orderPage.getPriceInDayRowData(0)).toBe(newPrice.toString());
        } else {
          console.warn("Trạng thái lệnh không cho phép sửa")
        }

        await orderBook.cancelOrder(0);
        expect(await orderPage.getStockCodeInDayRowData(0)).not.toBe(usedStockCode);
      }
    }

    // Close order and logout
    await orderPage.closeOrder();
    await logoutPage.logout();
    expect(await logoutPage.verifyLogoutSuccess()).toBe(true);
    await attachScreenshot(page, 'After Logout');
  });
});