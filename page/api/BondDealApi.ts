import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

export default class BondDealApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "getBondDealList";

    constructor(config: BaseApiConfig) {
        super(config);
    }


    async getBondDealList(params: BaseRequestParams, additionalData: Record<string, any> = {}): Promise<ApiResponse> {
        const payload = this.buildBasePayload(params, BondDealApi.DEFAULT_COMMAND, {
            cif: params.cif,
            fromDate: additionalData.fromDate || "",
            toDate: additionalData.toDate || "",
            prodTp: additionalData.prodTp || "",
            bndCode: additionalData.bndCode || "",
            dealId: additionalData.dealId || "",
        });
        return this.executeBondApiCall(payload);
    }


    static createInstance(config: BaseApiConfig): BondDealApi {
        return new BondDealApi(config);
    }
}
