import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

export default class BondGuaranteeApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "getBondGuarantee";

    constructor(config: BaseApiConfig) {
        super(config);
    }

    async getBondGuarantee(params: BaseRequestParams, additionalData: Record<string, any> = {}): Promise<ApiResponse> {
        const payload = this.buildBasePayload(params, BondGuaranteeApi.DEFAULT_COMMAND, {
            bndCode: additionalData.bndCode,
        });
        return this.executeBondApiCall(payload);
    }


    static createInstance(config: BaseApiConfig): BondGuaranteeApi {
        return new BondGuaranteeApi(config);
    }
}
