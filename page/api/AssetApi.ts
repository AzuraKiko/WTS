import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

export default class AssetApi extends BaseApi {
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
