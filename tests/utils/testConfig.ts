import dotenv from 'dotenv';
import { expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
dotenv.config({ path: '.env' });
/**
 * UAT Configuration Interface
 */
export interface ENVConfig {
    url: string;
    user: string;
    pass: string;
    pass_encrypt: string;
    subAcntNo?: string | "";
    accountNo?: string | "";
    cif?: string | "";
}

/**
 * Environment Configuration Utility
 * Centralizes environment variable handling across all tests
 */
export const getEnvironment = () => {
    let env = process.env.NODE_ENV?.toUpperCase() || 'PROD';
    if (env === 'PRODUCTION') env = 'PROD';
    return env;
};

export const ENV = getEnvironment();

/**
 * Save JSON results for a specific user
 */
export const saveUserResults = (user: string, results: any, testType?: string): void => {
    const resultsDir = path.join(process.cwd(), `test-results-${ENV}`);
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${user}_${testType}_${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);

    try {
        fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
        console.log(`Results saved to: ${filepath}`);
    } catch (error) {
        console.error(`Failed to save results for user ${user}:`, error);
    }
};

/**
 * Save configuration results
 */
export const saveENVResults = (config: ENVConfig, results: any, testType?: string): void => {
    const user = config.user;
    saveUserResults(user, {
        config: {
            url: config.url,
            user: config.user,
        },
        results,
        timestamp: new Date().toISOString(),
        testType
    }, testType);
};

/**
 * Test Configuration Constants
 * Centralized configuration for all test files
 */
export const TEST_CONFIG = {
    WEB_LOGIN_URL: process.env[`${ENV}_WEB_LOGIN_URL`] as string,
    TEST_USER: process.env[`${ENV}_TEST_USER`] as string,
    TEST_PASS: process.env[`${ENV}_TEST_PASS`] as string,
    TEST_PASS_ENCRYPT: process.env[`${ENV}_TEST_PASS_ENCRYPT`] as string,
    ENV,
} as const;

/**
 * Common Error Messages
 * Centralized error message constants for consistent testing
 */
export const ERROR_MESSAGES = {
    // Login Error Messages
    EMPTY_FIELD: 'Trường không được để trống',
    INVALID_CUSTOMER: 'Error: Không có thông tin khách hàng',
    WRONG_PASSWORD_1: 'Error: Quý Khách đã nhập sai thông tin đăng nhập 1 LẦN. Quý Khách lưu ý, tài khoản sẽ bị tạm khóa nếu Quý Khách nhập sai liên tiếp 05 LẦN.',
    WRONG_PASSWORD_2: 'Error: Quý Khách đã nhập sai thông tin đăng nhập 2 LẦN. Quý Khách lưu ý, tài khoản sẽ bị tạm khóa nếu Quý Khách nhập sai liên tiếp 05 LẦN.',
    WRONG_PASSWORD_3: 'Error: Quý Khách đã nhập sai thông tin đăng nhập 3 LẦN. Quý Khách lưu ý, tài khoản sẽ bị tạm khóa nếu Quý Khách nhập sai liên tiếp 05 LẦN.',
    WRONG_PASSWORD_4: 'Error: Quý Khách đã nhập sai thông tin đăng nhập 4 LẦN. Quý Khách lưu ý, tài khoản sẽ bị tạm khóa nếu Quý Khách nhập sai liên tiếp 05 LẦN.',
    ACCOUNT_LOCKED: 'Error: Tài khoản của Quý Khách bị tạm khóa do nhập sai thông tin đăng nhập liên tiếp 05 lần. Quý Khách vui lòng sử dụng tính năng Quên mật khẩu ở màn hình đăng nhập hoặc liên hệ Phòng Dịch vụ Khách hàng của Pinetree (024 6282 3535) để được hỗ trợ.',

    // API Error Messages
    NO_CUSTOMER_INFO: "Không có thông tin khách hàng",
    WRONG_LOGIN_INFO: "Quý Khách đã nhập sai thông tin đăng nhập 1 LẦN. Quý Khách lưu ý, tài khoản sẽ bị tạm khóa nếu Quý Khách nhập sai liên tiếp 05 LẦN.",
    NOT_LOGGED_IN: "Servlet.exception.SessionException: Not logged in!",
    SESSION_INCORRECT: (username: string) => `Servlet.exception.SessionException: Session ${username}is not correct.`,
    INVALID_OTP: "Invalid OTP",
    TOKEN_NOT_MATCH: "Not match Certification value as 2FA.",

    // Order Error Messages
    ORDER_SYMBOL_NOT_FOUND: "Please check SYMBOL.",
    ORDER_QUANTITY_EXCEEDED: "order available sell quantity has been exceeded.",
    ORDER_PRICE_LIMIT: "Order price is greater than upper limit.",
} as const;

/**
 * Test Data Constants
 * Common test data used across multiple test files
 */
export const TEST_DATA = {
    INVALID_CREDENTIALS: {
        INVALID_USERNAME: 'test',
        INVALID_PASSWORD: 'abc',
    },

    STOCK_CODES: ['ACB', 'SHB', 'VET', 'CEO', 'HPG', 'DHT', 'CGV', 'CACB2508'],

    ORDER_SYMBOLS: {
        VALID: "CEO",
        INVALID: "CEO1",
        CW: "CFPT2501"
    },

    ORDER_TYPES: {
        BUY: "1",
        SELL: "2",
        NORMAL: "01"
    },
} as const;

/**
 * Test Performance Constants
 */
export const PERFORMANCE = {
    DEFAULT_DELAY: 100,
    TIMEOUT: 10000,
    WAIT_TIMEOUT: 3000,
} as const;

/**
 * Utility Functions
 */

/**
 * Creates a delay for test execution
 * @param ms - milliseconds to delay
 */
export const delay = (ms: number = PERFORMANCE.DEFAULT_DELAY): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generates a random stock code from the predefined list
 */
export const getRandomStockCode = (): string =>
    TEST_DATA.STOCK_CODES[Math.floor(Math.random() * TEST_DATA.STOCK_CODES.length)];


/**
 * Common assertion helpers
 */
export const assertionHelpers = {
    expectSuccessfulResponse: (response: any) => {
        expect(response).toBeDefined();
        expect(response).toHaveProperty("data");
        expect(response.rc).toBe(1);
    },

    expectFailedResponse: (response: any, expectedMessage?: string) => {
        expect(response).toBeDefined();
        expect(response).toHaveProperty("data");
        expect(String(response.rc)).toBe("-1");

        if (expectedMessage && response.data) {
            expect((response.data as any).message).toBe(expectedMessage);
        }
    },

    expectFailedResponseWithCode: (response: any, expectedMessage?: string) => {
        expect(response).toBeDefined();
        expect(String(response.rc)).toBe("-1");

        if (expectedMessage) {
            expect(response.data.message).toBe(expectedMessage);
        }
    },
};
