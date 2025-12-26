import { TEST_CONFIG } from '../../tests/utils/testConfig';
import apiHelper from "../../helpers/ApiHelper";

// Test data configurations
const API_ENDPOINTS = {
    GET_LIST_INDEX_DETAIL: `/getlistindexdetail/10,11,02,03,25`,
    GET_LIST_DVX: `/getListDvx`,
};

export default class MarketApi extends apiHelper {
    apiHelper = new apiHelper({ baseUrl: TEST_CONFIG.WEB_LOGIN_URL });

    async getListIndexDetail(): Promise<any> {
        return this.apiHelper.getFullResponse(API_ENDPOINTS.GET_LIST_INDEX_DETAIL);
    }

    async getListDvx(): Promise<any> {
        return this.apiHelper.getFullResponse(API_ENDPOINTS.GET_LIST_DVX);
    }
}