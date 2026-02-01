import { test, expect } from '@playwright/test';
import LoginPage from '../../page/ui/LoginPage';
import AssetPage, { parseAsset, countAssetLabelMatches } from '../../page/ui/Asset';
import { NumberValidator } from '../../helpers/validationUtils';
import { WaitUtils, TableUtils } from '../../helpers/uiUtils';
import { parseCsvFile, mapCsvRows, compareApiRowWithCsvRow } from '../../helpers/csvUtils';

import { ocrPipeline } from '../../page/ui/ocrPipeline';
import { TEST_CONFIG } from '../utils/testConfig';
import { attachScreenshot } from '../../helpers/reporterHelper';

test.describe('Asset Summary test', () => {
    let loginPage: LoginPage;
    let assetPage: AssetPage;
    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        assetPage = new AssetPage(page);

        await loginPage.loginSuccess();
        expect(await loginPage.verifyLoginSuccess(TEST_CONFIG.TEST_USER)).toBeTruthy();
    });

    test('Test data asset overview match API', async ({ page }) => {
        await assetPage.navigateToAssetSummary();

        const listSubAccountTabs = await assetPage.getListSubAccountTabs();
        const compareNumericData = (actual: Record<string, string>, expected: Record<string, string>) => {
            Object.keys(expected).forEach((key) => {
                expect(NumberValidator.parseNumber(actual[key])).toBe(NumberValidator.parseNumber(expected[key]));
            });
        };

        for (const subAccountTab of listSubAccountTabs) {
            let subAccount = "";
            const alternateTab = listSubAccountTabs.find((tab) => tab !== subAccountTab);
            if (subAccountTab.includes('Tất cả')) {
                subAccount = "";
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


            const assetResult = await ocrPipeline(page, {
                locator: assetPage.overviewLocator,
                zoomLevels: [0.98],
                ocrScale: 1.5,
                cropper: async () => {
                    return await assetPage.cropAssetSummary();
                },
                parse: parseAsset,
                countMatches: countAssetLabelMatches,
                artifactPrefix: 'asset',
                minMatches: 4
            });

            expect(assetResult.success).toBeTruthy();
            compareNumericData(assetResult.data, assetData);

            await attachScreenshot(page, `Asset Summary ${subAccountTab}`);
        }
    });
    test('Test display data asset overview', async ({ page }) => {
        await assetPage.navigateToAssetSummary();

        const listSubAccountTabs = await assetPage.getListSubAccountTabs();
        for (const subAccountTab of listSubAccountTabs) {
            await assetPage.clickSubAccountTab(subAccountTab);
            await expect(assetPage.overviewLocator).toBeVisible();

            const overviewLabels = [
                'Tổng tài sản',
                'Tài sản ròng',
                'Tiền được rút',
                'Tiền có thể ứng',
                'Tổng dư nợ margin'
            ];
            for (const label of overviewLabels) {
                const metric = assetPage.overviewLocator
                    .locator('.overview-metric')
                    .filter({ hasText: label });
                await expect(metric).toBeVisible();
                await expect(metric.locator('.overview-metric__value')).toHaveText(/\S/);
            }

            const detailHeaders = [
                'Tiền mặt',
                'Chứng khoán niêm yết',
                'Phái sinh',
                'Trái phiếu OTC',
                'PineB',
                'Nợ'
            ];
            for (const header of detailHeaders) {
                const detailHeader = assetPage.viewAsset
                    .locator('.personal-assets-header')
                    .filter({ hasText: header })
                    .first();
                await expect(detailHeader).toBeVisible();
                // Check data not empty
                await expect(detailHeader.locator('.personal-assets-header__right')).toHaveText(/\S/);
            }
        }
    });
    test('Test danh mục đầu tư', async ({ page }) => {
        await assetPage.navigateToPortfolio();

        const overviewLabels = [
            'Tổng tài sản',
            'Tài sản ròng',
            'Tiền được rút',
            'Tiền có thể ứng',
            'Tổng dư nợ margin'
        ];
        for (const label of overviewLabels) {
            const metric = assetPage.overviewLocator
                .locator('.overview-metric')
                .filter({ hasText: label });
            await expect(metric).toBeVisible();
            await expect(metric.locator('.overview-metric__value')).toHaveText(/\S/);
        }

        const tabActive = await assetPage.getTabActive();
        const allSubAccountTab = (await assetPage.getListSubAccountTabs()).find((tab) => tab == "Tất cả tiểu khoản") || "";
        const apiResponse = await WaitUtils.getLatestResponseByBody(
            page,
            async () => {
                if (tabActive !== "Tất cả tiểu khoản") {
                    await assetPage.clickSubAccountTab("Tất cả tiểu khoản");
                }
            },
            ['getTotalAssetAll',
                allSubAccountTab,
            ],
            '/CoreServlet.pt',
            20000
        );

        if (!apiResponse) {
            console.log('No getTotalAssetAll response captured for Tất cả tiểu khoản');
            return;
        }

        const apiData = (await apiResponse.json());
        const lists = apiData?.data?.data?.lists || [];
        const portfolioData = lists.map((list: any) => {
            return {
                stockCode: list.stockCode,
                quantity: list.quantity,
                transaction: list.transaction,
                dividendQuantity: list.dividendQuantity,
                pendingDelivery: list.pendingDelivery,
                pendingTrade: list.pendingTrade,
                buyT2: list.buyT2,
                buyT1: list.buyT1,
                buyT0: list.buyT0,
                avgPrice: list.avgPrice,
                currentPrice: list.currentPrice,
                change: list.change,
                changePercent: list.changePercent,
                initialValue: list.initialValue,
                marketValue: list.marketValue,
                profitLoss: list.profitLoss,
                profitLossPercent: list.profitLossPercent
            }
        })



        const table = await assetPage.getTableByText('Chứng khoán niêm yết');
        const tableHeaders = table.tableHeaders;
        const tableRows = table.tableRows;
        if (!tableHeaders || !tableRows) {
            console.log('No table found for Chứng khoán niêm yết');
            return;
        }

        await TableUtils.exportTableToCsv(page, tableHeaders, tableRows, 'Listed securities Portfolio.csv', undefined, false);

        const csvFilePath = 'playwright/data/Listed securities Portfolio.csv';
        const csvTable = await parseCsvFile(csvFilePath);
        const csvRows = mapCsvRows(csvTable.headers, csvTable.rows);
        if (!csvRows.length) {
            console.log('No CSV rows found for Listed securities Portfolio');
            return;
        }

        if (!portfolioData.length) {
            console.log('No API data found for Listed securities Portfolio');
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

        const numericKeys = Object.keys(columnMap).filter(key => key !== 'stockCode');
        const mismatches = compareApiRowWithCsvRow(
            portfolioData[0],
            csvRows[0],
            columnMap,
            numericKeys
        );
        expect(mismatches, mismatches.join('\n')).toEqual([]);

    });
})