import apiHelper from "../../helpers/ApiHelper";
import { WaitUtils } from "../../helpers/uiUtils";

// Common interfaces
export interface BaseApiConfig {
    baseUrl: string;
    timeout?: number;
}

export interface BaseRequestParams {
    user: string;
    session: string;
    acntNo: string;
    subAcntNo: string | null;
    rqId: string;
    cif?: string;
}

export interface ApiResponse {
    success: boolean;
    data?: any;
    error?: string;
    status?: number;
}

export interface BasePayload {
    group: string;
    user: string;
    session: string;
    cmd: string;
    rqId: string;
    channel: string;
    data: {
        acntNo: string;
        subAcntNo: string | null;
        [key: string]: any;
    };
}

export interface BasePayloadNotLogin {
    group: string;
    cmd: string;
    rqId: string;
    channel: string;
    data: {
        langTp: string;
        [key: string]: any;
    };
}

export abstract class BaseApi {
    protected baseUrl: string;
    protected apiHelper: apiHelper;
    protected waitUtils: WaitUtils;
    protected readonly defaultTimeout: number = 30000;

    // Common constants
    protected static readonly DEFAULT_GROUP = "CORE";
    protected static readonly DEFAULT_CHANNEL = "WTS";
    protected static readonly SERVLET_ENDPOINT = "/CoreServlet.pt";
    protected static readonly BOND_SERVLET_ENDPOINT = "/BondServlet.pt";
    protected static readonly DEFAULT_HEADERS = {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    };

    constructor(config: BaseApiConfig) {
        this.baseUrl = config.baseUrl;
        this.waitUtils = new WaitUtils();

        const timeout = config.timeout || this.defaultTimeout;
        this.apiHelper = new apiHelper({
            baseUrl: this.baseUrl,
            timeout: timeout
        });
    }

    /**
     * Validate request parameters
     * @param params - Parameters to validate
     * @throws Error if validation fails
     */
    protected validateParameters(params: BaseRequestParams): void {
        const requiredFields: (keyof BaseRequestParams)[] = [
            'user', 'session', 'acntNo', 'rqId'
        ];

        for (const field of requiredFields) {
            if (!params[field] || params[field].trim() === '') {
                throw new Error(`Required parameter '${field}' is missing or empty`);
            }
        }

        // Additional validation
        if (params.rqId.length < 1) {
            throw new Error('Request ID must not be empty');
        }

        if (params.acntNo.length < 1) {
            throw new Error('Account number must not be empty');
        }
    }

    /**
     * Make the actual API request
     * @param payload - Request payload
     * @returns Promise<any> - API response
     */
    protected async makeRequest(payload: BasePayload | BasePayloadNotLogin): Promise<any> {
        try {
            const response = await this.apiHelper.post(
                BaseApi.SERVLET_ENDPOINT,
                JSON.stringify(payload),
                {
                    headers: BaseApi.DEFAULT_HEADERS,
                }
            );

            return response;
        } catch (error) {
            console.error('API request failed:', error);
            throw new Error(`API request failed: ${error}`);
        }
    }

    /**
     * Execute API call with error handling
     * @param payload - Request payload
     * @returns Promise<ApiResponse> - Standardized API response
     */
    protected async executeApiCall(payload: BasePayload | BasePayloadNotLogin): Promise<ApiResponse> {
        try {
            const response = await this.makeRequest(payload);

            return {
                success: true,
                data: response,
                status: 200
            };
        } catch (error) {
            console.error('API request failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                status: 500
            };
        }
    }

    /**
     * Make bond-specific API request
     * @param payload - Request payload
     * @returns Promise<any> - API response
     */
    protected async makeBondRequest(payload: BasePayload | BasePayloadNotLogin): Promise<any> {
        try {
            const response = await this.apiHelper.post(
                BaseApi.BOND_SERVLET_ENDPOINT,
                JSON.stringify(payload),
                {
                    headers: BaseApi.DEFAULT_HEADERS,
                }
            );

            return response;
        } catch (error) {
            console.error('Bond API request failed:', error);
            throw new Error(`Bond API request failed: ${error}`);
        }
    }

    /**
     * Execute bond API call with error handling
     * @param payload - Request payload
     * @returns Promise<ApiResponse> - Standardized API response
     */
    protected async executeBondApiCall(payload: BasePayload | BasePayloadNotLogin): Promise<ApiResponse> {
        try {
            const response = await this.makeBondRequest(payload);

            return {
                success: true,
                data: response,
                status: 200
            };
        } catch (error) {
            console.error('Bond API request failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                status: 500
            };
        }
    }

    /**
     * Build base payload structure
     * @param params - Request parameters
     * @param cmd - Command to execute
     * @param additionalData - Additional data for the payload
     * @returns BasePayload - Formatted payload for API request
     */
    protected buildBasePayload(
        params: BaseRequestParams,
        cmd: string,
        additionalData: Record<string, any> = {}
    ): BasePayload {
        this.validateParameters(params);

        return {
            group: BaseApi.DEFAULT_GROUP,
            user: params.user,
            session: params.session,
            cmd: cmd,
            rqId: params.rqId,
            channel: BaseApi.DEFAULT_CHANNEL,
            data: {
                acntNo: params.acntNo,
                subAcntNo: params.subAcntNo || null,
                ...additionalData,
            },
        };
    }

    protected buildBasePayloadNotLogin(
        params: BaseRequestParams,
        cmd: string,
        additionalData: Record<string, any> = {}
    ): BasePayloadNotLogin {
        return {
            data: {
                langTp: "vi",
                ...additionalData,
            },
            group: BaseApi.DEFAULT_GROUP,
            cmd: cmd,
            rqId: params.rqId,
            channel: BaseApi.DEFAULT_CHANNEL,
        };
    }
}

