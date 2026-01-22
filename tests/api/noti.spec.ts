import { test, expect } from '@playwright/test';
import ApiHelper from '../../helpers/ApiHelper';
import { delay } from '../utils/testConfig';

/* ======================================================
   CONFIGURATION
====================================================== */

const CONFIG = {
    BASE_URL: 'https://uat-gateway.pinetree.com.vn',
    ENDPOINT: '/admin/approve/request/test',
    MAX_RESPONSE_TIME: 5000,
    REQUEST_DELAY_MS: 1000,
};

const AUTHORIZATION_ADMIN =
    '8aad6c88-bab9-4ac9-9949-a86a486b5532';

const REQUEST_HEADERS = {
    'authorization-admin': AUTHORIZATION_ADMIN,
    'Content-Type': 'application/json',
} as const;

/* ======================================================
   CONSTANTS
====================================================== */

const NAME_PREFIX = 'AM-20251028-CTBT-mua2-day';
const TITLE_PREFIX = 'THI ĐẤU PHÁI SINH LẦN ĐẦU RA MẮT ';
const START_INDEX = '1';

/* ======================================================
   TEST DATA
====================================================== */
const notiData = [
    // { "actionType": "CHANGE_PAGE", "actionLabel": "Xem", "actionLabelEn": "", "pageName": "asset.management.partnershipInfo" },
    // { "actionType": "CHANGE_PAGE", "actionLabel": "Xem", "actionLabelEn": "", "pageName": "asset.management.portfolio.screenPortfolioLayout", "passProps": { "tabIndex": 0 } },
    // { "actionType": "CHANGE_PAGE", "actionLabel": "Xem chi tiết", "actionLabelEn": "", "pageName": "DerivativeProductOverview" },
    { "actionType": "CHANGE_PAGE", "actionLabel": "Xem chi tiết", "actionLabelEn": "", "pageName": "pinetree.pine.ScreenMarginPackage" },
    // { "actionType": "CHANGE_PAGE", "actionLabel": "Xem chi tiết", "actionLabelEn": "", "pageName": "pineb" },
    // { "actionType": "CHANGE_PAGE", "actionLabel": "Xem", "actionLabelEn": "", "pageName": "asset.management.MainBasisNavigator" },
    { "actionType": "OPEN_LINK", "actionLabel": "Xem", "actionLabelEn": "", "url": "https://register.alphatrading.pinetree.vn/open-app" },
    // { "actionType": "CHANGE_PAGE", "actionLabel": "Đi đến", "actionLabelEn": "", "pageName": "asset.management.NewAsset" },
    // { "actionType": "CHANGE_PAGE", "actionLabel": "Đi đến", "actionLabelEn": "", "pageName": "asset.management.MainBasisNavigator", "passProps": { "tabIndex": 2 } },
    // { "actionType": "CHANGE_PAGE", "actionLabel": "Xem", "actionLabelEn": "", "pageName": "asset.management.v2.rights" },
    { "actionType": "CHANGE_PAGE", "actionLabel": "Đi đến", "actionLabelEn": "", "pageName": "pinetree.pine.ScreenMarginPackage", "passProps": { "tabIndex": 3 } },
    // { "actionType": "CHANGE_PAGE", "actionLabel": "Đi đến", "actionLabelEn": "", "pageName": "PinetreeInsight" },
    // { "actionType": "CHANGE_PAGE", "actionLabel": "Xem", "actionLabelEn": "", "pageName": "pinetree.pist.ScreenAiNews" }
];

const popupData = [
    // { "actionType": "I", "actionLabel": "Đi đến", "actionLabelEn": "", "pagePath": "/home/account/partnership-referrer" },
    // { "actionType": "I", "actionLabel": "Xem", "actionLabelEn": "", "pagePath": "/home/pinefolio" },
    // { "actionType": "CHANGE_PAGE", "actionLabel": "Đi đến", "actionLabelEn": "", "pageName": "DerivativeProductOverview" },
    { "actionType": "I", "actionLabel": "Đi đến", "actionLabelEn": "", "pagePath": "/home/transaction/margin-package" },
    // { "actionType": "I", "actionLabel": "Xem chi tiết", "actionLabelEn": "", "pagePath": "/home/bond" },
    // { "actionType": "CHANGE_TAB", "actionLabel": "Xem", "actionLabelEn": "", "pageName": "asset.management.MainBasisNavigator", "tabIndex": 0 },
    { "actionType": "OPEN_LINK", "actionLabel": "Xem", "actionLabelEn": "", "url": "https://register.alphatrading.pinetree.vn/open-app" },
    // { "actionType": "CHANGE_TAB", "actionLabel": "Đi đến", "actionLabelEn": "", "pageName": "asset.management.MainBasisNavigator", "tabIndex": 3 },
    // { "actionType": "CHANGE_TAB", "actionLabel": "Đi đến", "actionLabelEn": "", "pageName": "asset.management.MainBasisNavigator", "tabIndex": 1 },
    // { "actionType": "CHANGE_PAGE", "actionLabel": "Xem", "actionLabelEn": "", "pageName": "asset.management.v2.rights" },
    { "actionType": "CHANGE_PAGE", "actionLabel": "Đi đến", "actionLabelEn": "", "pageName": "pinetree.pine.ScreenMarginPackage", "passProps": { "tabIndex": 3 } },
    // { "actionType": "CHANGE_PAGE", "actionLabel": "Đi đến", "actionLabelEn": "", "pageName": "PinetreeInsight" },
    // { "actionType": "CHANGE_PAGE", "actionLabel": "Xem", "actionLabelEn": "", "pageName": "pinetree.pist.ScreenAiNews" }
];



/* ======================================================
   BASE REQUEST BODY
====================================================== */

const BASE_BODY = {
    serviceName: 'noti',
    apiPath: '',
    status: 'ON',
    triggerOnce: true,
    message: '🔥 Thử sức tranh tài cùng hàng nghìn NĐT khác trong Chứng Trường Bạc Tỷ mùa 2',
    destination: '00000004,00000119,00000187',
    appNames: 'AlphaTrading',
    pushType: 'RECEIVER',
    notificationTable: 'IMPORTANT',
    pushByTemplate: true,
    notificationType: 'IMPORTANT',
    notificationScheduleId: null,
    imageUrl: null,
};

/* ======================================================
   HELPERS
====================================================== */

const buildRequestBody = ({
    name,
    title,
    data,
    isPopup,
}: {
    name: string;
    title: string;
    data: unknown;
    isPopup: boolean | null;
}) => ({
    ...BASE_BODY,
    name,
    title,
    data: JSON.stringify({ data }),
    isPopup,
});

/* ======================================================
   TEST SUITE
====================================================== */

test.describe('Noti approve request API - NOTI', () => {
    test.describe.configure({ mode: 'serial' });

    let apiHelper: ApiHelper;

    test.beforeAll(async () => {
        apiHelper = new ApiHelper({ baseUrl: CONFIG.BASE_URL });
    });

    notiData.forEach((data, idx) => {
        const seq = START_INDEX + idx;

        test(`create NOTI request [${seq}]`, async () => {
            test.setTimeout(60000);

            const name = `${NAME_PREFIX}${seq}`;
            const title = `${TITLE_PREFIX}${seq}`;

            const requestBody = buildRequestBody({
                name,
                title,
                data,
                isPopup: null,
            });

            const { result: response, responseTime } =
                await apiHelper.measureResponseTime(() =>
                    apiHelper.postFullResponse(CONFIG.ENDPOINT, requestBody, {
                        headers: REQUEST_HEADERS,
                    })
                );

            expect(response.status).toBe(200);
            expect(responseTime).toBeLessThan(CONFIG.MAX_RESPONSE_TIME);
            expect(response.data).toBeTruthy();

            console.info(`[NOTI] ${name} | ${responseTime}ms`);

            await delay(CONFIG.REQUEST_DELAY_MS);
        });
    });
});


test.describe('Noti approve request API - POPUP', () => {
    test.describe.configure({ mode: 'serial' });

    let apiHelper: ApiHelper;

    test.beforeAll(async () => {
        apiHelper = new ApiHelper({ baseUrl: CONFIG.BASE_URL });
    });

    popupData.forEach((data, idx) => {
        const seq = START_INDEX + notiData.length + idx;

        test(`create POPUP request [${seq}]`, async () => {
            test.setTimeout(60000);

            const name = `${NAME_PREFIX}${seq}`;
            const title = `${TITLE_PREFIX}${seq}`;

            const requestBody = buildRequestBody({
                name,
                title,
                data,
                isPopup: true,
            });

            const { result: response, responseTime } =
                await apiHelper.measureResponseTime(() =>
                    apiHelper.postFullResponse(CONFIG.ENDPOINT, requestBody, {
                        headers: REQUEST_HEADERS,
                    })
                );

            expect(response.status).toBe(200);
            expect(responseTime).toBeLessThan(CONFIG.MAX_RESPONSE_TIME);
            expect(response.data).toBeTruthy();

            console.info(`[POPUP] ${name} | ${responseTime}ms`);

            await delay(CONFIG.REQUEST_DELAY_MS);
        });
    });
});
