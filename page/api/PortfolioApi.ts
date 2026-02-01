import { BaseApi, BaseApiConfig, BaseRequestParams, ApiResponse } from "./BaseApi";


export default class PortfolioApi extends BaseApi {
    // Portfolio-specific constants
    private static readonly DEFAULT_COMMAND = "getPositionsAll";

    constructor(config: BaseApiConfig) {
        super(config);
    }

    /**
     * Get portfolio positions for a specific account
     * @param params - Portfolio request parameters
     * @returns Promise<ApiResponse> - API response with portfolio data
     */
    async getPortfolio(params: BaseRequestParams): Promise<ApiResponse> {
        const payload = this.buildBasePayload(params, PortfolioApi.DEFAULT_COMMAND);
        return this.executeApiCall(payload);
    }

    /**
     * Get portfolio positions with retry mechanism
     * @param params - Portfolio request parameters
     * @param retryCount - Number of retry attempts (default: 3)
     * @returns Promise<ApiResponse> - API response with portfolio data
     */
    async getPortfolioWithRetry(
        params: BaseRequestParams,
        retryCount: number = 3
    ): Promise<ApiResponse> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= retryCount; attempt++) {
            try {
                const result = await this.getPortfolio(params);

                if (result.success) {
                    return result;
                }

                lastError = new Error(result.error || 'API request failed');

                if (attempt < retryCount) {
                    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                    console.log(`Portfolio API attempt ${attempt} failed, retrying in ${delay}ms...`);
                    await (this.waitUtils.constructor as any).delay(delay);
                }
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');

                if (attempt < retryCount) {
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`Portfolio API attempt ${attempt} failed, retrying in ${delay}ms...`);
                    await (this.waitUtils.constructor as any).delay(delay);
                }
            }
        }

        return {
            success: false,
            error: lastError?.message || 'All retry attempts failed',
            status: 500
        };
    }


    /**
     * Create a new instance with different configuration
     * @param config - New configuration
     * @returns New PortfolioApi instance
     */
    static createInstance(config: BaseApiConfig): PortfolioApi {
        return new PortfolioApi(config);
    }
}
