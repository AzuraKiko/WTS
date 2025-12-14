import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

export default class PurchasePowerApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "PurchasePower";

    constructor(config: BaseApiConfig) {
        super(config);
    }

    /**
     * Get purchase power data for a specific account
     * @param params - Purchase power request parameters
     * @returns Promise<ApiResponse> - API response with purchase power data
     */
    async getPurchasePower(params: BaseRequestParams, additionalData: Record<string, any> = {}): Promise<ApiResponse> {
        const payload = this.buildBasePayload(params, PurchasePowerApi.DEFAULT_COMMAND, {
            symbol: additionalData.symbol,
            ordrUntprc: additionalData.ordrUntprc,
        });
        return this.executeApiCall(payload);
    }

    /**
     * Create a new instance with different configuration
     * @param config - New configuration
     * @returns New PurchasePowerApi instance
     */
    static createInstance(config: BaseApiConfig): PurchasePowerApi {
        return new PurchasePowerApi(config);
    }
}
