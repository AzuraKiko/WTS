import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

export default class BondPorfolioApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "getBondPortfolio";

    constructor(config: BaseApiConfig) {
        super(config);
    }


    async getBondPortfolio(params: BaseRequestParams): Promise<ApiResponse> {
        const payload = this.buildBasePayload(params, BondPorfolioApi.DEFAULT_COMMAND, {
            cif: params.cif,
        });
        return this.executeBondApiCall(payload);
    }


    static createInstance(config: BaseApiConfig): BondPorfolioApi {
        return new BondPorfolioApi(config);
    }
}
