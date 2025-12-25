import { test, expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";
import AssetApi from "../../page/api/AssetApi";
import PositionsApi from "../../page/api/PositionsApi";
import LoginApi from "../../page/api/LoginApi";
import { getENVConfigs, ENVConfig, saveENVResults } from "../utils/testConfig";
import { ApiAssetUtils } from "../../helpers/apiAssetUtils";

// Get all user configurations
const userConfigs = getENVConfigs();
console.log("userConfigs", userConfigs);

// Common function to process asset data for any test scenario
async function processAssetData(
    assetApi: AssetApi,
    positionsApi: PositionsApi,
    loginResponse: any,
    baseParams: any
) {
    // Get main asset data
    const response = await assetApi.getTotalAssetAll({
        ...baseParams,
        subAcntNo: "null",
        rqId: uuidv4(),
    });

    expect(response).toBeDefined();
    expect(response.status).toBe(200);

    const data = response.data.data;
    const result: any = {
        ...ApiAssetUtils.formatAssetData(data),
        ...ApiAssetUtils.calculatePercentages(data),
    };

    // Prepare account lists for parallel processing
    const baseAccounts = [loginResponse.subAcntNormal, loginResponse.subAcntMargin];
    const optionalAccounts: any[] = [];

    if (loginResponse.subAcntDerivative) {
        optionalAccounts.push(loginResponse.subAcntDerivative);
    }
    if (loginResponse.subAcntFolio) {
        optionalAccounts.push(loginResponse.subAcntFolio);
    }

    const allAccounts: any = [...baseAccounts, ...optionalAccounts];
    const allPositionAccounts: any = ["", ...allAccounts];

    // Process all accounts and positions in parallel
    const [accountResults, positionResults] = await Promise.all([
        ApiAssetUtils.processMultipleAccounts(assetApi, baseParams, allAccounts, data.realAsst),
        ApiAssetUtils.processMultiplePositions(positionsApi, baseParams, allPositionAccounts)
    ]);

    // Assign account results
    result.normalAccount = accountResults[0].account;
    result.percentNormalAccount = accountResults[0].percent;
    result.marginAccount = accountResults[1].account;
    result.percentMarginAccount = accountResults[1].percent;

    result.normalAccountCash = accountResults[0].cash;
    result.marginAccountCash = accountResults[1].cash;

    let accountIndex = 2;
    if (loginResponse.subAcntDerivative) {
        result.derivativeAccount = accountResults[accountIndex].account;
        result.derivativeAccountCash = accountResults[accountIndex].cash;
        result.percentDerivativeAccount = accountResults[accountIndex].percent;
        accountIndex++;
    } else {
        console.log("No derivative account");
    }

    if (loginResponse.subAcntFolio) {
        result.folioAccount = accountResults[accountIndex].account;
        result.folioAccountCash = accountResults[accountIndex].cash;
        result.percentFolioAccount = accountResults[accountIndex].percent;
    } else {
        console.log("No folio account");
    }

    // Calculate total account sum based on available sub-accounts
    const calculateTotalAccountValue = (result: any, loginResponse: any): number => {
        const baseAccounts = [
            ApiAssetUtils.safeNumber(result.normalAccount),
            ApiAssetUtils.safeNumber(result.marginAccount)
        ];

        const optionalAccounts: any[] = [];
        if (loginResponse.subAcntDerivative) {
            optionalAccounts.push(ApiAssetUtils.safeNumber(result.derivativeAccount));
        }
        if (loginResponse.subAcntFolio) {
            optionalAccounts.push(ApiAssetUtils.safeNumber(result.folioAccount));
        }

        return baseAccounts.concat(optionalAccounts).reduce((sum, value) => sum + value, 0);
    };

    const calculateTotalAccountCash = (result: any, loginResponse: any): number => {
        const baseAccounts = [
            ApiAssetUtils.safeNumber(result.normalAccountCash),
            ApiAssetUtils.safeNumber(result.marginAccountCash)
        ];

        const optionalAccounts: any[] = [];
        if (loginResponse.subAcntDerivative) {
            optionalAccounts.push(ApiAssetUtils.safeNumber(result.derivativeAccountCash));
        }
        if (loginResponse.subAcntFolio) {
            optionalAccounts.push(ApiAssetUtils.safeNumber(result.folioAccountCash));
        }

        return baseAccounts.concat(optionalAccounts).reduce((sum, value) => sum + value, 0);
    };

    const totalAccountValue: number = calculateTotalAccountValue(data, loginResponse);
    const expectedNAV: number = ApiAssetUtils.safeNumber(data.nav);
    expect(totalAccountValue).toEqual(expectedNAV);

    const sumAsset: number = ApiAssetUtils.safeNumber(data.cash) + ApiAssetUtils.safeNumber(data.stockValue)
        + ApiAssetUtils.safeNumber(data.pineBndValue) + ApiAssetUtils.safeNumber(data.drvtVsdAmt);
    const expectedTotalAsset: number = ApiAssetUtils.safeNumber(data.totAsst);
    expect(sumAsset).toEqual(expectedTotalAsset);

    const sumAccountCash: number = calculateTotalAccountCash(result, loginResponse);
    expect(sumAccountCash).toEqual(ApiAssetUtils.safeNumber(data.cash) - ApiAssetUtils.safeNumber(data.cashDiv));

    const sumDebt: number = ApiAssetUtils.safeNumber(data.fee) +
        (ApiAssetUtils.safeNumber(data.mgDebt) + ApiAssetUtils.safeNumber(data.exptDisbm));
    const expectedTotalDebt: number = ApiAssetUtils.safeNumber(data.debt);
    expect(sumDebt).toEqual(expectedTotalDebt);

    // Assign position results
    result.gainLoss = positionResults[0].gainLoss;
    result.percentGainLoss = positionResults[0].percentGainLoss;
    result.gainLossNormal = positionResults[1].gainLoss;
    result.percentGainLossNormal = positionResults[1].percentGainLoss;
    result.gainLossMargin = positionResults[2].gainLoss;
    result.percentGainLossMargin = positionResults[2].percentGainLoss;

    let positionIndex = 3;
    if (loginResponse.subAcntDerivative) {
        result.gainLossDerivative = positionResults[positionIndex].gainLoss;
        result.percentGainLossDerivative = positionResults[positionIndex].percentGainLoss;
        positionIndex++;
    } else {
        console.log("No derivative account");
    }

    if (loginResponse.subAcntFolio) {
        result.gainLossFolio = positionResults[positionIndex].gainLoss;
        result.percentGainLossFolio = positionResults[positionIndex].percentGainLoss;
    } else {
        console.log("No folio account");
    }

    return result;
}

// Helper function to run tests for a specific user
async function runAssetTestsForUser(userConfig: ENVConfig) {
    console.log(`\n=== Starting tests for user: ${userConfig.user} ===`);

    // Create API instances for this user
    const assetApi = new AssetApi({ baseUrl: userConfig.url });
    const positionsApi = new PositionsApi({ baseUrl: userConfig.url });
    const loginApi = new LoginApi(userConfig.url);

    let loginResponse: any;

    try {
        // Login for this user using their specific credentials
        loginResponse = await loginApi.loginWithConfig(userConfig, "Matrix");
        console.log(`Login successful for user: ${userConfig.user}`);
        console.log(`Login response: ${loginResponse}`);

        const baseParams: any = {
            user: userConfig.user,
            session: loginResponse.session,
            acntNo: loginResponse.acntNo,
        };

        //--------------------------------------------------------------------------------------------------------------------------
        // Test 1: Get total asset all
        console.log("Running total asset test...");
        const result: any = await processAssetData(assetApi, positionsApi, loginResponse, baseParams);

        // Build and log card data
        const cardData: any = ApiAssetUtils.buildOverviewData(result);
        ApiAssetUtils.logOverviewData(cardData);

        // Save results to JSON file
        saveENVResults(userConfig, cardData, "total_asset_all");

        //--------------------------------------------------------------------------------------------------------------------------
        // Test 2: Normal account details
        console.log("Running normal account test...");
        const normalResponse: any = await assetApi.getTotalAssetAll({
            ...baseParams,
            subAcntNo: loginResponse.subAcntNormal,
            rqId: uuidv4(),
        });

        expect(normalResponse).toBeDefined();
        expect(normalResponse.status).toBe(200);

        const normalData: any = normalResponse.data.data;
        const normalResult: any = ApiAssetUtils.normalAccountData(normalData);
        const normalPositionResults: any = await ApiAssetUtils.processPositionData(positionsApi, baseParams, loginResponse.subAcntNormal);

        // Fix: Use raw numeric values from API response instead of formatted strings
        const sumNormalAsset: number = ApiAssetUtils.safeNumber(normalData.cash) +
            ApiAssetUtils.safeNumber(normalData.stockValue) +
            ApiAssetUtils.safeNumber(normalData.pineBndValue);
        const expectedTotalNormalAsset: number = ApiAssetUtils.safeNumber(normalData.totAsst);
        expect(sumNormalAsset).toEqual(expectedTotalNormalAsset);

        const sumNormalCash: number = ApiAssetUtils.safeNumber(normalData.balance) +
            ApiAssetUtils.safeNumber(normalData.advanceAvail) +
            ApiAssetUtils.safeNumber(normalData.cashDiv) -
            (ApiAssetUtils.safeNumber(normalData.buyT0) - ApiAssetUtils.safeNumber(normalData.exptDisbm)) +
            ApiAssetUtils.safeNumber(normalData.ipCash) -
            ApiAssetUtils.safeNumber(normalData.drvtOdFee);

        const expectedNormalTotalCash: number = ApiAssetUtils.safeNumber(normalData.cash)
        expect(sumNormalCash).toEqual(expectedNormalTotalCash);

        // const sumNormalStock: number = ApiAssetUtils.safeNumber(normalData.tavlStockValue) +
        //     ApiAssetUtils.safeNumber(normalData.ptavlStockValue) +
        //     ApiAssetUtils.safeNumber(normalData.tartStockValue) +
        //     ApiAssetUtils.safeNumber(normalData.ptartStockValue) +
        //     ApiAssetUtils.safeNumber(normalData.righStockValue) +
        //     ApiAssetUtils.safeNumber(normalData.rcvStockValue);
        // const expectedNormalTotalStock: number = ApiAssetUtils.safeNumber(normalData.stockValue)
        // expect(sumNormalStock).toEqual(expectedNormalTotalStock);

        // const sumNormalPineB: number = ApiAssetUtils.safeNumber(normalData.originInvest) + ApiAssetUtils.safeNumber(normalData.traiTucDaNhan) + ApiAssetUtils.safeNumber(normalData.traiTucSeNhan)
        // const expectedNormalTotalPineB: number = ApiAssetUtils.safeNumber(normalData.pineBndValue);
        // expect(sumNormalPineB).toEqual(expectedNormalTotalPineB);

        const sumNormalDebt: number = ApiAssetUtils.safeNumber(normalData.smsFee) + ApiAssetUtils.safeNumber(normalData.depoFee);
        const expectedNormalTotalDebt: number = ApiAssetUtils.safeNumber(normalData.debt);
        expect(sumNormalDebt).toEqual(expectedNormalTotalDebt);

        normalResult.gainLossNormal = normalPositionResults.gainLoss;
        normalResult.percentGainLossNormal = normalPositionResults.percentGainLoss;

        const normalHoldStockResults: any = await ApiAssetUtils.getHoldStockData(positionsApi, baseParams, loginResponse.subAcntNormal);
        normalResult.holdStock = normalHoldStockResults;

        // Build and log card data
        const cardDataNormal: any = ApiAssetUtils.buildNormalAccountData(normalResult);
        ApiAssetUtils.logNormalAccountData(cardDataNormal);

        // Save results to JSON file
        saveENVResults(userConfig, cardDataNormal, "normal_account");

        //--------------------------------------------------------------------------------------------------------------------------
        //    Test 3: Margin account details
        console.log("Running margin account test...");
        const marginResponse = await assetApi.getTotalAssetAll({
            ...baseParams,
            subAcntNo: loginResponse.subAcntMargin,
            rqId: uuidv4(),
        });

        expect(marginResponse).toBeDefined();
        expect(marginResponse.status).toBe(200);

        const marginData: any = marginResponse.data.data;
        const marginResult: any = ApiAssetUtils.marginAccountData(marginData);

        const marginPositionResults: any = await ApiAssetUtils.processPositionData(positionsApi, baseParams, loginResponse.subAcntMargin);
        marginResult.gainLossMargin = marginPositionResults.gainLoss;
        marginResult.percentGainLossMargin = marginPositionResults.percentGainLoss;

        const marginHoldStockResults: any = await ApiAssetUtils.getHoldStockData(positionsApi, baseParams, loginResponse.subAcntMargin);
        marginResult.holdStock = marginHoldStockResults;

        const sumMarginCash: number = ApiAssetUtils.safeNumber(marginData.balance) +
            ApiAssetUtils.safeNumber(marginData.advanceAvail) +
            ApiAssetUtils.safeNumber(marginData.cashDiv) -
            (ApiAssetUtils.safeNumber(marginData.buyT0) - ApiAssetUtils.safeNumber(marginData.exptDisbm)) +
            ApiAssetUtils.safeNumber(marginData.ipCash) -
            ApiAssetUtils.safeNumber(marginData.drvtOdFee);
        const expectedMarginTotalCash: number = ApiAssetUtils.safeNumber(marginData.cash)
        expect(sumMarginCash).toEqual(expectedMarginTotalCash);

        // const sumMarginStock: number = ApiAssetUtils.safeNumber(marginData.tavlStockValue) +
        //     ApiAssetUtils.safeNumber(marginData.ptavlStockValue) +
        //     ApiAssetUtils.safeNumber(marginData.tartStockValue) +
        //     ApiAssetUtils.safeNumber(marginData.ptartStockValue) +
        //     ApiAssetUtils.safeNumber(marginData.righStockValue) +
        //     ApiAssetUtils.safeNumber(marginData.rcvStockValue);
        // const expectedTotalStock: number = ApiAssetUtils.safeNumber(marginData.stockValue);
        // expect(sumMarginStock).toEqual(expectedTotalStock);

        const sumMarginDebt: number = ApiAssetUtils.safeNumber(marginData.mgDebt) + ApiAssetUtils.safeNumber(marginData.fee) + ApiAssetUtils.safeNumber(marginData.exptDisbm);
        const expectedMarginTotalDebt = ApiAssetUtils.safeNumber(marginData.debt);
        expect(sumMarginDebt).toEqual(expectedMarginTotalDebt);

        const sumMgDebt: number = ApiAssetUtils.safeNumber(marginData.prinDebt) + ApiAssetUtils.safeNumber(marginData.intDebt);
        const expectedMgDebt: number = ApiAssetUtils.safeNumber(marginData.mgDebt);
        expect(sumMgDebt).toEqual(expectedMgDebt);

        const sumMarginFee: number =
            ApiAssetUtils.safeNumber(marginData.smsFee) +
            ApiAssetUtils.safeNumber(marginData.depoFee);
        const expectedMarginTotalFee = ApiAssetUtils.safeNumber(marginData.fee);
        expect(sumMarginFee).toEqual(expectedMarginTotalFee);

        // Build and log card data
        const cardDataMargin: any = ApiAssetUtils.buildMarginAccountData(marginResult);
        ApiAssetUtils.logMarginAccountData(cardDataMargin);

        // Save results to JSON file
        saveENVResults(userConfig, cardDataMargin, "margin_account");

        //--------------------------------------------------------------------------------------------------------------------------
        // Test 4: Folio account details
        if (loginResponse.subAcntFolio) {
            console.log("Running folio account test...");
            const folioResponse = await assetApi.getTotalAssetAll({
                ...baseParams,
                subAcntNo: loginResponse.subAcntFolio,
                rqId: uuidv4(),
            });
            expect(folioResponse).toBeDefined();
            expect(folioResponse.status).toBe(200);

            const pineFolioData: any = folioResponse.data.data;
            const pineFolioResult: any = ApiAssetUtils.follioAccountData(pineFolioData);

            const pineFolioPositionResults: any = await ApiAssetUtils.processPositionData(positionsApi, baseParams, loginResponse.subAcntFolio);
            pineFolioResult.gainLossFolio = pineFolioPositionResults.gainLoss;
            pineFolioResult.percentGainLossFolio = pineFolioPositionResults.percentGainLoss;
            const pineFolioHoldStockResults: any = await ApiAssetUtils.getHoldStockData(positionsApi, baseParams, loginResponse.subAcntFolio);
            pineFolioResult.holdStock = pineFolioHoldStockResults;
            const sumPineFolioCash: number = ApiAssetUtils.safeNumber(pineFolioData.balance) +
                ApiAssetUtils.safeNumber(pineFolioData.advanceAvail) +
                ApiAssetUtils.safeNumber(pineFolioData.cashDiv) -
                (ApiAssetUtils.safeNumber(pineFolioData.buyT0) - ApiAssetUtils.safeNumber(pineFolioData.exptDisbm)) +
                ApiAssetUtils.safeNumber(pineFolioData.ipCash) -
                ApiAssetUtils.safeNumber(pineFolioData.drvtOdFee);
            const expectedPineFolioTotalCash: number = ApiAssetUtils.safeNumber(pineFolioData.cash)
            expect(sumPineFolioCash).toEqual(expectedPineFolioTotalCash);

            const sumPineFolioDebt: number = ApiAssetUtils.safeNumber(pineFolioData.smsFee) + ApiAssetUtils.safeNumber(pineFolioData.depoFee);
            const expectedPineFolioTotalDebt: number = ApiAssetUtils.safeNumber(pineFolioData.debt);
            expect(sumPineFolioDebt).toEqual(expectedPineFolioTotalDebt);

            // Build and log card data
            const cardDataPineFolio: any = ApiAssetUtils.buildFolioAccountData(pineFolioResult);
            ApiAssetUtils.logFollioAccountData(cardDataPineFolio);

            // Save results to JSON file
            saveENVResults(userConfig, cardDataPineFolio, "pine_folio_account");
        } else {
            console.log("No folio account");
        }

        console.log(`=== Tests completed successfully for user: ${userConfig.user} ===\n`);

    } catch (error) {
        console.error(`Error testing user ${userConfig.user}:`, error);
        // Save error information
        const errorResult = {
            user: userConfig.user,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        };
        saveENVResults(userConfig, errorResult, "error");
        throw error;
    }
}

// Validate that we have user configurations
if (userConfigs.length === 0) {
    console.warn("No user configurations found. Please set up UAT_CONFIGS environment variable.");
}

test.describe("AssetApi Tests - Multi User Support", () => {
    test.describe.configure({ mode: "serial" });

    // Generate dynamic tests for each user configuration
    for (const userConfig of userConfigs) {
        test.describe(`User: ${userConfig.user}`, () => {
            test("should successfully get total asset all with multiple accounts", async () => {
                await runAssetTestsForUser(userConfig);
            });
        });
    }
});
