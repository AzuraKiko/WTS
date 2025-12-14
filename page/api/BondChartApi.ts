import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

export default class BondChartApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "getBondRateChart";

    constructor(config: BaseApiConfig) {
        super(config);
    }


    async getBondRateChart(params: BaseRequestParams, additionalData: Record<string, any> = {}): Promise<ApiResponse> {
        const payload = this.buildBasePayload(params, BondChartApi.DEFAULT_COMMAND, {
            prdCode: additionalData.prdCode, // Mã TP
        });
        return this.executeBondApiCall(payload);
    }


    static createInstance(config: BaseApiConfig): BondChartApi {
        return new BondChartApi(config);
    }
}
