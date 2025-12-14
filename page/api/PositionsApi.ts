import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

// Extended interface for positions-specific parameters
interface PositionsRequestParams extends BaseRequestParams {
    getBondQty?: string;
    AorN?: string;
}

export default class PositionsApi extends BaseApi {
    // Positions-specific constants
    private static readonly DEFAULT_COMMAND = "getPositionsAll";

    constructor(config: BaseApiConfig) {
        super(config);
    }

    /**
     * Get portfolio positions for a specific account
     * @param params - Portfolio request parameters
     * @returns Promise<ApiResponse> - API response with portfolio data
     */
    async getPositionsAll(params: PositionsRequestParams): Promise<ApiResponse> {
        const additionalData = {
            ...(params.getBondQty && { getBondQty: params.getBondQty }),
            ...(params.AorN && { AorN: params.AorN }),
        };

        const payload = this.buildBasePayload(params, PositionsApi.DEFAULT_COMMAND, additionalData);
        return this.executeApiCall(payload);
    }

    /**
     * Create a new instance with different configuration
     * @param config - New configuration
     * @returns New PositionsApi instance
     */
    static createInstance(config: BaseApiConfig): PositionsApi {
        return new PositionsApi(config);
    }
}
