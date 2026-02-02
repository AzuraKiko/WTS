import { test, expect, type Page } from '@playwright/test';
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
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
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

  test.afterAll(async () => {
    await orderPage.closeOrder();
    await logoutPage.logout();
    expect(await logoutPage.verifyLogoutSuccess()).toBe(true);
    await attachScreenshot(page, 'After Logout');
    await page.close();
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
    } else if (messageError) {
      throw new Error(messageError.title + ': ' + messageError.description);
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
  });

  test('TC_002: Check place and cancel a sell order', async () => {
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
      if (messageError.description.includes('Hệ thống đang tạm dừng nhận lệnh, xin vui lòng quay lại sau.')) {
        console.log('Order placement failed:', messageError);
        return;
      } else if (messageError) {
        throw new Error(messageError.title + ': ' + messageError.description);
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
  });
});