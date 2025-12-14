import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

export default class BondCashFlowApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "getProdIncomeFlow";

    constructor(config: BaseApiConfig) {
        super(config);
    }


    async getProdIncomeFlow(params: BaseRequestParams, additionalData: Record<string, any> = {}): Promise<ApiResponse> {
        const payload = this.buildBasePayload(params, BondCashFlowApi.DEFAULT_COMMAND, {
            prdCode: additionalData.prdCode, // Mã TP
            investAmt: additionalData.investAmt, // Số tiền đầu tư
            tranDt: additionalData.tranDt, // Ngày giao dịch (mặc định ngày hiện tại)
            xpctDueDate: additionalData.xpctDueDate, // Ngày bán dự kiến
            cif: params.cif,
        });
        return this.executeBondApiCall(payload);
    }


    static createInstance(config: BaseApiConfig): BondCashFlowApi {
        return new BondCashFlowApi(config);
    }
}
