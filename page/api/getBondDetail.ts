import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

export default class BondDetailApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "getBondList";

    constructor(config: BaseApiConfig) {
        super(config);
    }

    async getBondDetail(params: BaseRequestParams, additionalData: Record<string, any> = {}): Promise<ApiResponse> {
        const payload = this.buildBasePayload(params, BondDetailApi.DEFAULT_COMMAND, {
            cif: params.cif,
            bndCode: additionalData.bndCode,
            issrCode: additionalData.issrCode || "",
            proInvtYN: additionalData.proInvtYN || "",
            listTp: additionalData.listTp || "",

        });
        return this.executeBondApiCall(payload);
    }


    static createInstance(config: BaseApiConfig): BondDetailApi {
        return new BondDetailApi(config);
    }
}
