import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

export default class BondIssuerListApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "getBondIssuerList";

    constructor(config: BaseApiConfig) {
        super(config);
    }

    async getBondIssuerList(params: BaseRequestParams, additionalData: Record<string, any> = {}): Promise<ApiResponse> {
        const payload = this.buildBasePayloadNotLogin(params, BondIssuerListApi.DEFAULT_COMMAND, {
            prodTp: additionalData.prodTp || "",
        });
        return this.executeBondApiCall(payload);
    }


    static createInstance(config: BaseApiConfig): BondIssuerListApi {
        return new BondIssuerListApi(config);
    }
}
