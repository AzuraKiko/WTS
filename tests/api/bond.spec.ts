import { test, expect } from "@playwright/test";
import { ApiBondUtils } from "../../helpers/apiBondUtil";
import LoginApi from "../../page/api/LoginApi";
import { getENVConfigs, ENVConfig, saveENVResults } from "../utils/testConfig";
import BondDealApi from "../../page/api/BondDealApi";
import BondOrderApi from "../../page/api/BondOrderApi";
import BondDetailApi from "../../page/api/getBondDetail";
import BondListApi from "../../page/api/BondListApi";
import BondGuaranteeApi from "../../page/api/getBondGuarantee";
import BondCashFlowApi from "../../page/api/BondCashFlowApi";
import BondChartApi from "../../page/api/BondChartApi";
import { v4 as uuidv4 } from "uuid";
import dayjs from "dayjs";
import BondPreOrderApi from "../../page/api/getBondPreOrder";
import { DEV_CONFIGS, UAT_CONFIGS, PROD_CONFIGS } from "../../helpers/env";
import BondPorfolioApi from "../../page/api/BondPorfolioApi";
import BondDealFlowApi from "../../page/api/BondDealFlowApi";
import GetDeals4SellApi from "../../page/api/getDeals4Sell";

// Get all user configurations
const userConfigs = getENVConfigs();
console.log("userConfigs", userConfigs);

// Common setup function for login and base params
async function setupUserSession(userConfig: ENVConfig) {
    console.log(`Setting up session for user: ${userConfig.user}`);

    // Use DEV_CONFIGS for login, but use userConfig for API calls
    // Find matching user in DEV_CONFIGS or use first DEV config as fallback
    const devLoginConfig = DEV_CONFIGS.find((config: any) => config.user === userConfig.user) || DEV_CONFIGS[0];

    console.log(`Using DEV login config for user: ${devLoginConfig.user} (URL: ${devLoginConfig.url})`);

    // Create API instances using userConfig (for bond operations)
    const bondDealApi = new BondDealApi({ baseUrl: userConfig.url });
    const bondOrderApi = new BondOrderApi({ baseUrl: userConfig.url });
    const bondDetailApi = new BondDetailApi({ baseUrl: userConfig.url });
    const bondListApi = new BondListApi({ baseUrl: userConfig.url });
    const bondGuaranteeApi = new BondGuaranteeApi({ baseUrl: userConfig.url });
    const bondCashFlowApi = new BondCashFlowApi({ baseUrl: userConfig.url });
    const bondChartApi = new BondChartApi({ baseUrl: userConfig.url });
    const bondPreOrderApi = new BondPreOrderApi({ baseUrl: userConfig.url });
    const bondPorfolioApi = new BondPorfolioApi({ baseUrl: userConfig.url });
    const bondDealFlowApi = new BondDealFlowApi({ baseUrl: userConfig.url });
    const getDeals4SellApi = new GetDeals4SellApi({ baseUrl: userConfig.url });

    // // Use DEV config for login
    // const loginApi = new LoginApi(devLoginConfig.url);

    // // Login for this user using DEV config credentials
    // const loginResponse = await loginApi.loginWithConfig(devLoginConfig, "Matrix");
    // console.log(`Login successful for user: ${userConfig.user} (using DEV config: ${devLoginConfig.user})`);

    // const baseParams: any = {
    //     user: userConfig.user,
    //     session: loginResponse.session,
    //     acntNo: loginResponse.acntNo,
    //     subAcntNo: "",
    //     rqId: uuidv4(),
    //     cif: loginResponse.cif,
    // };

    const baseParams: any = {
        user: userConfig.user,
        session: "C6YRoPpXEAieH6MpLBP62bAU14uZ3jFXg1BuHWbZdGzfWBEZ9PiYKSpoNTAvnXpp",
        acntNo: userConfig.accountNo,
        subAcntNo: "",
        rqId: uuidv4(),
        cif: userConfig.cif,
    };

    let subAcntNoParam: string = userConfig.subAcntNo || "";

    return {
        // loginResponse,
        baseParams,
        apis: {
            bondDealApi,
            bondOrderApi,
            bondDetailApi,
            bondListApi,
            bondGuaranteeApi,
            bondCashFlowApi,
            bondChartApi,
            bondPreOrderApi,
            bondPorfolioApi,
            bondDealFlowApi,
            getDeals4SellApi,
        },
        subAcntNoParam,
    };
}

// Validate that we have user configurations
if (userConfigs.length === 0) {
    console.warn("No user configurations found. Please set up UAT_CONFIGS environment variable.");
}

test.describe("Bond Tests - Multi User Support", () => {

    // Generate dynamic tests for each user configuration
    for (const userConfig of userConfigs) {
        test.describe(`User: ${userConfig.user}`, () => {

            test("should get bond deal data", async () => {
                try {
                    const { baseParams, apis } = await setupUserSession(userConfig);

                    console.log("Running bond deal test...");
                    const bondAllPorfolioResult: any = await ApiBondUtils.getBondDealData(apis.bondDealApi, baseParams, baseParams.subAcntNo, {});
                    const bondDealFixResult: any = await ApiBondUtils.getBondDealData(apis.bondDealApi, baseParams, baseParams.subAcntNo, { prodTp: "1" });
                    const bondDealFlexResult: any = await ApiBondUtils.getBondDealData(apis.bondDealApi, baseParams, baseParams.subAcntNo, { prodTp: "2" });
                    const bondDealGrowthResult: any = await ApiBondUtils.getBondDealData(apis.bondDealApi, baseParams, baseParams.subAcntNo, { prodTp: "3" });

                    const bondDealResult: any = {
                        bondAllPorfolioResult,
                        bondDealFixResult,
                        bondDealFlexResult,
                        bondDealGrowthResult,
                    };

                    // Save results to JSON file
                    saveENVResults(userConfig, bondDealResult, "bond_deal");

                    console.log("Bond deal test completed successfully");
                } catch (error) {
                    console.error(`Error in bond deal test for user ${userConfig.user}:`, error);
                    // Save error information
                    const errorResult = {
                        user: userConfig.user,
                        test: "bond_deal",
                        error: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: new Date().toISOString()
                    };
                    saveENVResults(userConfig, errorResult, "error_bond_deal");
                    throw error;
                }
            });

            test("should get bond order data", async () => {
                try {
                    const { baseParams, apis } = await setupUserSession(userConfig);

                    console.log("Running bond order test...");
                    const orderListResult: any = await ApiBondUtils.getBondOrderData(apis.bondOrderApi, baseParams, baseParams.subAcntNo, {});
                    const orderResult: any = await ApiBondUtils.getBondOrderDetailData(apis.bondOrderApi, baseParams, baseParams.subAcntNo, {});

                    const productListResult: any = await apis.bondListApi.getBondProductList(baseParams, {});
                    const productListData: any = productListResult.data?.data || [];

                    orderResult.map((item: any) => {
                        item.proInvtYN = productListData.find((product: any) => product.bondCode === item.bondCode)?.proInvtYN;
                        item.guaranteeYN = productListData.find((product: any) => product.bondCode === item.bondCode)?.guaranteeYN;
                    });

                    // Save results to JSON file
                    saveENVResults(userConfig, orderListResult, "bond_order_list");
                    saveENVResults(userConfig, orderResult, "bond_order_detail");

                    console.log("Bond order test completed successfully");
                } catch (error) {
                    console.error(`Error in bond order test for user ${userConfig.user}:`, error);
                    const errorResult = {
                        user: userConfig.user,
                        test: "bond_order",
                        error: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: new Date().toISOString()
                    };
                    saveENVResults(userConfig, errorResult, "error_bond_order");
                    throw error;
                }
            });

            test("should get bond more info data", async () => {
                try {
                    const { baseParams, apis } = await setupUserSession(userConfig);

                    console.log("Running bond more info test...");
                    const moreInfoResult: any = await ApiBondUtils.getMoreInfoBondData(apis.bondDetailApi, baseParams, baseParams.subAcntNo, {});

                    // Save results to JSON file
                    saveENVResults(userConfig, moreInfoResult, "bond_more_info");

                    console.log("Bond more info test completed successfully");
                } catch (error) {
                    console.error(`Error in bond more info test for user ${userConfig.user}:`, error);
                    const errorResult = {
                        user: userConfig.user,
                        test: "bond_more_info",
                        error: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: new Date().toISOString()
                    };
                    saveENVResults(userConfig, errorResult, "error_bond_more_info");
                    throw error;
                }
            });

            test("should get bond list data", async () => {
                try {
                    const { baseParams, apis } = await setupUserSession(userConfig);

                    console.log("Running bond product list test...");

                    // Use shared utility to get enhanced bond list data
                    const bondListResult: any = await ApiBondUtils.getEnhancedBondListData(
                        apis.bondListApi,
                        apis.bondDealApi,
                        apis.bondDetailApi,
                        apis.bondPorfolioApi,
                        baseParams
                    );

                    saveENVResults(userConfig, bondListResult, "bond_product_list");

                    console.log("Bond list test completed successfully");
                } catch (error) {
                    console.error(`Error in bond list test for user ${userConfig.user}:`, error);
                    const errorResult = {
                        user: userConfig.user,
                        test: "bond_list",
                        error: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: new Date().toISOString()
                    };
                    saveENVResults(userConfig, errorResult, "error_bond_list");
                    throw error;
                }
            });

            test("should get bond info detail data", async () => {
                try {
                    const { baseParams, apis } = await setupUserSession(userConfig);

                    console.log("Running bond info detail test...");

                    const bondDetailResponse: any = await apis.bondDetailApi.getBondDetail(baseParams, {});
                    const bondDetailData: any = bondDetailResponse.data?.data || [];
                    const bondInfoDetailResult: any = bondDetailData.map((item: any) => ApiBondUtils.getBondInfoDetailData(item));

                    const collateralResponse: any = await apis.bondGuaranteeApi.getBondGuarantee(baseParams, {});
                    const collateralData: any = collateralResponse.data?.data || [];
                    const collateralResult = ApiBondUtils.getCollateral(collateralData);
                    bondInfoDetailResult.forEach((item: any) => {
                        const collateral = collateralResult.filter((collateral: any) => collateral.symbol === item.bondCode);
                        if (collateral) {
                            item.collateral = collateral;
                        }
                    });

                    saveENVResults(userConfig, bondInfoDetailResult, "bond_info_detail");

                    console.log("Bond info detail test completed successfully");
                } catch (error) {
                    console.error(`Error in bond info detail test for user ${userConfig.user}:`, error);
                    const errorResult = {
                        user: userConfig.user,
                        test: "bond_info_detail",
                        error: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: new Date().toISOString()
                    };
                    saveENVResults(userConfig, errorResult, "error_bond_info_detail");
                    throw error;
                }
            });

            test("should get bond cash flow buy bond data", async () => {
                try {
                    const { baseParams, apis, subAcntNoParam } = await setupUserSession(userConfig);

                    console.log("Running bond cash flow buy bond test...");

                    const qtyInput: number = 10;

                    // Get required data first
                    const productListResult: any = await apis.bondListApi.getBondProductList(baseParams, {});
                    const productListData: any = productListResult.data?.data || [];

                    const moreInfoResult: any = await ApiBondUtils.getMoreInfoBondData(apis.bondDetailApi, baseParams, baseParams.subAcntNo, {});

                    // Use shared utility to get enhanced bond list data
                    const bondListResult: any = await ApiBondUtils.getEnhancedBondListData(
                        apis.bondListApi,
                        apis.bondDealApi,
                        apis.bondDetailApi,
                        apis.bondPorfolioApi,
                        baseParams
                    );

                    // Define bond list with calculated investAmt for each bond
                    const bondList: any = [
                        // {
                        //     bndCode: 'HDB124006',
                        //     prdCode: 'PHDB124006_180',
                        // },
                        // {
                        //     bndCode: 'HDB124006',
                        //     prdCode: 'PHDB124006_60',
                        // },
                        // {
                        //     bndCode: 'HDB124006',
                        //     prdCode: 'PHDB124006_90',
                        // },
                        // {
                        //     bndCode: 'DSE125004',
                        //     prdCode: 'PDSE125004',
                        // },
                        // {
                        //     bndCode: 'VBA122001',
                        //     prdCode: 'VBA122001_90',
                        // },
                        // {
                        //     bndCode: 'LPB121036',
                        //     prdCode: 'PLPB121036_14',
                        // },
                        {
                            bndCode: 'ACB12301',
                            prdCode: 'ACB12301_Flex',
                        },
                        {
                            bndCode: 'VBA122001',
                            prdCode: 'VBA122001_14',
                        },

                        {
                            bndCode: 'VBA122001',
                            prdCode: 'VBA122001_30',
                        },
                        {
                            bndCode: 'VBA123036',
                            prdCode: 'VBA123036_90',
                        },
                        {
                            bndCode: 'VBA123036',
                            prdCode: 'PVBA123036',
                        },
                    ];

                    // Process each bond in the list
                    for (const bond of bondList) {
                        try {
                            const { bndCode, prdCode } = bond;

                            console.log(`Processing bond: ${bndCode} - ${prdCode}`);


                            // Get tranDt
                            const tranDt: string = new Date().toISOString().slice(0, 10).replace(/-/g, '');

                            // const tranDt: string = "20251019";

                            // Get bond-specific data
                            const xpctDueDate: string = productListData.find((item: any) => item.productCode === prdCode)?.dueDate;

                            // const xpctDueDate : string = "20251201";

                            const buyPrice: string = ApiBondUtils.formatWithCommas(productListData.find((item: any) => item.productCode === prdCode)?.leg1Prc);

                            const sellPrice: string = ApiBondUtils.formatWithCommas(productListData.find((item: any) => item.productCode === prdCode)?.leg2Prc);

                            // Skip if bond data not found
                            if (!xpctDueDate || !buyPrice) {
                                console.log(`Skipping ${prdCode} - data not available`);
                                continue;
                            }

                            const bondPreBuyBondData: any = await ApiBondUtils.getInfoBuyBondData(apis.bondPreOrderApi, baseParams, subAcntNoParam, {
                                prdCode: prdCode,
                                quantity: qtyInput.toString(),
                                side: "2",
                                tranDt: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                            });

                            // Calculate investAmt based on current buyPrice
                            const investAmt: string = bondPreBuyBondData.totalAmount.replace(/,/g, '');

                            const amountInput: string = ApiBondUtils.formatWithCommas(ApiBondUtils.safeNumber(buyPrice) * ApiBondUtils.safeNumber(qtyInput));

                            let bondCashFlowResult: any = {
                                prdInfo: {},
                                bndInfo: {},
                                inputData: {},
                                generalOverview: {},
                                cashFlowDetails: [],
                                bondChart: [],
                            };

                            bondCashFlowResult.prdInfo = bondListResult.find((item: any) => item.productCode === prdCode);

                            bondCashFlowResult.bndInfo = moreInfoResult.filter((item: any) => item.bondCode === bndCode);

                            const bondCashFlowResponse: any = await apis.bondCashFlowApi.getProdIncomeFlow(baseParams, {
                                prdCode: prdCode,
                                investAmt: investAmt,
                                tranDt: tranDt,
                                xpctDueDate: xpctDueDate,
                            });

                            const bondCashFlowData: any = bondCashFlowResponse.data?.data || [];
                            bondCashFlowResult.generalOverview = ApiBondUtils.getBondCashFlowData(bondCashFlowData);

                            // Parse date from YYYYMMDD format to dayjs
                            const dueDate = dayjs(xpctDueDate, 'YYYYMMDD');
                            const invtPeriod: number = dueDate.diff(dayjs(), 'month', true);

                            bondCashFlowResult.inputData = {
                                qtyInput: ApiBondUtils.formatWithCommas(qtyInput),
                                amountInput: amountInput,
                                investAmt: ApiBondUtils.formatWithCommas(investAmt),
                                qtyBuy: ApiBondUtils.formatWithCommas(bondCashFlowResult.generalOverview.quantity),
                                buyPrice: buyPrice,
                                sellPrice: sellPrice,
                                expectedBuyDate: ApiBondUtils.formatDateFromYYYYMMDD(tranDt),
                                expectedSellDate: ApiBondUtils.formatDateFromYYYYMMDD(xpctDueDate),
                            };

                            bondCashFlowResult.generalOverview.invtPeriod = invtPeriod;

                            if (Array.isArray(bondCashFlowData.couponAmt)) {
                                bondCashFlowResult.cashFlowDetails = ApiBondUtils.getCashFlowDetailData(bondCashFlowData.couponAmt);
                            } else {
                                bondCashFlowResult.cashFlowDetails = [];
                            }

                            const bondChartResponse: any = await apis.bondChartApi.getBondRateChart(baseParams, {
                                prdCode: prdCode,
                            });
                            bondCashFlowResult.bondChart = bondChartResponse.data?.data || [];

                            // Save result for each bond with unique filename
                            const resultFileName = `bond_cash_flow_buy_bond_${prdCode}`;
                            saveENVResults(userConfig, bondCashFlowResult, resultFileName);

                            console.log(`Bond cash flow test completed for ${prdCode}`);
                        } catch (bondError) {
                            console.error(`Error processing bond ${bond.prdCode}:`, bondError);
                            const bondErrorResult = {
                                user: userConfig.user,
                                test: `bond_cash_flow_buy_bond_${bond.prdCode}`,
                                error: bondError instanceof Error ? bondError.message : 'Unknown error',
                                timestamp: new Date().toISOString()
                            };
                            saveENVResults(userConfig, bondErrorResult, `error_bond_cash_flow_buy_bond_${bond.prdCode}`);
                        }
                    }

                    console.log("All bond cash flow tests completed successfully");

                } catch (error) {
                    console.error(`Error in bond cash flow buy bond test for user ${userConfig.user}:`, error);
                    const errorResult = {
                        user: userConfig.user,
                        test: "bond_cash_flow_buy_bond",
                        error: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: new Date().toISOString()
                    };
                    saveENVResults(userConfig, errorResult, "error_bond_cash_flow_buy_bond");
                    throw error;
                }
            });

            test("should get bond deal flow sell bond data", async () => {
                try {
                    const { baseParams, apis, subAcntNoParam } = await setupUserSession(userConfig);

                    console.log("Running bond deal flow sell bond test...");

                    const bondList: any = [
                        // {
                        //     bndCode: 'HDB124006',
                        //     prdCode: 'PHDB124006_180',
                        // },
                        // {
                        //     bndCode: 'HDB124006',
                        //     prdCode: 'PHDB124006_60',
                        // },
                        // {
                        //     bndCode: 'HDB124006',
                        //     prdCode: 'PHDB124006_90',
                        // },
                        // {
                        //     bndCode: 'DSE125004',
                        //     prdCode: 'PDSE125004',
                        // },
                        // {
                        //     bndCode: 'VBA122001',
                        //     prdCode: 'VBA122001_90',
                        // },
                        // {
                        //     bndCode: 'LPB121036',
                        //     prdCode: 'PLPB121036_14',
                        // },
                        {
                            bndCode: 'ACB12301',
                            prdCode: 'ACB12301_Flex',
                        },
                        {
                            bndCode: 'VBA122001',
                            prdCode: 'VBA122001_14',
                        },

                        {
                            bndCode: 'VBA122001',
                            prdCode: 'VBA122001_30',
                        },
                        {
                            bndCode: 'VBA123036',
                            prdCode: 'VBA123036_90',
                        },
                        {
                            bndCode: 'VBA123036',
                            prdCode: 'PVBA123036',
                        },
                    ];

                    const bondListResult: any = await ApiBondUtils.getEnhancedBondListData(
                        apis.bondListApi,
                        apis.bondDealApi,
                        apis.bondDetailApi,
                        apis.bondPorfolioApi,
                        baseParams
                    );


                    const bondDealResult: any = await ApiBondUtils.getBondDealData(apis.bondDealApi, baseParams, baseParams.subAcntNo, {});

                    const moreInfoResult: any = await ApiBondUtils.getMoreInfoBondData(apis.bondDetailApi, baseParams, baseParams.subAcntNo, {});

                    // Process each bond in the list
                    for (const bond of bondList) {
                        try {
                            const { bndCode, prdCode } = bond;

                            console.log(`Processing bond: ${bndCode} - ${prdCode}`);

                            // Find deals for this specific bond
                            const dealIds: string[] = bondDealResult.holdBond.filter((item: any) => item.prodCode === prdCode).map((item: any) => item.dealId);

                            if (dealIds.length === 0) {
                                console.log(`No deals available for ${prdCode}`);
                                continue;
                            }

                            // Initialize result object for this bond
                            let bondResult: any = {
                                prdInfo: bondListResult.find((item: any) => item.productCode === prdCode),
                                bndInfo: moreInfoResult.filter((item: any) => item.bondCode === bndCode),
                                deals: []
                            };

                            // Process each deal for this bond
                            for (const dealId of dealIds) {
                                try {
                                    console.log(`Processing deal ${dealId} for bond ${prdCode}`);

                                    const qty = bondDealResult.holdBond.find((item: any) => item.dealId === dealId)?.availQty;

                                    const bondDealResponse: any = await apis.bondDealApi.getBondDealList(baseParams, {
                                        dealId: dealId,
                                    });

                                    const bondDealData: any = bondDealResponse.data?.data?.list || [];
                                    const endDate: string = bondDealData[0].dueDate || "";

                                    // const xpctDueDate: string = endDate || "";
                                    const xpctDueDate: string = "20251201";

                                    let dealResult: any = {
                                        dealId: dealId,
                                        inputData: {},
                                        generalOverview: {},
                                        cashFlowDetails: [],
                                    };

                                    dealResult.inputData = {
                                        dealId: dealId,
                                        endDate: ApiBondUtils.formatDateFromYYYYMMDD(endDate),
                                        availableQty: ApiBondUtils.formatWithCommas(qty),
                                        xpctDueDate: ApiBondUtils.formatDateFromYYYYMMDD(xpctDueDate),
                                    };

                                    // const subAcntNo = loginResponse.subAcntNormal;
                                    const subAcntNo = subAcntNoParam;

                                    const bondDealFlowResponse: any = await apis.bondDealFlowApi.getDealIncomeFlow(baseParams, subAcntNo, {
                                        dealId: dealId,
                                        xpctDueDate: xpctDueDate,
                                    });

                                    const bondDealFlowData: any = bondDealFlowResponse.data?.data || [];

                                    // Get the first item from the array if it's an array
                                    const flowData = Array.isArray(bondDealFlowData) ? bondDealFlowData[0] : bondDealFlowData;

                                    dealResult.generalOverview = ApiBondUtils.getBondDealFlowData(flowData);

                                    const purchaseDate = dayjs(flowData.tranDt, 'YYYYMMDD');

                                    // Parse date from YYYYMMDD format to dayjs
                                    const dueDate = dayjs(xpctDueDate, 'YYYYMMDD');
                                    const invtPeriod: number = dueDate.diff(purchaseDate, 'month', true);

                                    dealResult.generalOverview.invtPeriod = invtPeriod;

                                    if (Array.isArray(flowData.couponAmt)) {
                                        dealResult.cashFlowDetails = ApiBondUtils.getCashFlowDetailData(flowData.couponAmt);
                                    } else {
                                        dealResult.cashFlowDetails = [];
                                    }

                                    // Add this deal to the bond's deals array
                                    bondResult.deals.push(dealResult);

                                    console.log(`Bond deal flow test completed for deal ${dealId} of ${prdCode}`);
                                } catch (dealError) {
                                    console.error(`Error processing deal ${dealId} for bond ${prdCode}:`, dealError);
                                    // Add error deal to the array instead of saving separate file
                                    bondResult.deals.push({
                                        dealId: dealId,
                                        error: dealError instanceof Error ? dealError.message : 'Unknown error',
                                        timestamp: new Date().toISOString()
                                    });
                                }
                            }

                            // Save all deals for this bond in one file
                            const resultFileName = `bond_deal_flow_sell_bond_${prdCode}`;
                            saveENVResults(userConfig, bondResult, resultFileName);

                            console.log(`All deals processed for bond ${prdCode}`);
                        } catch (bondError) {
                            console.error(`Error processing bond ${bond.prdCode}:`, bondError);
                            const bondErrorResult = {
                                user: userConfig.user,
                                test: `bond_deal_flow_sell_bond_${bond.prdCode}`,
                                error: bondError instanceof Error ? bondError.message : 'Unknown error',
                                timestamp: new Date().toISOString()
                            };
                            saveENVResults(userConfig, bondErrorResult, `error_bond_deal_flow_sell_bond_${bond.prdCode}`);
                        }
                    }

                    console.log("All bond deal flow sell bond tests completed successfully");
                } catch (error) {
                    console.error(`Error in bond deal flow sell bond test for user ${userConfig.user}:`, error);
                    const errorResult = {
                        user: userConfig.user,
                        test: "bond_deal_flow_sell_bond",
                        error: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: new Date().toISOString()
                    };
                    saveENVResults(userConfig, errorResult, "error_bond_deal_flow_sell_bond");
                    throw error;
                }
            });

            test("should get bond pre buy bond data", async () => {
                try {
                    const { baseParams, apis, subAcntNoParam } = await setupUserSession(userConfig);

                    console.log("Running bond pre order test...");


                    const bondList: any = [
                        // {
                        //     bndCode: 'HDB124006',
                        //     prdCode: 'PHDB124006_180',
                        // },
                        // {
                        //     bndCode: 'HDB124006',
                        //     prdCode: 'PHDB124006_60',
                        // },
                        // {
                        //     bndCode: 'HDB124006',
                        //     prdCode: 'PHDB124006_90',
                        // },
                        // {
                        //     bndCode: 'DSE125004',
                        //     prdCode: 'PDSE125004',
                        // },
                        // {
                        //     bndCode: 'VBA122001',
                        //     prdCode: 'VBA122001_90',
                        // },
                        // {
                        //     bndCode: 'LPB121036',
                        //     prdCode: 'PLPB121036_14',
                        // },
                        {
                            bndCode: 'ACB12301',
                            prdCode: 'ACB12301_Flex',
                        },
                        {
                            bndCode: 'VBA122001',
                            prdCode: 'VBA122001_14',
                        },

                        {
                            bndCode: 'VBA122001',
                            prdCode: 'VBA122001_30',
                        },
                        {
                            bndCode: 'VBA123036',
                            prdCode: 'VBA123036_90',
                        },
                        {
                            bndCode: 'VBA123036',
                            prdCode: 'PVBA123036',
                        },
                    ];

                    // Get required data
                    const productListResult: any = await apis.bondListApi.getBondProductList(baseParams, {});
                    const productListData: any = productListResult.data?.data || [];

    
                    const moreInfoResult: any = await ApiBondUtils.getMoreInfoBondData(apis.bondDetailApi, baseParams, baseParams.subAcntNo, {});

                    // Use shared utility to get enhanced bond list data
                    const bondListResult: any = await ApiBondUtils.getEnhancedBondListData(
                        apis.bondListApi,
                        apis.bondDealApi,
                        apis.bondDetailApi,
                        apis.bondPorfolioApi,
                        baseParams
                    );

                    // Process each bond in the list
                    for (const bond of bondList) {
                        try {
                            const { bndCode, prdCode } = bond;

                            console.log(`Processing bond pre-order: ${bndCode} - ${prdCode}`);

                            // Get bond-specific data
                            const buyPrice: number = ApiBondUtils.safeNumber(productListData.find((item: any) => item.productCode === prdCode)?.leg1Prc);

                            const xpctDueDate: string = productListData.find((item: any) => item.productCode === prdCode)?.dueDate;

                            // Define amount for calculation (you can adjust this value)
                            const amount: number = 2000000000; // 2 billion VND
                            const qty: number = Math.floor(amount / buyPrice);

                            const maxInvtQty = productListData.find((item: any) => item.productCode === prdCode)?.maxInvtQtyPerCust;
                            console.log("maxInvtQty", maxInvtQty);
                            const minInvtQty = productListData.find((item: any) => item.productCode === prdCode)?.minInvtQtyPerOrdr;
                            const sellRemain = productListData.find((item: any) => item.productCode === prdCode)?.selRemain;
                            const dealQty = bondListResult.find((item: any) => item.productCode === prdCode)?.dealQty || 0;
                            console.log("dealQty", dealQty);

                            const bondPreBuyBondResult: any = {
                                bondInfo: {},
                                moreInfo: {},
                                inputData: {},
                                orderInfo: {},
                            };

                            bondPreBuyBondResult.bondInfo = bondListResult.find((item: any) => item.productCode === prdCode);
                            bondPreBuyBondResult.moreInfo = moreInfoResult.filter((item: any) => item.bondCode === bndCode);

                            // const subAcntNo = loginResponse.subAcntNormal;
                            const subAcntNo = subAcntNoParam;

                            const bondPreBuyBondData: any = await ApiBondUtils.getInfoBuyBondData(apis.bondPreOrderApi, baseParams, subAcntNo, {
                                prdCode: prdCode,
                                quantity: qty.toString(),
                                side: "2",
                                tranDt: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                            });

                            const cashFlowResponse: any = await apis.bondCashFlowApi.getProdIncomeFlow(baseParams, {
                                prdCode: prdCode,
                                investAmt: bondPreBuyBondData.buyLmtRm.replace(/,/g, ''),
                                tranDt: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                                xpctDueDate: xpctDueDate,
                            });

                            const cashFlowData: any = cashFlowResponse.data?.data || {};
                            console.log("cashFlowData", JSON.stringify(cashFlowData, null, 2));

                            const limitQty: number = ApiBondUtils.safeNumber(cashFlowData.quantity);

                            console.log("limitQty", limitQty);

                            bondPreBuyBondResult.orderInfo = {
                                buyPrice: bondPreBuyBondData.buyPrice,
                                fee: bondPreBuyBondData.fee,
                                totalAmount: bondPreBuyBondData.totalAmount,
                                orderDate: bondPreBuyBondData.orderDate,
                                paymentDate: bondPreBuyBondData.paymentDate,
                                investmentEndDate: bondPreBuyBondData.investmentEndDate,
                                yield: bondPreBuyBondData.yield == 0 ? bondPreBuyBondResult.bondInfo.intRate : bondPreBuyBondData.yield,
                            };

                            bondPreBuyBondResult.inputData = {
                                qty: ApiBondUtils.formatWithCommas(qty),
                                profitNAV: bondPreBuyBondData.profitNAV,
                                sellRemain: ApiBondUtils.formatWithCommas(sellRemain),
                                maxInvtQtyPerCust: ApiBondUtils.formatWithCommas(Math.min(ApiBondUtils.safeNumber(sellRemain), (ApiBondUtils.safeNumber(maxInvtQty) - ApiBondUtils.safeNumber(dealQty)), limitQty)),
                                minInvtQtyPerOrdr: bondPreBuyBondData.minInvtQtyPerOrdr,
                                maxPurchaseQty: bondPreBuyBondData.maxPurchaseQty,
                            };

                            expect(ApiBondUtils.safeNumber(bondPreBuyBondData.minInvtQtyPerOrdr)).toEqual(ApiBondUtils.safeNumber(minInvtQty));

                            // Save result for each bond with unique filename
                            const resultFileName = `bond_pre_order_buy_bond_${prdCode}`;
                            saveENVResults(userConfig, bondPreBuyBondResult, resultFileName);

                            console.log(`Bond pre-order test completed for ${prdCode}`);
                        } catch (bondError) {
                            console.error(`Error processing bond pre-order ${bond.prdCode}:`, bondError);
                            const bondErrorResult = {
                                user: userConfig.user,
                                test: `bond_pre_order_buy_bond_${bond.prdCode}`,
                                error: bondError instanceof Error ? bondError.message : 'Unknown error',
                                timestamp: new Date().toISOString()
                            };
                            saveENVResults(userConfig, bondErrorResult, `error_bond_pre_order_buy_bond_${bond.prdCode}`);
                        }
                    }

                    console.log("All bond pre-order tests completed successfully");
                } catch (error) {
                    console.error(`Error in bond pre order test for user ${userConfig.user}:`, error);
                    const errorResult = {
                        user: userConfig.user,
                        test: "bond_pre_order_buy_bond",
                        error: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: new Date().toISOString()
                    };
                    saveENVResults(userConfig, errorResult, "error_bond_pre_order_buy_bond");
                    throw error;
                }
            });

            test("should get bond pre sell bond Fix data", async () => {
                try {
                    const { baseParams, apis, subAcntNoParam } = await setupUserSession(userConfig);

                    console.log("Running bond pre order sell bond fix test...");

                    // Define bond list
                    const bondList: any = [
                        // {
                        //     bndCode: 'HDB124006',
                        //     prdCode: 'PHDB124006_180',
                        // },
                        // {
                        //     bndCode: 'HDB124006',
                        //     prdCode: 'PHDB124006_60',
                        // },
                        // {
                        //     bndCode: 'HDB124006',
                        //     prdCode: 'PHDB124006_90',
                        // },
                        // {
                        //     bndCode: 'DSE125004',
                        //     prdCode: 'PDSE125004',
                        // },
                        // {
                        //     bndCode: 'VBA122001',
                        //     prdCode: 'VBA122001_90',
                        // },
                        // {
                        //     bndCode: 'LPB121036',
                        //     prdCode: 'PLPB121036_14',
                        // },
                        {
                            bndCode: 'VBA122001',
                            prdCode: 'VBA122001_14',
                        },

                        {
                            bndCode: 'VBA122001',
                            prdCode: 'VBA122001_30',
                        },
                        {
                            bndCode: 'VBA123036',
                            prdCode: 'VBA123036_90',
                        },
                    ];

                    // Get required data
                    const bondDealResult: any = await ApiBondUtils.getBondDealData(apis.bondDealApi, baseParams, baseParams.subAcntNo, {});

                    const moreInfoResult: any = await ApiBondUtils.getMoreInfoBondData(apis.bondDetailApi, baseParams, baseParams.subAcntNo, {});

                    // Use shared utility to get enhanced bond list data
                    const bondListResult: any = await ApiBondUtils.getEnhancedBondListData(
                        apis.bondListApi,
                        apis.bondDealApi,
                        apis.bondDetailApi,
                        apis.bondPorfolioApi,
                        baseParams
                    );

                    // Process each bond in the list
                    for (const bond of bondList) {
                        try {
                            const { bndCode, prdCode } = bond;

                            console.log(`Processing bond pre-order sell fix: ${bndCode} - ${prdCode}`);

                            // Find deals for this specific bond that can be sold
                            // const dealIds: string[] = bondDealResult.holdBond.filter((item: any) => item.prodCode === prdCode && item.selAblYN === "Y").map((item: any) => item.dealId);

                            const dealIds: string[] = bondDealResult.holdBond.filter((item: any) => item.prodCode === prdCode).map((item: any) => item.dealId);

                            if (dealIds.length === 0) {
                                console.log(`No deals available to sell for ${prdCode}`);
                                continue;
                            }

                            // Initialize result object for this bond
                            let bondResult: any = {
                                bondInfo: bondListResult.find((item: any) => item.productCode === prdCode),
                                moreInfo: moreInfoResult.filter((item: any) => item.bondCode === bndCode),
                                deals: []
                            };

                            // Process each deal for this bond
                            for (const dealId of dealIds) {
                                try {
                                    console.log(`Processing deal ${dealId} for bond ${prdCode}`);

                                    const qty = bondDealResult.holdBond.find((item: any) => item.dealId === dealId)?.holdingQty;

                                    // const subAcntNo = loginResponse.subAcntNormal;
                                    const subAcntNo = subAcntNoParam;

                                    const sellBondFixData: any = await ApiBondUtils.getInfoSellBondFixData(apis.bondPreOrderApi, baseParams, subAcntNo, {
                                        prdCode: prdCode,
                                        quantity: qty,
                                        side: "1",
                                        tranDt: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                                        dealId: dealId,
                                    });

                                    let dealResult: any = {
                                        contractId: dealId,
                                        inputData: {
                                            qty: ApiBondUtils.formatWithCommas(qty),
                                        },
                                        yield: ApiBondUtils.safeNumber(sellBondFixData.lastestTermYield) + ApiBondUtils.safeNumber(sellBondFixData.profitNAV) - ApiBondUtils.safeNumber(sellBondFixData.penaltyRate),
                                        lastestTermYield: sellBondFixData.lastestTermYield,
                                        penaltyRate: sellBondFixData.penaltyRate,
                                        profitNAV: sellBondFixData.profitNAV,

                                        // couponRecieved: ApiBondUtils.formatWithCommas(bondDealResult.holdBond.filter((item: any) => item.prodCode === prdCode && item.dealStat === "3").reduce((sum: number, deal: any) => sum + (ApiBondUtils.safeNumber(deal.couponRecieved)), 0)),

                                        // upcomingCouponReceived: ApiBondUtils.formatWithCommas(bondDealResult.holdBond.filter((item: any) => item.prodCode === prdCode && item.dealStat === "3").reduce((sum: number, deal: any) => sum + (ApiBondUtils.safeNumber(deal.upcomingCouponReceived)), 0)),

                                        // holdQty: ApiBondUtils.formatWithCommas(bondDealResult.holdBond.filter((item: any) => item.prodCode === prdCode && item.dealStat === "3").reduce((sum: number, deal: any) => sum + (ApiBondUtils.safeNumber(deal.holdingQty)), 0)),

                                        couponRecieved: ApiBondUtils.formatWithCommas(bondDealResult.holdBond.find((item: any) => item.dealId === dealId)?.couponRecieved || 0),

                                        upcomingCouponReceived: ApiBondUtils.formatWithCommas(bondDealResult.holdBond.find((item: any) => item.dealId === dealId)?.upcomingCouponReceived || 0),

                                        holdQty: ApiBondUtils.formatWithCommas(bondDealResult.holdBond.find((item: any) => item.dealId === dealId)?.holdingQty || 0),

                                        qtyAvaiSell: sellBondFixData.qtyAvaiSell,

                                        investmentEndDate: sellBondFixData.investmentEndDate,

                                        qtyInvestment: ApiBondUtils.formatWithCommas(bondDealResult.holdBond.find((item: any) => item.dealId === dealId)?.dealQty || 0),

                                        qtysold: ApiBondUtils.formatWithCommas(bondDealResult.holdBond.find((item: any) => item.dealId === dealId)?.sellQty || 0),

                                        avaiQty: ApiBondUtils.formatWithCommas(bondDealResult.holdBond.find((item: any) => item.dealId === dealId)?.rmnQty || 0),

                                        orderDate: sellBondFixData.orderDate,
                                        seltmentDate: sellBondFixData.seltmentDate,

                                        sellPrice: sellBondFixData.sellPrice,
                                        fee: sellBondFixData.fee,
                                        tax: sellBondFixData.tax,
                                        totalAmount: sellBondFixData.totalAmount,
                                    }

                                    // Add this deal to the bond's deals array
                                    bondResult.deals.push({
                                        dealId: dealId,
                                        orderInfo: dealResult
                                    });

                                    console.log(`Deal ${dealId} processed for bond ${prdCode}`);
                                } catch (dealError) {
                                    console.error(`Error processing deal ${dealId} for bond ${prdCode}:`, dealError);
                                    // Add error deal to the array
                                    bondResult.deals.push({
                                        dealId: dealId,
                                        error: dealError instanceof Error ? dealError.message : 'Unknown error',
                                        timestamp: new Date().toISOString()
                                    });
                                }
                            }

                            // Save all deals for this bond in one file
                            const resultFileName = `bond_pre_order_sell_bond_fix_${prdCode}`;
                            saveENVResults(userConfig, bondResult, resultFileName);

                            console.log(`All deals processed for bond ${prdCode}`);
                        } catch (bondError) {
                            console.error(`Error processing bond pre-order sell fix ${bond.prdCode}:`, bondError);
                            const bondErrorResult = {
                                user: userConfig.user,
                                test: `bond_pre_order_sell_bond_fix_${bond.prdCode}`,
                                error: bondError instanceof Error ? bondError.message : 'Unknown error',
                                timestamp: new Date().toISOString()
                            };
                            saveENVResults(userConfig, bondErrorResult, `error_bond_pre_order_sell_bond_fix_${bond.prdCode}`);
                        }
                    }

                    console.log("All bond pre-order sell bond fix tests completed successfully");
                } catch (error) {
                    console.error(`Error in bond pre order test for user ${userConfig.user}:`, error);
                    const errorResult = {
                        user: userConfig.user,
                        test: "bond_pre_order_sell_bond_fix",
                        error: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: new Date().toISOString()
                    };
                    saveENVResults(userConfig, errorResult, "error_bond_pre_order_sell_bond_fix");
                    throw error;
                }
            });

            test("should get bond pre sell bond Flex data", async () => {
                try {
                    const { baseParams, apis, subAcntNoParam } = await setupUserSession(userConfig);

                    console.log("Running bond pre order sell bond flex test...");

                    // Define bond list
                    const bondList: any = [
                        // {
                        //     bndCode: 'DSE125004',
                        //     prdCode: 'PDSE125004',
                        // },
                        // {
                        //     bndCode: 'VBA122001',
                        //     prdCode: 'VBA122001_90',
                        // },
                        {
                            bndCode: 'ACB12301',
                            prdCode: 'ACB12301_Flex',
                        },
                    ];

                    // Get required data
                    const bondDealResult: any = await ApiBondUtils.getBondDealData(apis.bondDealApi, baseParams, baseParams.subAcntNo, {});

                    const moreInfoResult: any = await ApiBondUtils.getMoreInfoBondData(apis.bondDetailApi, baseParams, baseParams.subAcntNo, {});

                    // Use shared utility to get enhanced bond list data
                    const bondListResult: any = await ApiBondUtils.getEnhancedBondListData(
                        apis.bondListApi,
                        apis.bondDealApi,
                        apis.bondDetailApi,
                        apis.bondPorfolioApi,
                        baseParams
                    );

                    // Process each bond in the list
                    for (const bond of bondList) {
                        try {
                            const { bndCode, prdCode } = bond;

                            console.log(`Processing bond pre-order sell fix: ${bndCode} - ${prdCode}`);

                            // Find deals for this specific bond that can be sold
                            // const dealIds: string[] = bondDealResult.holdBond.filter((item: any) => item.prodCode === prdCode && item.selAblYN === "Y").map((item: any) => item.dealId);

                            // const dealIds: string[] = bondDealResult.holdBond.filter((item: any) => item.prodCode === prdCode).map((item: any) => item.dealId);

                            // if (dealIds.length === 0) {
                            //     console.log(`No deals available to sell for ${prdCode}`);
                            //     continue;
                            // };

                            const qty = "100"
                            // const subAcntNo = loginResponse.subAcntNormal;
                            const subAcntNo = subAcntNoParam;

                            const getDeals4SellResult: any = await apis.getDeals4SellApi.getDeals4Sell(baseParams, subAcntNo, {
                                prdCode: prdCode,
                                quantity: qty,
                            });
                            const getDeals4SellData: any = getDeals4SellResult.data?.data;
                            // Initialize result object for this bond
                            let bondResult: any = {
                                bondInfo: bondListResult.find((item: any) => item.productCode === prdCode),
                                moreInfo: moreInfoResult.filter((item: any) => item.bondCode === bndCode),
                                inputData: {
                                    qty: ApiBondUtils.formatWithCommas(qty),
                                    deals: getDeals4SellData.map((item: any) => {
                                        return {
                                            dealId: item.dealId,
                                            availQty: ApiBondUtils.formatWithCommas(item.availQty),
                                            allocatedQty: ApiBondUtils.formatWithCommas(item.allocatedQty),
                                        };
                                    }),
                                },
                                orderInfo: {},
                            };

                            const sellBondFlexData: any = await ApiBondUtils.getInfoSellBondFixData(apis.bondPreOrderApi, baseParams, subAcntNo, {
                                prdCode: prdCode,
                                quantity: qty,
                                side: "1",
                                tranDt: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                            });

                            bondResult.orderInfo = {

                                yield: sellBondFlexData.yield == 0 ? bondResult.bondInfo.intRate : sellBondFlexData.yield,

                                couponRecieved: ApiBondUtils.formatWithCommas(bondDealResult.holdBond.filter((item: any) => item.prodCode === prdCode && item.dealStat === "3").reduce((sum: number, deal: any) => sum + (ApiBondUtils.safeNumber(deal.couponRecieved)), 0)),

                                upcomingCouponReceived: ApiBondUtils.formatWithCommas(bondDealResult.holdBond.filter((item: any) => item.prodCode === prdCode && item.dealStat === "3").reduce((sum: number, deal: any) => sum + (ApiBondUtils.safeNumber(deal.upcomingCouponReceived)), 0)),

                                holdQty: ApiBondUtils.formatWithCommas(bondDealResult.holdBond.filter((item: any) => item.prodCode === prdCode && item.dealStat === "3").reduce((sum: number, deal: any) => sum + (ApiBondUtils.safeNumber(deal.holdingQty)), 0)),
                                availQty: ApiBondUtils.formatWithCommas(bondDealResult.holdBond.filter((item: any) => item.prodCode === prdCode && item.dealStat === "3").reduce((sum: number, deal: any) => sum + (ApiBondUtils.safeNumber(deal.availQty)), 0)),

                                investmentEndDate: sellBondFlexData.investmentEndDate,

                                sellPrice: sellBondFlexData.sellPrice,
                                fee: sellBondFlexData.fee,
                                tax: sellBondFlexData.tax,
                                totalAmount: sellBondFlexData.totalAmount,
                                qtyAvaiSell: sellBondFlexData.qtyAvaiSell,

                            };

                            // Save all deals for this bond in one file
                            const resultFileName = `bond_pre_order_sell_bond_flex_${prdCode}`;
                            saveENVResults(userConfig, bondResult, resultFileName);
                            console.log(`Bond pre-order sell bond flex test completed for ${prdCode}`);

                        } catch (bondError) {
                            console.error(`Error processing bond pre-order sell flex ${bond.prdCode}:`, bondError);
                            const bondErrorResult = {
                                user: userConfig.user,
                                test: `bond_pre_order_sell_bond_flex_${bond.prdCode}`,
                                error: bondError instanceof Error ? bondError.message : 'Unknown error',
                                timestamp: new Date().toISOString()
                            };
                            saveENVResults(userConfig, bondErrorResult, `error_bond_pre_order_sell_bond_flex_${bond.prdCode}`);
                        }
                    }

                    console.log("All bond pre-order sell bond flex tests completed successfully");
                } catch (error) {
                    console.error(`Error in bond pre order sell bond flex test for user ${userConfig.user}:`, error);
                    const errorResult = {
                        user: userConfig.user,
                        test: "bond_pre_order_sell_bond_flex",
                        error: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: new Date().toISOString()
                    };
                    saveENVResults(userConfig, errorResult, "error_bond_pre_order_sell_bond_flex");
                    throw error;
                }
            });
        });
    }
});
