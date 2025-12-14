import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

export default class BondPreOrderApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "getBondPreOrder";

    constructor(config: BaseApiConfig) {
        super(config);
    }


    async getBondPreOrder(params: BaseRequestParams, additionalData: Record<string, any> = {}): Promise<ApiResponse> {
        let payload: any = null;
        if (additionalData.side === "1") {
            payload = this.buildBasePayload(params, BondPreOrderApi.DEFAULT_COMMAND, {
                prdCode: additionalData.prdCode, // Mã TP
                quantity: additionalData.quantity, // Số lượng đặt lệnh
                tranDt: additionalData.tranDt, // Ngày giao dịch (mặc định ngày hiện tại)
                side: additionalData.side, // 1 là Bán, 2 là Mua
                cif: params.cif,
                dealId: additionalData.dealId,
            });
        } else if (additionalData.side === "2") {
            payload = this.buildBasePayload(params, BondPreOrderApi.DEFAULT_COMMAND, {
                prdCode: additionalData.prdCode, // Mã TP
                quantity: additionalData.quantity, // Số lượng đặt lệnh
                tranDt: additionalData.tranDt, // Ngày giao dịch (mặc định ngày hiện tại)
                side: additionalData.side, // 1 là Bán, 2 là Mua
                cif: params.cif,
            });
        }
        if (!payload) {
            throw new Error("Invalid side parameter. Must be '1' for sell or '2' for buy.");
        }
        return this.executeBondApiCall(payload);
    }


    static createInstance(config: BaseApiConfig): BondPreOrderApi {
        return new BondPreOrderApi(config);
    }
}
