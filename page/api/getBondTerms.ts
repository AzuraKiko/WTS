import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

export default class BondTermsApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "getBondTerms";

    constructor(config: BaseApiConfig) {
        super(config);
    }

    async getBondTerms(params: BaseRequestParams): Promise<ApiResponse> {
        const payload = this.buildBasePayloadNotLogin(params, BondTermsApi.DEFAULT_COMMAND);
        return this.executeBondApiCall(payload);
    }


    static createInstance(config: BaseApiConfig): BondTermsApi {
        return new BondTermsApi(config);
    }
}
