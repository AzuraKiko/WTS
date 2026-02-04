import LoginApi from "../../page/api/LoginApi";
import { TEST_CONFIG } from "../utils/testConfig";

export interface SharedLoginData {
    session: string;
    cif: string;
    token: string;
    acntNo: string;
    subAcntNormal: string;
    subAcntMargin: string;
    subAcntDerivative?: string;
    subAcntFolio?: string;
}

let sharedLoginData: SharedLoginData | null = null;

export const getSharedLoginSession = async (
    loginMode: string = "Matrix",
    forceNew: boolean = false
): Promise<SharedLoginData> => {
    if (!sharedLoginData || forceNew) {
        const loginApi = new LoginApi(TEST_CONFIG.WEB_LOGIN_URL);
        const loginResponse = await loginApi.loginSuccess(loginMode);
        sharedLoginData = {
            session: loginResponse.session,
            cif: loginResponse.cif,
            token: loginResponse.token,
            acntNo: loginResponse.acntNo,
            subAcntNormal: loginResponse.subAcntNormal,
            subAcntMargin: loginResponse.subAcntMargin,
            subAcntDerivative: loginResponse?.subAcntDerivative,
            subAcntFolio: loginResponse?.subAcntFolio
        };
    }
    return sharedLoginData;
};

export const resetSharedLoginSession = (): void => {
    sharedLoginData = null;
};
