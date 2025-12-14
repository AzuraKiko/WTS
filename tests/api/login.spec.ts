import { test, expect } from "@playwright/test";
import LoginApi from "../../page/api/LoginApi";
import { v4 as uuidv4 } from 'uuid';
import { getMatrixCodes } from "../../page/api/Matrix";
import OrderApi from "../../page/api/OrderApi";
import {
    TEST_CONFIG,
    ERROR_MESSAGES,
    delay,
    assertionHelpers
} from "../utils/testConfig";

// Helper Functions
const createFreshInstances = () => ({
    loginApi: new LoginApi(TEST_CONFIG.WEB_LOGIN_URL),
    orderApi: new OrderApi(TEST_CONFIG.WEB_LOGIN_URL)
});

const getIsolatedDelay = () => Math.floor(Math.random() * 200) + 100; // 100-300ms random delay

// Common Assertion Helpers using centralized utilities
const { expectSuccessfulResponse, expectFailedResponseWithCode } = assertionHelpers;

const expectSuccessfulLoginData = (data: any) => {
    expect(data).toHaveProperty("session");
    expect(data).toHaveProperty("cif");
    expect(data.session).toBeDefined();
    expect(data.cif).toBeDefined();
    expect(data.session.length).toBeGreaterThan(0);
    expect(data.cif.length).toBeGreaterThan(0);
};

// Reusable Test Flows
const performLogin = async (username?: string, password?: string, fcmToken?: string) => {
    const { loginApi } = createFreshInstances();
    await delay(getIsolatedDelay());

    return loginApi.loginApi(
        username ?? TEST_CONFIG.TEST_USER,
        password ?? TEST_CONFIG.TEST_PASS_ENCRYPT,
        fcmToken
    );
};

const performLoginWithAuth = async () => {
    const { loginApi } = createFreshInstances();
    await delay(getIsolatedDelay());

    const loginResponse = await loginApi.loginApi(
        TEST_CONFIG.TEST_USER,
        TEST_CONFIG.TEST_PASS_ENCRYPT,
        TEST_CONFIG.TEST_USER
    );

    expectSuccessfulResponse(loginResponse);
    expect(loginResponse.data?.session).toBeDefined();

    // Add delay between login and auth to prevent session conflicts
    await delay(200);

    const authResponse = await loginApi.generateAuth(
        TEST_CONFIG.TEST_USER,
        loginResponse.data?.session as string
    );

    return { loginResponse, authResponse, loginApi };
};

const performFullTokenFlow = async () => {
    const { orderApi, loginApi } = createFreshInstances();
    await delay(getIsolatedDelay());

    const loginResponse = await loginApi.loginApi(
        TEST_CONFIG.TEST_USER,
        TEST_CONFIG.TEST_PASS_ENCRYPT,
        TEST_CONFIG.TEST_USER
    );

    expectSuccessfulResponse(loginResponse);
    expect(loginResponse.data?.session).toBeDefined();

    // Add delay between login and auth to prevent session conflicts
    await delay(200);

    const authResponse = await loginApi.generateAuth(
        TEST_CONFIG.TEST_USER,
        loginResponse.data?.session as string
    );
    expectSuccessfulResponse(authResponse);

    const matrixGen: string[] = Object.values(authResponse.data);
    const matrixAuth = getMatrixCodes(matrixGen).join('');

    const value = TEST_CONFIG.ENV === "PROD"
        ? orderApi.genMatrixAuth(matrixAuth)
        : "9uCh4qxBlFqap/+KiqoM68EqO8yYGpKa1c+BCgkOEa4=";

    // Add delay before token generation to prevent conflicts
    await delay(200);

    const tokenResponse = await loginApi.getToken(
        TEST_CONFIG.TEST_USER,
        loginResponse.data?.session as string,
        loginResponse.data?.cif as string,
        uuidv4(),
        value,
        "Matrix"
    );

    return { loginResponse, authResponse, tokenResponse };
};

test.describe("LoginApi Tests", () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async () => {
        await delay(100);
    });

    test.describe("loginApi method", () => {
        test("1. should successfully login with valid credentials", async () => {
            const response = await performLogin(
                TEST_CONFIG.TEST_USER,
                TEST_CONFIG.TEST_PASS_ENCRYPT,
                TEST_CONFIG.TEST_USER
            );

            expectSuccessfulResponse(response);
            if (response.data) {
                expectSuccessfulLoginData(response.data);
            }
        });

        test("2. should successfully login without fcmToken", async () => {
            const response = await performLogin();

            expectSuccessfulResponse(response);
            if (response.data) {
                expectSuccessfulLoginData(response.data);
            }
        });

        test("3. should handle login with empty username", async () => {
            const response = await performLogin("", TEST_CONFIG.TEST_PASS_ENCRYPT, TEST_CONFIG.TEST_USER);
            expectFailedResponseWithCode(response, ERROR_MESSAGES.NO_CUSTOMER_INFO);
        });

        test("4. should handle login with empty password", async () => {
            const response = await performLogin(TEST_CONFIG.TEST_USER, "", TEST_CONFIG.TEST_USER);
            expectFailedResponseWithCode(response, ERROR_MESSAGES.WRONG_LOGIN_INFO);
        });
    });

    test.describe("generateAuth method", () => {
        test("5. should successfully generate authentication", async () => {
            const { authResponse } = await performLoginWithAuth();

            expect(authResponse).toBeDefined();
            expect(authResponse.rc).toBe(1);
            expect(authResponse.data).not.toHaveProperty("message");
        });

        test("6. should handle generateAuth with empty user", async () => {
            const { loginResponse } = await performLoginWithAuth();
            const { loginApi } = createFreshInstances();

            const response = await loginApi.generateAuth("", loginResponse.data?.session as string);
            expectFailedResponseWithCode(response, ERROR_MESSAGES.NOT_LOGGED_IN);
        });

        test("7. should handle generateAuth with empty session", async () => {
            const { loginApi } = createFreshInstances();
            await delay(getIsolatedDelay());

            const response = await loginApi.generateAuth(TEST_CONFIG.TEST_USER, "");
            expectFailedResponseWithCode(response, ERROR_MESSAGES.SESSION_INCORRECT(TEST_CONFIG.TEST_USER));
        });

        test("8. should handle generateAuth with invalid session", async () => {
            const { loginApi } = createFreshInstances();
            await delay(getIsolatedDelay());

            const response = await loginApi.generateAuth(TEST_CONFIG.TEST_USER, "76qjXSCN1xpJYYRpKaLmVMD8D3PxFQiy2NRKws2sCw9RukmzVDyeJUN9tupNxHAS");
            expectFailedResponseWithCode(response, ERROR_MESSAGES.SESSION_INCORRECT(TEST_CONFIG.TEST_USER));
        });
    });

    test.describe("Integration Tests", () => {
        test("9. should complete full login flow: login -> generateAuth -> getToken", async () => {
            const { tokenResponse } = await performFullTokenFlow();
            await delay(getIsolatedDelay());

            expectSuccessfulResponse(tokenResponse);
            expect(tokenResponse.data.token).not.toBe(ERROR_MESSAGES.INVALID_OTP);
            expect(tokenResponse.data).not.toHaveProperty("message");
        });

        test("10. should handle session expiration scenario", async () => {
            const { loginApi } = createFreshInstances();
            await delay(getIsolatedDelay());

            // First login to get valid session
            const firstLogin = await loginApi.loginApi(
                TEST_CONFIG.TEST_USER,
                TEST_CONFIG.TEST_PASS_ENCRYPT,
                TEST_CONFIG.TEST_USER
            );

            if (firstLogin.data) {
                const oldSession = firstLogin.data.session;

                // Second login to invalidate previous session
                await loginApi.loginApi(
                    TEST_CONFIG.TEST_USER,
                    TEST_CONFIG.TEST_PASS_ENCRYPT,
                    TEST_CONFIG.TEST_USER
                );

                // Try to use old session
                const authResponse = await loginApi.generateAuth(TEST_CONFIG.TEST_USER, oldSession);
                expectFailedResponseWithCode(authResponse, ERROR_MESSAGES.SESSION_INCORRECT(TEST_CONFIG.TEST_USER));
            }
        });
    });
});