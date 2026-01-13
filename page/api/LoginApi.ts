import apiHelper from "../../helpers/ApiHelper";
import OrderApi from "./OrderApi";
import dotenv from "dotenv";
import { v4 as uuidv4 } from 'uuid';
import { getMatrixCodes } from "./Matrix";
import { TEST_CONFIG, ENV, ENVConfig } from "../../tests/utils/testConfig";

dotenv.config({ path: ".env" });

// 01.LO, 02.ATO,03.ATC,04.MP,05.MTL,06.MOK,07.MAK, 08.PLO (Post Close), 09. Buy-in
const OTP: string = "563447";

// Interfaces for type safety
interface LoginPayload {
    user: string;
    pass: string;
    fcmToken: string;
}

interface LoginResponse {
    rc: number;
    http: number;
    msg: string;
    data?: {
        session: string;
        cif: string;
        custInfo?: {
            normal?: Array<{
                acntNo: string;
                subAcntNo: string;
            }>;
        };
    };
}

interface AuthPayload {
    group: string;
    cmd: string;
    channel: string;
    user: string;
    session: string;
    data: {
        trdType: string;
        authType: string;
        positionNo: string;
    };
}

interface GetTokenPayload {
    group: string;
    user: string;
    session: string;
    cmd: string;
    rqId: string;
    channel: string;
    data: {
        cif: string;
        type: string;
        value: string;
    };
}

export default class LoginApi {
    private baseUrl: string;
    private apiHelper: apiHelper;

    constructor(baseUrl: string, timeout?: number) {
        this.baseUrl = baseUrl;

        if (timeout) {
            this.apiHelper = new apiHelper({ baseUrl: this.baseUrl, timeout: timeout });
        } else {
            this.apiHelper = new apiHelper({ baseUrl: this.baseUrl });
        }
    }

    /**
     * Login API
     */
    async loginApi(username: string, password: string, fcmToken?: string): Promise<LoginResponse> {
        // Create fresh API helper instance for each request to avoid state conflicts
        const loginApiHelper = new apiHelper({ baseUrl: this.baseUrl });
        const loginPayload: LoginPayload = {
            user: username,
            pass: password,
            fcmToken: fcmToken || username,
        };

        const response = await loginApiHelper.post('/loginAdv', loginPayload);
        return response;
    }

    /**
     * Generate authentication (chỉ phương thức Matrix mới call API này)
     */
    async generateAuth(user: string, session: string): Promise<any> {
        // Create fresh API helper instance for each request
        const authApiHelper = new apiHelper({ baseUrl: this.baseUrl });
        const authPayload: AuthPayload = {
            group: "CORE",
            cmd: "generateAUTH",
            channel: "WTS",
            user: user,
            session: session,
            data: {
                trdType: "1",
                authType: "2",
                positionNo: "3",
            },
        };

        const response = await authApiHelper.post('/CoreServlet.pt', authPayload);
        return response;
    }

    /**
     * Get token OTP
     */
    async getToken(user: string, session: string, cif: string, rqId: string, value: string, type: string): Promise<any> {
        // Create fresh API helper instance for each request
        const authApiHelper = new apiHelper({ baseUrl: this.baseUrl });
        let typeValue = "5";
        if (type === "OTP") {
            typeValue = "5";
        } else if (type === "Matrix") {
            typeValue = "3";
        }
        const getTokenPayload: GetTokenPayload = {
            group: "CORE",
            user: user,
            session: session,
            cmd: "getToken",
            rqId: rqId,
            channel: "WTS",
            data: {
                cif: cif,
                type: typeValue,
                value: value,
            },
        };

        const response = await authApiHelper.post('/CoreServlet.pt', getTokenPayload);
        return response;
    }

    /**
    * Login success with centralized configuration
    */
    async loginSuccess(typeAuth: string) {
        // Create fresh instance of OrderApi to avoid state conflicts
        let orderApi: OrderApi = new OrderApi(TEST_CONFIG.WEB_LOGIN_URL);
        let session: string = "";
        let cif: string = "";
        let token: string = "";
        let acntNo: string = "";
        let subAcntNormal: string = "";
        let subAcntMargin: string = "";
        let subAcntDerivative: string = "";
        let subAcntFolio: string = "";
        typeAuth = typeAuth;

        const loginResponse = await this.loginApi(
            TEST_CONFIG.TEST_USER,
            TEST_CONFIG.TEST_PASS_ENCRYPT,
            TEST_CONFIG.TEST_USER
        );

        if (loginResponse.data) {
            session = loginResponse.data.session;
            cif = loginResponse.data.cif;
            // Get account information
            if (loginResponse.data.custInfo?.normal && loginResponse.data.custInfo.normal.length > 0) {
                const account: any = loginResponse.data.custInfo.normal.find((it: any) => it.subAcntNo.includes("N"));
                acntNo = account?.acntNo;
                subAcntNormal = account?.subAcntNo;
            }
            if (loginResponse.data.custInfo?.normal && loginResponse.data.custInfo.normal.length > 0) {
                const account: any = loginResponse.data.custInfo.normal.find((it: any) => it.subAcntNo.includes("M"));
                subAcntMargin = account?.subAcntNo;
            }
            if (loginResponse.data.custInfo?.normal && loginResponse.data.custInfo.normal.length > 0) {
                const account: any = loginResponse.data.custInfo.normal.find((it: any) => it.subAcntNo.includes("D"));
                subAcntDerivative = account?.subAcntNo;
            }
            if (loginResponse.data.custInfo?.normal && loginResponse.data.custInfo.normal.length > 0) {
                const account: any = loginResponse.data.custInfo.normal.find((it: any) => it.subAcntNo.includes("P"));
                subAcntFolio = account?.subAcntNo;
            }
        } else {
            throw new Error("Login failed, no data returned.");
        }

        let tokenResponse: any;
        // Generate auth and get token
        if (typeAuth === "OTP") {
            tokenResponse = await this.getToken(
                TEST_CONFIG.TEST_USER,
                session,
                cif,
                uuidv4(),
                OTP,
                typeAuth
            );
            if (tokenResponse.rc === 1 && tokenResponse.data?.token) {
                token = tokenResponse.data.token;
            }
        } else if (typeAuth === "Matrix") {
            const authResponse = await this.generateAuth(TEST_CONFIG.TEST_USER, session);
            console.log('authResponse:', authResponse.data);

            if (authResponse.rc === 1) {
                const matrixGen: string[] = Object.values(authResponse.data);
                console.log('matrixGen:', matrixGen);
                let matrixAuth: string = getMatrixCodes(matrixGen).join('');
                let value: string = "";
                if (ENV === "PROD") {
                    value = orderApi.genMatrixAuth(matrixAuth);
                } else if (ENV === "UAT") {
                    value = "9uCh4qxBlFqap/+KiqoM68EqO8yYGpKa1c+BCgkOEa4=";
                }
                tokenResponse = await this.getToken(
                    TEST_CONFIG.TEST_USER,
                    session,
                    cif,
                    uuidv4(),
                    value,
                    typeAuth
                );
                if (tokenResponse.rc === 1 && tokenResponse.data?.token) {
                    token = tokenResponse.data.token;
                }
            }
        }
        return { session, cif, token, acntNo, subAcntNormal, subAcntMargin, subAcntDerivative, subAcntFolio };
    }

    async loginWithConfig(userConfig: ENVConfig, typeAuth: string) {

        let orderApi: OrderApi = new OrderApi(userConfig.url);
        let session: string = "";
        let cif: string = "";
        let token: string = "";
        let acntNo: string = "";
        let subAcntNormal: string = "";
        let subAcntMargin: string = "";
        let subAcntDerivative: string = "";
        let subAcntFolio: string = "";
        typeAuth = typeAuth;


        const loginResponse = await this.loginApi(userConfig.user, userConfig.pass_encrypt, userConfig.user);

        if (loginResponse.data) {
            session = loginResponse.data.session;
            cif = loginResponse.data.cif;
            // Get account information
            if (loginResponse.data.custInfo?.normal && loginResponse.data.custInfo.normal.length > 0) {
                const account: any = loginResponse.data.custInfo.normal.find((it: any) => it.subAcntNo.includes("N"));
                acntNo = account?.acntNo;
                subAcntNormal = account?.subAcntNo;
            }
            if (loginResponse.data.custInfo?.normal && loginResponse.data.custInfo.normal.length > 0) {
                const account: any = loginResponse.data.custInfo.normal.find((it: any) => it.subAcntNo.includes("M"));
                subAcntMargin = account?.subAcntNo;
            }
            if (loginResponse.data.custInfo?.normal && loginResponse.data.custInfo.normal.length > 0) {
                const account: any = loginResponse.data.custInfo.normal.find((it: any) => it.subAcntNo.includes("D"));
                subAcntDerivative = account?.subAcntNo;
            }
            if (loginResponse.data.custInfo?.normal && loginResponse.data.custInfo.normal.length > 0) {
                const account: any = loginResponse.data.custInfo.normal.find((it: any) => it.subAcntNo.includes("P"));
                subAcntFolio = account?.subAcntNo;
            }
        } else {
            throw new Error("Login failed, no data returned.");
        }

        let tokenResponse: any;
        // Generate auth and get token
        if (typeAuth === "OTP") {
            tokenResponse = await this.getToken(
                userConfig.user,
                session,
                cif,
                uuidv4(),
                OTP,
                typeAuth
            );
            if (tokenResponse.rc === 1 && tokenResponse.data?.token) {
                token = tokenResponse.data.token;
            }
        } else if (typeAuth === "Matrix") {
            const authResponse = await this.generateAuth(userConfig.user, session);
            console.log('authResponse:', authResponse.data);

            if (authResponse.rc === 1) {
                const matrixGen: string[] = Object.values(authResponse.data);
                console.log('matrixGen:', matrixGen);
                let matrixAuth: string = getMatrixCodes(matrixGen).join('');
                let value: string = "";
                if (ENV === "PROD") {
                    value = orderApi.genMatrixAuth(matrixAuth);
                } else if (ENV === "UAT") {
                    value = "9uCh4qxBlFqap/+KiqoM68EqO8yYGpKa1c+BCgkOEa4=";
                }
                tokenResponse = await this.getToken(
                    userConfig.user,
                    session,
                    cif,
                    uuidv4(),
                    value,
                    typeAuth
                );
                if (tokenResponse.rc === 1 && tokenResponse.data?.token) {
                    token = tokenResponse.data.token;
                }
            }
        }
        return { session, cif, token, acntNo, subAcntNormal, subAcntMargin, subAcntDerivative, subAcntFolio };
    }
}


