import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

export default class BondProRtApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "getBondProRt";

    constructor(config: BaseApiConfig) {
        super(config);
    }
    async getBondProRt(params: BaseRequestParams): Promise<ApiResponse> {
        const payload = this.buildBasePayloadNotLogin(params, BondProRtApi.DEFAULT_COMMAND);
        return this.executeBondApiCall(payload);
    }

    /**
     * Create a new instance with different configuration
     * @param config - New configuration
     * @returns New BondProRtApi instance
     */
    static createInstance(config: BaseApiConfig): BondProRtApi {
        return new BondProRtApi(config);
    }
}
