import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";
import { v4 as uuidv4 } from "uuid";

interface BondListPayload {
    data: {
        invtAmt?: string;
        proInvtYN?: string;
        term?: string;
        langTp: string;
        issrCode?: string;
        rateSort?: string;
        prodTp: string;
    };
    group: string;
    cmd: string;
    rqId: string;
    channel: string;
}

export default class BondListApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "getBondProductList";

    constructor(config: BaseApiConfig) {
        super(config);
    }


    /**
     * Get bond product list
     * @param params - Bond product list request parameters
     * @returns Promise<ApiResponse> - API response with bond product list data
     */
    async getBondProductList(params: BaseRequestParams, additionalData: Record<string, any> = {}): Promise<ApiResponse> {
        this.validateParameters(params);

        const payload: BondListPayload = {
            data: {
                invtAmt: "",
                proInvtYN: "", // TP cho nhà đầu tư chuyên nghiệp
                term: "", // Thời hạn
                langTp: "vi",
                issrCode: "", // Tổ chức phát hành
                rateSort: additionalData.rateSort || "0", // Sắp xếp (0 là ko sắp xếp)
                prodTp: additionalData.prodTp || "" // loại trái phiếu
            },
            group: BaseApi.DEFAULT_GROUP,
            cmd: BondListApi.DEFAULT_COMMAND,
            rqId: params.rqId,
            channel: BaseApi.DEFAULT_CHANNEL
        };

        return this.executeBondApiCall(payload);
    }

    /**
     * Create a new instance with different configuration
     * @param config - New configuration
     * @returns New BondListApi instance
     */
    static createInstance(config: BaseApiConfig): BondListApi {
        return new BondListApi(config);
    }
}
