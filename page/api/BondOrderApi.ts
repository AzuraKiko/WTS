import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

export default class BondOrderApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "getBondOrderList";

    constructor(config: BaseApiConfig) {
        super(config);
    }


    async getBondOrderList(params: BaseRequestParams, additionalData: Record<string, any> = {}): Promise<ApiResponse> {
        const payload = this.buildBasePayload(params, BondOrderApi.DEFAULT_COMMAND, {
            cif: params.cif,
            fromDate: additionalData.fromDate || "",
            toDate: additionalData.toDate || "",
        });
        return this.executeBondApiCall(payload);
    }


    static createInstance(config: BaseApiConfig): BondOrderApi {
        return new BondOrderApi(config);
    }
}
