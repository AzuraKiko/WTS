import { v4 as uuidv4 } from 'uuid';
import { AssetApi } from '../../page/api/AssetApi';
import { TEST_CONFIG } from './testConfig';

export type WithdrawEntry = { subAcntNo: string; wdrawAvail: number };

export const getSubAccountNo = (account: string) => account.split('-')[0].trim();

export const selectIfDifferent = async (
    current: string,
    target: string,
    selector: (subAcntNo: string) => Promise<void>
) => {
    if (current !== target) {
        await selector(target);
    }
};

export const buildAvailableSubAccounts = (loginData: {
    subAcntNormal?: string;
    subAcntMargin?: string;
    subAcntDerivative?: string;
    subAcntFolio?: string;
}) =>
    [loginData.subAcntNormal, loginData.subAcntMargin, loginData.subAcntDerivative, loginData.subAcntFolio]
        .filter((subAcntNo): subAcntNo is string => Boolean(subAcntNo && subAcntNo.trim() !== ""));

export const createAssetApi = () => new AssetApi({ baseUrl: TEST_CONFIG.WEB_LOGIN_URL });

export const refreshMaxWithdrawableSubAccount = async (
    assetApi: AssetApi,
    {
        session,
        acntNo,
        availableSubAccounts,
    }: { session: string; acntNo: string; availableSubAccounts: string[] }
): Promise<WithdrawEntry> => {
    const entries: WithdrawEntry[] = await Promise.all(
        availableSubAccounts.map(async (subAcntNo) => {
            const response = await assetApi.getTotalAssetAll({
                user: TEST_CONFIG.TEST_USER,
                session,
                acntNo,
                subAcntNo,
                rqId: uuidv4(),
            });
            const wdrawAvail = response?.data?.data?.wdrawAvail ?? 0;
            return { subAcntNo, wdrawAvail };
        })
    );

    return entries.reduce(
        (max, current) => (current.wdrawAvail > max.wdrawAvail ? current : max),
        entries[0] ?? { subAcntNo: "", wdrawAvail: 0 }
    );
};
