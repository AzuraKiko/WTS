import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";

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

export class BondChartApi extends BaseApi {
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

export class BondDealApi extends BaseApi {
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

export class BondDealFlowApi extends BaseApi {
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

export class BondListApi extends BaseApi {
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

export class BondOrderApi extends BaseApi {
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

export class BondPorfolioApi extends BaseApi {
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

export class BondDetailApi extends BaseApi {
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

export class BondLmtValApi extends BaseApi {
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

export class BondProRtApi extends BaseApi {
    // Asset-specific constants
    private static readonly DEFAULT_COMMAND = "getBondProRt";

    constructor(config: BaseApiConfig) {
        super(config);
    }
    async getBondProRt(params: BaseRequestParams): Promise<ApiResponse> {
        const payload = this.buildBasePayloadNotLogin(params, BondProRtApi.DEFAULT_COMMAND);
        return this.executeBondApiCall(payload);
    }

    /**
     * Create a new instance with different configuration
     * @param config - New configuration
     * @returns New BondProRtApi instance
     */
    static createInstance(config: BaseApiConfig): BondProRtApi {
        return new BondProRtApi(config);
    }
}