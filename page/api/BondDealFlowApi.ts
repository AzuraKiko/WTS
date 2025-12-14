import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

export default class BondDealFlowApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "getDealIncomeFlow";

    constructor(config: BaseApiConfig) {
        super(config);
    }


    async getDealIncomeFlow(params: BaseRequestParams, subAcntNo: string, additionalData: Record<string, any> = {}): Promise<ApiResponse> {
        const payload = this.buildBasePayload(params, BondDealFlowApi.DEFAULT_COMMAND, {
            dealId: additionalData.dealId, // Hợp đồng giao dịch
            xpctDueDate: additionalData.xpctDueDate, // Ngày bán dự kiến
            cif: params.cif,
            subAcntNo: subAcntNo,
        });
        return this.executeBondApiCall(payload);
    }


    static createInstance(config: BaseApiConfig): BondDealFlowApi {
        return new BondDealFlowApi(config);
    }
}
