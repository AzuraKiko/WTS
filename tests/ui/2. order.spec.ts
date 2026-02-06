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
  console.warn('Thông báo: Hệ thống đang chạy batch - skip Order UI tests');
  
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

    if (await TimeUtils.checkDataWithTimeRange(new Date(), 9, 0, 9, 15) || await TimeUtils.checkDataWithTimeRange(new Date(), 14, 30, 15, 0)) {
      console.warn("Phiên ATO/ATC ko được huỷ lệnh")
    } else {
      await orderBook.cancelOrder(0);
      expect(await orderPage.getStockCodeInDayRowData(0)).not.toBe(stockCode);
    }
  });

  //   test('TC_002: Check place and cancel a sell order', async () => {
  //     // Sell order from portfolio
  //     await portfolioPage.navigateToPortfolio();
  //     const tableRows: Locator = portfolioPage.portfolioTableBody.locator('tr');

  //     if (await tableRows.count() === 0) {
  //       console.log("Portfolio is empty");
  //       return;
  //     }

  //     const quantity = tableRows.locator('td:nth-child(2)')

  //     const getTextList = async (locator: Locator): Promise<string[]> =>
  //       locator
  //         .allTextContents()
  //         .then(texts => texts.map(text => text.trim()).filter(Boolean));

  //     const quantitys = await getTextList(quantity);
  //     const hasQuantity = quantitys.some(text => {
  //       const value = Number(text.replace(/,/g, ''));
  //       return Number.isFinite(value) && value >= 1;
  //     });
  //     if (!hasQuantity) {
  //       console.log('Wait pending stock code to be available:', quantitys);
  //       return;
  //     }

  //     const usedStockCode = await orderPage.placeSellOrderFromPorfolio({ quantity: 1 });
  //     await orderPage.openOrderInDayTab();
  //     expect(await orderPage.getStockCodeInDayRowData(0)).toBe(usedStockCode);
  //     const messageError = await orderPage.getMessage();
  //     if (messageError.description.includes('Hệ thống đang tạm dừng nhận lệnh, xin vui lòng quay lại sau.')) {
  //       console.log('Order placement failed:', messageError);
  //       return;
  //     } else if (orderPage.titleMessage && orderPage.descriptionMessage) {
  //       if (await orderBook.isModifyOrderEnabled(0) && await TimeUtils.checkDataWithTimeRange(new Date(), 9, 16, 14, 30)) {
  //         const priceText = await orderPage.priceCeil.textContent();
  //         const newPrice = Number(priceText) - 0.1;
  //         await orderBook.modifyOrder(0, newPrice, undefined);
  //         expect(await orderPage.getPriceInDayRowData(0)).toBe(newPrice.toString());
  //       } else {
  //         console.warn("Trạng thái lệnh không cho phép sửa hoặc phiên ATO/ ATC")
  //       }

  //       if (await TimeUtils.checkDataWithTimeRange(new Date(), 9, 0, 9, 15) || await TimeUtils.checkDataWithTimeRange(new Date(), 14, 30, 14, 45)) {
  //         console.warn("Phiên ATO/ATC ko được huỷ lệnh")
  //       } else {
  //         await orderBook.cancelOrder(0);
  //         expect(await orderPage.getStockCodeInDayRowData(0)).not.toBe(usedStockCode);
  //       }
  //     }
  //     else {
  //       throw new Error(messageError.title + ': ' + messageError.description);
  //     }
  //   });
});