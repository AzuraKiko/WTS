import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

export default class BondLmtValApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "getBondLmtVal";

    constructor(config: BaseApiConfig) {
        super(config);
    }

    async getBondLmtVal(params: BaseRequestParams): Promise<ApiResponse> {
        const payload = this.buildBasePayload(params, BondLmtValApi.DEFAULT_COMMAND, {
            cif: params.cif,
        });
        return this.executeBondApiCall(payload);
    }


    static createInstance(config: BaseApiConfig): BondLmtValApi {
        return new BondLmtValApi(config);
    }
}
