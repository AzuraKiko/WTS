import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import LoginPage from '../../page/ui/LoginPage';
import AssetPage, { parseAsset, countAssetLabelMatches } from '../../page/ui/Asset';
import { NumberValidator } from '../../helpers/validationUtils';
import { WaitUtils, TableUtils } from '../../helpers/uiUtils';
import { compareApiRowWithUiRow } from '../../helpers/tableCompareUtils';

// import { ocrPipeline } from '../../page/ui/OcrPipeline';
import { TEST_CONFIG } from '../utils/testConfig';
import { attachScreenshot } from '../../helpers/reporterHelper';
import OrderPage from '../../page/ui/OrderPage';


function getCurrentMonthLabel(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 01 → 12
    const year = now.getFullYear();

    return `Tháng ${month}, ${year}`;
}


test.describe('Asset Summary Tests', () => {
    let loginPage: LoginPage;
    let assetPage: AssetPage;
    let orderPage: OrderPage;
    let page: Page;
    let context: BrowserContext;

    const overviewLabels = [
        'Tổng tài sản',
        'Tài sản ròng',
        'Tiền được rút',
        'Tiền có thể ứng',
        'Tổng dư nợ margin'
    ];
    const detailHeaders = [
        'Tiền mặt',
        'Chứng khoán niêm yết',
        'Phái sinh',
        'Trái phiếu OTC',
        'PineB',
        'Nợ'
    ];

    const compareNumericData = (actual: Record<string, string>, expected: Record<string, string>) => {
        Object.keys(expected).forEach((key) => {
            expect(NumberValidator.parseNumber(actual[key])).toBe(NumberValidator.parseNumber(expected[key]));
        });
    };


    const verifyOverviewLabels = async () => {
        for (const label of overviewLabels) {
            const metric = assetPage.overviewLocator
                .locator('.overview-metric')
                .filter({ hasText: label });
            await expect(metric).toBeVisible();
            await expect(metric.locator('.overview-metric__value')).toHaveText(/\S/);
        }
    };

    const verifyDetailHeaders = async () => {
        for (const header of detailHeaders) {
            const detailHeader = assetPage.viewAsset
                .locator('.personal-assets-header')
                .filter({ hasText: header })
                .first();
            await expect(detailHeader).toBeVisible();
            await expect(detailHeader.locator('.personal-assets-header__right')).toHaveText(/\S/);
        }
    };

    test.beforeAll(async ({ browser }) => {
        context = await browser.newContext({
            recordVideo: { dir: 'test-results' },
        });
        page = await context.newPage();
        loginPage = new LoginPage(page);
        assetPage = new AssetPage(page);
        orderPage = new OrderPage(page);

        await loginPage.loginSuccess();
        expect(await loginPage.verifyLoginSuccess(TEST_CONFIG.TEST_USER)).toBeTruthy();
        await assetPage.menu.openMenuHeader('Tài sản');
    });

    test.afterAll(async () => {
        await context.close();
    });


    test('TC_001: Check asset summary data', async () => {
        await assetPage.navigateToAssetSummary();

        const listSubAccountTabs = await assetPage.getListSubAccountTabs();

        for (const subAccountTab of listSubAccountTabs) {
            let subAccount = "";
            const alternateTab = listSubAccountTabs.find((tab) => tab !== subAccountTab);
            if (subAccountTab.includes('Tất cả')) {
                subAccount = '"subAcntNo":""';
            } else {
                subAccount = subAccountTab.split(' - ')[0].trim();
            }

            const apiResponse = await WaitUtils.getLatestResponseByBody(
                page,
                async () => {
                    if (alternateTab) {
                        await assetPage.clickSubAccountTab(alternateTab);
                    }
                    await assetPage.clickSubAccountTab(subAccountTab);
                },
                [
                    'getTotalAssetAll',
                    subAccount,
                ],
                '/CoreServlet.pt',
                20000
            );

            await expect(assetPage.overviewLocator).toBeVisible();

            await verifyOverviewLabels();
            await verifyDetailHeaders();

            if (!apiResponse) {
                console.log('No getTotalAssetAll response captured for', subAccountTab);
                continue;
            }

            const apiData = (await apiResponse.json()).data;
            const assetData = {
                totalAsset: apiData.totAsst,
                netAsset: apiData.realAsst,
                withdrawable: apiData.wdrawAvail,
                advanceAvail: apiData.advanceAvail,
                mgDebt: apiData.mgDebt,
            };

            // const assetResult = await ocrPipeline(page, {
            //     locator: assetPage.overviewLocator,
            //     zoomLevels: [0.98],
            //     ocrScale: 2,
            //     cropper: async () => {
            //         return await assetPage.cropAssetSummary();
            //     },
            //     parse: parseAsset,
            //     countMatches: countAssetLabelMatches,
            //     artifactPrefix: 'asset',
            //     minMatches: 4
            // });

            // expect(assetResult.success).toBeTruthy();

            const assetResult = await assetPage.getOverviewData();
            // console.log('assetResult', JSON.stringify(assetResult, null, 2));
            // console.log('assetData', JSON.stringify(assetData, null, 2));

            compareNumericData(assetResult, assetData);

            await attachScreenshot(page, `Asset Summary ${subAccountTab}`);
        }
    });


    test('TC_002: Check portfolio data', async () => {
        await assetPage.navigateToPortfolio();

        await verifyOverviewLabels();

        const tabActive = await assetPage.getTabActive();
        const listSubAccountTabs = await assetPage.getListSubAccountTabs();
        if (tabActive == "Tất cả tiểu khoản") {
            const alternateTab = listSubAccountTabs.find((tab) => tab !== tabActive);
            if (alternateTab) {
                await assetPage.clickSubAccountTab(alternateTab);
            }
        }
        const apiResponse = await WaitUtils.getLatestResponseByBody(
            page,
            async () => {
                await assetPage.clickSubAccountTab("Tất cả tiểu khoản");
            },
            ['getPositionsAll',
                '"subAcntNo":""',
            ],
            '/CoreServlet.pt',
            20000
        );

        if (!apiResponse) {
            console.log('No getPositionsAll response captured for Tất cả tiểu khoản');
            return;
        }

        const apiData = await apiResponse.json();
        const lists = apiData?.data || [];
        const portfolioData = lists.map((list: any) => {
            return {
                stockCode: list.symbol,
                quantity: list.balQty,
                transaction: list.trdAvailQty,
                dividendQuantity: list.devidendQty,
                pendingDelivery: list.sellTn,
                pendingTrade: list.waitTrdQty,
                buyT2: list.buyT2,
                buyT1: list.buyT1,
                buyT0: list.buyT0,
                avgPrice: list.avgPrice,
                currentPrice: Math.round(Number(list.lastPrice) * 100) / 100,
                change: (Math.round((Number(list.change) / 1000) * 100) / 100).toFixed(2),
                changePercent: list.changePC,
                initialValue: list.totBuyAmt,
                marketValue: list.totCurAmt,
                profitLoss: list.gainLoss,
                profitLossPercent: list.gainLossPc
            }
        })

        // Check total portfolio data
        const toataPortfolio = lists.find((list: any) => list.symbol == "TOTAL")
        const totalPortfolioAPI = {
            initialValue: toataPortfolio.totBuyAmt,
            marketValue: toataPortfolio.totCurAmt,
            profitLoss: toataPortfolio.gainLoss,
            profitLossPercent: (Math.round(Number(toataPortfolio.gainLossPc) * 100) / 100).toFixed(2),
        };
        const totalPortfolioUI = await assetPage.getPortfolioTotalData('Chứng khoán niêm yết');
        Object.keys(totalPortfolioAPI).forEach((key) => {
            expect(NumberValidator.parseNumber(totalPortfolioAPI[key])).toEqual(NumberValidator.parseNumber(totalPortfolioUI[key]));
        });

        // Check portfolio data
        const table = await assetPage.getTableByText('Chứng khoán niêm yết');
        const tableHeaders = table.tableHeaders;
        const tableRows = table.tableRows;
        if (!tableHeaders || !tableRows) {
            console.log('No table found for Chứng khoán niêm yết');
            return;
        }

        const uiRows = await TableUtils.getTableRowObjects(page, tableHeaders, tableRows, undefined, false);
        if (!uiRows.length) {
            console.log('No UI rows found for Listed securities Portfolio');
            return;
        }

        const columnMap = {
            stockCode: 'Mã CK',
            quantity: 'Tổng KL',
            transaction: 'GD',
            dividendQuantity: 'KL cổ tức',
            pendingDelivery: 'Chờ giao',
            pendingTrade: 'CK chờ GD',
            buyT2: 'Mua T2',
            buyT1: 'Mua T1',
            buyT0: 'Mua T0',
            avgPrice: 'TB',
            currentPrice: 'Giá TT',
            change: 'Thay đổi',
            changePercent: 'Thay đổi %',
            initialValue: 'Giá trị ban đầu',
            marketValue: 'Giá trị thị trường',
            profitLoss: 'Lãi/lỗ',
            profitLossPercent: '% Lãi/lỗ'
        };

        if (!portfolioData.length) {
            console.log('No API data found for Listed securities Portfolio');
            return;
        }

        // console.log('portfolioData', JSON.stringify(portfolioData, null, 2));
        // console.log('uiRows', JSON.stringify(uiRows, null, 2));

        const numericKeys = Object.keys(columnMap).filter(key => key !== 'stockCode');
        const mismatches = compareApiRowWithUiRow(
            portfolioData[0],
            uiRows[0],
            columnMap,
            numericKeys
        );
        expect(mismatches, mismatches.join('\n')).toEqual([]);


        await attachScreenshot(page, `Portfolio ${tabActive}`);
    });

    test('TC_003: Check investment performance data', async () => {
        await assetPage.navigateToInvestmentPerformance();

        const listSubAccountTabs = await assetPage.getListSubAccountTabs();
        for (const subAccountTab of listSubAccountTabs) {
            await assetPage.clickSubAccountTab(subAccountTab);
            const performanceSection = page.locator('.personal-assets.performance');
            await expect(performanceSection).toBeVisible();

            if (subAccountTab.toLowerCase().includes('folio')) {
                await expect(page.getByText('Dữ liệu không hỗ trợ cho tiểu khoản Pinefolio')).toBeVisible();
                await attachScreenshot(page, `Investment Performance ${subAccountTab}`);

            } else {
                await expect(performanceSection).toContainText('Dữ liệu khả dụng từ');
                await expect(performanceSection).toContainText('Hiệu suất đầu tư (tính theo phương pháp TWR (%) và chỉ mang tính tham khảo, nhà đầu tư có thể cân nhắc lựa chọn tính toán riêng cho mình. PInetree không chịu trách nhiệm về những khác biệt giữa các phương pháp tính toán hiệu suất khác nhau. Dữ liệu dựa trên tính toán từ dữ liệu trong quá khứ và không mang tính khuyến nghị để đưa ra quyết định đầu tư');

                const peformanceTab = await assetPage.getListPerformanceTabs();
                for (const tab of peformanceTab) {
                    await assetPage.clickPerformanceTab(tab);
                    // Check calendar chart
                    await assetPage.selectCalendarChart();
                    const calendar = performanceSection.locator('.pnl-calendar');
                    await expect(calendar).toBeVisible();

                    const monthLabel = calendar.locator('.btn-sm:first-of-type ~ div');
                    await expect(monthLabel).toBeVisible();
                    const expectedMonth = getCurrentMonthLabel();
                    await expect(monthLabel).toHaveText(expectedMonth);

                    const dayCells = calendar.locator('.cal-day');
                    await expect(dayCells.first()).toBeVisible();
                    await expect(dayCells.first()).toHaveText(/\S/);

                    // const pnlCells = calendar.locator('.cal-pnl').filter({ hasText: /\S/ });
                    // const pnlCount = await pnlCells.count();
                    // expect(pnlCount).toBeGreaterThan(0);
                    await attachScreenshot(page, `Investment Performance Calendar Chart ${tab} of ${subAccountTab}`);

                    // Check line chart
                    await assetPage.selectLineChart();
                    if (!(await page.getByText('Không có dữ liệu!').isVisible())) {
                        const lineChart = performanceSection.locator('[data-highcharts-chart]');
                        await expect(lineChart).toBeVisible();
                        await attachScreenshot(page, `Investment Performance Line Chart ${tab} of ${subAccountTab}`);
                    }

                }

            }
        }

    });
});