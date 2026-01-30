import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";
import dayjs from 'dayjs';

export class AssetApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "getTotalAssetAll";

    constructor(config: BaseApiConfig) {
        super(config);
    }

    /**
     * Get total asset data for a specific account
     * @param params - Asset request parameters
     * @returns Promise<ApiResponse> - API response with asset data
     */
    async getTotalAssetAll(params: BaseRequestParams): Promise<ApiResponse> {
        const payload = this.buildBasePayload(params, AssetApi.DEFAULT_COMMAND);
        return this.executeApiCall(payload);
    }


    /**
     * Create a new instance with different configuration
     * @param config - New configuration
     * @returns New AssetApi instance
     */
    static createInstance(config: BaseApiConfig): AssetApi {
        return new AssetApi(config);
    }
}


export class getCashTransferHist extends BaseApi {
    private static readonly DEFAULT_COMMAND = "getCashTransferHist";

    constructor(config: BaseApiConfig) {
        super(config);
    }

    async getCashTransferHist(params: BaseRequestParams): Promise<ApiResponse> {
        const payload = this.buildBasePayload(params, getCashTransferHist.DEFAULT_COMMAND,
            {
                fromDate: dayjs().subtract(6, 'month').format('YYYYMMDD'), // 6 tháng trước
                toDate: dayjs().format('YYYYMMDD'), // Ngày hiện tại
                transType: "1"
            }
        );
        return this.executeApiCall(payload);
    }

    static createInstance(config: BaseApiConfig): getCashTransferHist {
        return new getCashTransferHist(config);
    }
}

export class getAvailStockList extends BaseApi {
    private static readonly DEFAULT_COMMAND = "getAvailStockList";

    constructor(config: BaseApiConfig) {
        super(config);
    }

    async getAvailStockList(params: BaseRequestParams): Promise<ApiResponse> {
        const payload = this.buildBasePayload(params, getAvailStockList.DEFAULT_COMMAND);
        return this.executeApiCall(payload);
    }

    static createInstance(config: BaseApiConfig): getAvailStockList {
        return new getAvailStockList(config);
    }
}

export class getStockTransferHist extends BaseApi {
    private static readonly DEFAULT_COMMAND = "getStockTransferHist";

    constructor(config: BaseApiConfig) {
        super(config);
    }

    async getStockTransferHist(params: BaseRequestParams): Promise<ApiResponse> {
        const payload = this.buildBasePayload(params, getStockTransferHist.DEFAULT_COMMAND,
            {
                fromDate: dayjs().subtract(6, 'month').format('YYYYMMDD'), // 6 tháng trước
                toDate: dayjs().format('YYYYMMDD'), // Ngày hiện tại
            }
        );
        return this.executeApiCall(payload);
    }

    static createInstance(config: BaseApiConfig): getStockTransferHist {
        return new getStockTransferHist(config);
    }
}
