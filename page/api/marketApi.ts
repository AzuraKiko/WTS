import { TEST_CONFIG } from '../../tests/utils/testConfig';
import apiHelper from "../../helpers/ApiHelper";

// Test data configurations
const API_ENDPOINTS = {
    GET_LIST_INDEX_DETAIL: `/getlistindexdetail/10,11,02,03,25`,
    GET_LIST_DVX: `/getListDvx`,
};

export default class MarketApi extends apiHelper {
    apiHelper = new apiHelper({ baseUrl: TEST_CONFIG.WEB_LOGIN_URL });

    async getListIndexDetail(indexCode: string): Promise<any> {
        if (indexCode.toUpperCase() === 'VNI') {
            indexCode = '10';
        } else if (indexCode.toUpperCase() === 'VN30') {
            indexCode = '11';
        } else if (indexCode.toUpperCase() === 'HNX') {
            indexCode = '02';
        } else if (indexCode.toUpperCase() === 'UPCOM') {
            indexCode = '03';
        } else if (indexCode.toUpperCase() === 'VN100') {
            indexCode = '25';
        } else {
            throw new Error(`Invalid index code: "${indexCode}"`);
        }
        const response = await this.apiHelper.getFullResponse(API_ENDPOINTS.GET_LIST_INDEX_DETAIL);
        const indexData = response.data.find((index: any) => index.mc === indexCode);
        if (!indexData) {
            throw new Error(`Index data not found for indexCode="${indexCode}"`);
        }

        const openPrice = indexData.oIndex;
        const closePrice = indexData.cIndex;

        // "ot" format example: "6.26|0.34%|29798078|150|180|46"
        const otRaw = indexData.ot;
        const otParts = String(otRaw ?? '').split('|');
        const otIndexChange = otParts[0] || 0;
        const otChangePercent = otParts[1] || "0%";

        let signedIndexChange: string = "0";
        let signedChangePercent: string = "0%";

        if (Number(closePrice) > Number(openPrice)) {
            signedIndexChange = String(otIndexChange);
            signedChangePercent = String(otChangePercent);
        } else {
            signedIndexChange = String(-otIndexChange);
            signedChangePercent = String(-otChangePercent);
        }

        return {
            indexValue: closePrice,
            indexChange: signedIndexChange,
            changePercent: signedChangePercent,
            volValue: indexData.vol,
            valueValue: indexData.value,
        };
    }

    async getListDvx(): Promise<any> {
        return this.apiHelper.getFullResponse(API_ENDPOINTS.GET_LIST_DVX);
    }
}