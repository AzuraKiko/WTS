import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

export default class GetDeals4SellApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "getDeals4Sell";

    constructor(config: BaseApiConfig) {
        super(config);
    }


    async getDeals4Sell(params: BaseRequestParams, subAcntNo: string, additionalData: Record<string, any> = {}): Promise<ApiResponse> {
        const payload = this.buildBasePayload(params, GetDeals4SellApi.DEFAULT_COMMAND, {
            cif: params.cif,
            subAcntNo: subAcntNo,
            prdCode: additionalData.prdCode,
            quantity: additionalData.quantity,
        });
        return this.executeBondApiCall(payload);
    }


    static createInstance(config: BaseApiConfig): GetDeals4SellApi {
        return new GetDeals4SellApi(config);
    }
}
