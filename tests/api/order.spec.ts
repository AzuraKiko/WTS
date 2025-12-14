import { test, expect } from "@playwright/test";
import LoginApi from "../../page/api/LoginApi";
import OrderApi from "../../page/api/OrderApi";
import { v4 as uuidv4 } from 'uuid';
import {
    TEST_CONFIG,
    ERROR_MESSAGES,
    TEST_DATA,
    delay,
    assertionHelpers
} from "../utils/testConfig";

// Constants
const PRIVATE_KEY = "a06ab782-118c-4819-a3c5-7b958ba85f7e";

// Shared session data
let sharedLoginData: {
    session: string;
    token: string;
    acntNo: string;
    subAcntNo: string;
} | null = null;

// Helper functions
const createFreshInstances = () => ({
    loginApi: new LoginApi(TEST_CONFIG.WEB_LOGIN_URL),
    orderApi: new OrderApi(TEST_CONFIG.WEB_LOGIN_URL)
});

const getLoginSession = async () => {
    if (!sharedLoginData) {
        const { loginApi } = createFreshInstances();
        const loginResponse = await loginApi.loginSuccess("Matrix");
        sharedLoginData = {
            session: loginResponse.session,
            token: loginResponse.token,
            acntNo: loginResponse.acntNo,
            subAcntNo: loginResponse.subAcntNormal
        };
    }
    return sharedLoginData;
};

// Common order parameters factory
const createOrderParams = (overrides: Partial<any> = {}) => ({
    symbol: TEST_DATA.ORDER_SYMBOLS.VALID,
    ordrQty: "100",
    ordrUntprc: "12500",
    ordrTrdTp: TEST_DATA.ORDER_TYPES.NORMAL,
    buySelTp: TEST_DATA.ORDER_TYPES.BUY,
    oddOrdrYn: "N",
    privateKey: PRIVATE_KEY,
    ...overrides
});

// Helper function for placing orders with error handling
const placeOrderWithErrorHandling = async (orderParams: any, overrides: Partial<any> = {}) => {
    const { orderApi } = createFreshInstances();
    const loginData = await getLoginSession();
    const { session, token, acntNo, subAcntNo } = loginData;

    return orderApi.placeNewOrder(
        TEST_CONFIG.TEST_USER,
        overrides.session || session,
        acntNo,
        subAcntNo,
        orderParams,
        uuidv4(),
        overrides.token || token
    );
};

test.describe("OrderApi Tests", () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeAll(async () => {
        try {
            await getLoginSession();
            console.log("Shared login session established");
        } catch (error) {
            console.error("Failed to establish shared login session:", error);
        }
    });

    test.afterAll(async () => {
        sharedLoginData = null;
    });

    test.describe("getListAllStock method", () => {
        test("1. should successfully get list of all stocks", async () => {
            const { orderApi } = createFreshInstances();
            const response = await orderApi.getListAllStock();

            expect(response).toBeDefined();
            expect(Array.isArray(response)).toBe(true);

            if (response.length > 0) {
                response.forEach((stock: any) => {
                    // expect(stock).toHaveProperty("stock_code");
                    // expect(stock).toHaveProperty("name_vn");
                });
            }
        });
    });

    test.describe("placeNewOrder method", () => {
        test("2. should successfully place a buy order", async () => {
            const orderParams = createOrderParams();
            const response = await placeOrderWithErrorHandling(orderParams);
            assertionHelpers.expectSuccessfulResponse(response);
            expect(response.data.ordrNo).toBeDefined();
        });

        test("3. should successfully place a sell order", async () => {
            await delay();
            const orderParams = createOrderParams({ buySelTp: TEST_DATA.ORDER_TYPES.SELL });
            const response = await placeOrderWithErrorHandling(orderParams);
            assertionHelpers.expectSuccessfulResponse(response);
            expect(response.data.ordrNo).toBeDefined();
        });

        test("4. should handle order with invalid symbol", async () => {
            await delay();
            const orderParams = createOrderParams({
                symbol: TEST_DATA.ORDER_SYMBOLS.INVALID,
                ordrQty: "1",
                oddOrdrYn: "Y"
            });

            const response = await placeOrderWithErrorHandling(orderParams);
            expect(response).toBeDefined();
            assertionHelpers.expectFailedResponseWithCode(response, ERROR_MESSAGES.ORDER_SYMBOL_NOT_FOUND);
        });

        test("5. should handle order with invalid quantity (quantity > holding)", async () => {
            await delay();
            const orderParams = createOrderParams({
                ordrQty: "1000",
                buySelTp: TEST_DATA.ORDER_TYPES.SELL
            });

            const response = await placeOrderWithErrorHandling(orderParams);
            assertionHelpers.expectFailedResponseWithCode(response, ERROR_MESSAGES.ORDER_QUANTITY_EXCEEDED);
        });

        test("6. should handle order with invalid price", async () => {
            await delay();
            const orderParams = createOrderParams({
                ordrUntprc: "14000"
            });

            const response = await placeOrderWithErrorHandling(orderParams);
            assertionHelpers.expectFailedResponseWithCode(response, ERROR_MESSAGES.ORDER_PRICE_LIMIT);
        });

        test("7. should handle order with invalid session", async () => {
            await delay();
            const orderParams = createOrderParams({});

            const response = await placeOrderWithErrorHandling(orderParams, {
                session: "76qjXSCN1xpJYYRpKaLmVMD8D3PxFQiy2NRKws2sCw9RukmzVDyeJUN9tupNxHAS"
            });

            expect(response).toBeDefined();
            expect(response.rc).toBe("-1");
            expect(response.data.message).toBe(ERROR_MESSAGES.SESSION_INCORRECT(TEST_CONFIG.TEST_USER));
        });

        test("8. should handle order with invalid token", async () => {
            await delay();
            const orderParams = createOrderParams({});

            const response = await placeOrderWithErrorHandling(orderParams, {
                token: "94c0f7f3eeded133d233c21902bd3a5bb282e11735093b62f5ed1cd36ac67b9b"
            });

            assertionHelpers.expectFailedResponseWithCode(response, ERROR_MESSAGES.TOKEN_NOT_MATCH);
        });

        test("9. should handle order with odd lot", async () => {
            await delay();
            const orderParams = createOrderParams({
                ordrQty: "15",
                oddOrdrYn: "Y"
            });

            const response = await placeOrderWithErrorHandling(orderParams);
            assertionHelpers.expectSuccessfulResponse(response);
            expect(response.data.ordrNo).toBeDefined();
        });
    });

    test.describe("Integration Tests", () => {
        test("10. should complete full order flow: login -> get stocks -> place order", async () => {
            const { orderApi } = createFreshInstances();

            // Get list of stocks
            const stocksResponse = await orderApi.getListAllStock();
            expect(stocksResponse).toBeDefined();
            expect(Array.isArray(stocksResponse)).toBe(true);

            if (stocksResponse.length > 0) {
                const orderStock = stocksResponse.find((stock: any) =>
                    stock.stock_code?.includes(TEST_DATA.ORDER_SYMBOLS.CW)
                );

                const orderParams = createOrderParams({
                    symbol: orderStock?.stock_code || TEST_DATA.ORDER_SYMBOLS.CW,
                    ordrUntprc: "500"
                });

                const response = await placeOrderWithErrorHandling(orderParams);
                assertionHelpers.expectSuccessfulResponse(response);
                expect(response.data.ordrNo).toBeDefined();
            }
        });
    });
});