import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Simple logger implementation if the logger module is not available
const logger = {
    debug: (message: string, data?: any) => console.log(`[DEBUG] ${message}`, data),
    error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error)
};

interface ApiHelperOptions {
    baseUrl?: string;
    headers?: Record<string, string>;
    timeout?: number;
}

class apiHelper {
    private options: ApiHelperOptions;
    private api: AxiosInstance;

    constructor(options: ApiHelperOptions = {}) {
        this.options = {
            baseUrl: '',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 30000,
            ...options
        };

        // Khởi tạo axios instance với các tùy chọn
        this.api = axios.create({
            baseURL: this.options.baseUrl,
            headers: this.options.headers,
            timeout: this.options.timeout
        });

        // Thêm interceptor để log request và response
        // this.setupInterceptors();
    }

    /**
     * Thiết lập interceptors để log request và response
     */
    private setupInterceptors(): void {
        // Request interceptor
        this.api.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
                    headers: config.headers,
                    data: config.data
                });
                return config;
            },
            (error: any) => {
                logger.error('API Request Error:', error);
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.api.interceptors.response.use(
            (response: AxiosResponse) => {
                logger.debug(
                    `API Response: ${response.status} ${response.statusText}\nData: ${typeof response.data === 'object'
                        ? JSON.stringify(response.data, null, 2)
                        : response.data
                    }\nHeaders: ${JSON.stringify(response.headers, null, 2)}`
                );
                return response;
            },
            (error: any) => {
                if (error.response) {
                    logger.error(`API Error Response: ${error.response.status}`, {
                        data: error.response.data,
                        headers: error.response.headers
                    });
                } else if (error.request) {
                    logger.error('API No Response:', error.request);
                } else {
                    logger.error('API Request Setup Error:', error.message);
                }
                return Promise.reject(error);
            }
        );
    }

    setAuthToken(token: string): void {
        this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        logger.debug('Auth token set for API requests');
    }

    clearAuthToken(): void {
        delete this.api.defaults.headers.common['Authorization'];
        logger.debug('Auth token cleared from API requests');
    }

    async get(url: string, params: Record<string, any> = {}, config: AxiosRequestConfig = {}): Promise<any> {
        try {
            const response = await this.api.get(url, { ...config, params });
            return response.data;
        } catch (error) {
            logger.error(`GET request failed: ${url}`, error);
            throw error;
        }
    }

    async getFullResponse(url: string, params: Record<string, any> = {}, config: AxiosRequestConfig = {}): Promise<AxiosResponse> {
        try {
            const response = await this.api.get(url, { ...config, params });
            return response;
        } catch (error) {
            logger.error(`GET request failed: ${url}`, error);
            throw error;
        }
    }

    async post(url: string, data: any = {}, config: AxiosRequestConfig = {}): Promise<any> {
        try {
            const response = await this.api.post(url, data, config);
            return response.data;
        } catch (error) {
            logger.error(`POST request failed: ${url}`, error);
            throw error;
        }
    }

    async postFullResponse(url: string, data: any = {}, config: AxiosRequestConfig = {}): Promise<AxiosResponse> {
        try {
            const response = await this.api.post(url, data, config);
            return response;
        } catch (error) {
            logger.error(`POST request failed: ${url}`, error);
            throw error;
        }
    }

    async put(url: string, data: any = {}, config: AxiosRequestConfig = {}): Promise<any> {
        try {
            const response = await this.api.put(url, data, config);
            return response.data;
        } catch (error) {
            logger.error(`PUT request failed: ${url}`, error);
            throw error;
        }
    }

    async patch(url: string, data: any = {}, config: AxiosRequestConfig = {}): Promise<any> {
        try {
            const response = await this.api.patch(url, data, config);
            return response.data;
        } catch (error) {
            logger.error(`PATCH request failed: ${url}`, error);
            throw error;
        }
    }

    async delete(url: string, config: AxiosRequestConfig = {}): Promise<any> {
        try {
            const response = await this.api.delete(url, config);
            return response.data;
        } catch (error) {
            logger.error(`DELETE request failed: ${url}`, error);
            throw error;
        }
    }

    async measureResponseTime(requestFn: () => Promise<any>) {
        const start = Date.now();
        const result = await requestFn();
        const end = Date.now();
        return { result, responseTime: end - start };
    }

    /**
     * Update base URL
     * @param newBaseUrl - New base URL
     */
    public updateBaseUrl(newBaseUrl: string): void {
        this.options.baseUrl = newBaseUrl;
        this.api.defaults.baseURL = newBaseUrl;
    }

    static createWithBaseUrl(baseUrl: string): apiHelper {
        return new apiHelper({ baseUrl });
    }
}

// Export class ApiHelper
export default apiHelper;
