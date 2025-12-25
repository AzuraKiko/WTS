import { test, expect } from '@playwright/test';
import ApiHelper from '../../helpers/ApiHelper';

let apiHelper: ApiHelper;

// Configuration constants
const CONFIG = {
  BASE_URL: 'https://uat-gateway.pinetree.com.vn',
  MAX_RESPONSE_TIME: 5000,
  JSON_CONTENT_TYPE: 'application/json'
};

// Test data configurations
const API_ENDPOINTS = {
  CATEGORY_ALL: '/market/public/category/all',
  CATEGORY_STOCKS: '/market/public/category/stocks?categoryCode=SAN_XUAT&sortBy=VOLUME&market=HOSE',
  GLOBAL_MARKET: '/market/public/global-market',
  HEAT_MAP: '/market/public/category/heat-map',
  BREADTH_DATA: '/market/public/market/breadth/data?exchange=HOSE',
  INDEX_LIQUIDITY: '/market/public/index/liquidity/data?exchange=HOSE',
  STOCK_INFLUENCE: '/market/public/stock/influence?exchange=HOSE',
  INDEX_FOREIGN: '/market/public/index/foreign/data?exchange=HOSE&numberOfSessions=1',
  STOCK_TOP: '/market/public/stock/top?type=TOP_VOLUME&exchange=HOSE&tradingValue=5000000&limit=1',
  STOCK_INFLUENCE_LIMIT: '/market/public/stock/influence?exchange=HOSE&limit=1'
};

test.beforeAll(async () => {
  apiHelper = new ApiHelper({ baseUrl: CONFIG.BASE_URL });
});

// Helper functions for common validations
class ApiTestHelper {
  static async performApiTest(
    apiHelper: ApiHelper,
    endpoint: string,
    testName: string,
    customValidations?: (responseData: any) => void
  ) {
    const { result: response, responseTime } = await apiHelper.measureResponseTime(() =>
      apiHelper.getFullResponse(endpoint)
    );

    // Common validations
    this.validateBasicResponse(response);
    this.validateResponseTime(responseTime, testName);
    this.validateDataExists(response.data);

    // Custom validations if provided
    if (customValidations) {
      customValidations(response.data);
    }

    // Log response for debugging
    console.log(`${testName} API Response:`, JSON.stringify(response.data, null, 2));
    console.log(`${testName} API response time: ${responseTime}ms`);

    return { response, responseTime };
  }

  static validateBasicResponse(response: any) {
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain(CONFIG.JSON_CONTENT_TYPE);
  }

  static validateResponseTime(responseTime: number, testName: string) {
    expect(responseTime).toBeLessThan(CONFIG.MAX_RESPONSE_TIME);
  }

  static validateDataExists(data: any) {
    expect(data).toBeDefined();
  }

  static validateArrayData(data: any, minLength: number = 0) {
    if (Array.isArray(data)) {
      expect(data.length).toBeGreaterThanOrEqual(minLength);
    }
  }

  static validateObjectData(data: any) {
    if (typeof data === 'object' && !Array.isArray(data)) {
      expect(Object.keys(data).length).toBeGreaterThan(0);
    }
  }

  static validateNestedData(data: any, minLength: number = 0) {
    if (typeof data === 'object') {
      if (Array.isArray(data)) {
        this.validateArrayData(data, minLength);
      } else {
        this.validateObjectData(data);
      }
    }
  }

  static validateStockData(stocks: any[]) {
    if (stocks.length > 0) {
      stocks.forEach((stock: any) => {
        expect(stock).toHaveProperty('stockCode');
        expect(stock).toHaveProperty('volume');
      });
    }
  }

  static validateTopStockData(data: any) {
    if (Array.isArray(data)) {
      expect(data.length).toBeGreaterThanOrEqual(0);
      if (data.length > 0) {
        const first = data[0];
        expect(first).toHaveProperty('stockCode');
        expect(first).toHaveProperty('volume');
      }
    } else if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) {
      // Handle nested data structure
      const stockArray = data.data;
      if (stockArray.length > 0) {
        const stock = stockArray[0];
        expect(stock.stockCode).toBe('SHB');
        expect(stock.name).toContain('Sài Gòn - Hà Nội');
        expect(stock.stockExchange).toBe('HOSE');
        expect(stock.stockType).toBe('COMPANY');
        expect(typeof stock.value).toBe('number');
        expect(stock.value).toBeGreaterThan(0);
      }
    }
  }

  static validateInfluenceData(data: any) {
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      expect(first).toHaveProperty('stockCode');
      expect(first).toHaveProperty('influenceIndex');
    }
  }
}

// Test suites using the optimized helper
test.describe('Market Category All API Tests', () => {
  test('should get all public categories', async () => {
    await ApiTestHelper.performApiTest(
      apiHelper,
      API_ENDPOINTS.CATEGORY_ALL,
      'Market Category All',
      (data) => ApiTestHelper.validateArrayData(data, 1)
    );
  });
});

test.describe('Market Category Stocks API Tests', () => {
  test('should get stocks by category with specific parameters', async () => {
    await ApiTestHelper.performApiTest(
      apiHelper,
      API_ENDPOINTS.CATEGORY_STOCKS,
      'Category Stocks',
      (data) => {
        const responseData = data.data || data;
        expect(responseData).toBeDefined();

        if (responseData.list) {
          expect(responseData.list).toBeDefined();
          if (Array.isArray(responseData.list)) {
            expect(responseData.list.length).toBeGreaterThanOrEqual(0);
            ApiTestHelper.validateStockData(responseData.list);
          }
        }
      }
    );
  });
});

test.describe('Market Data API Tests', () => {
  const marketDataTests = [
    { name: 'Global Market', endpoint: API_ENDPOINTS.GLOBAL_MARKET },
    { name: 'Heat Map', endpoint: API_ENDPOINTS.HEAT_MAP },
    { name: 'Market Breadth', endpoint: API_ENDPOINTS.BREADTH_DATA },
    { name: 'Index Liquidity', endpoint: API_ENDPOINTS.INDEX_LIQUIDITY },
    { name: 'Stock Influence', endpoint: API_ENDPOINTS.STOCK_INFLUENCE },
    { name: 'Index Foreign', endpoint: API_ENDPOINTS.INDEX_FOREIGN }
  ];

  marketDataTests.forEach(({ name, endpoint }) => {
    test(`should get ${name.toLowerCase()} data`, async () => {
      await ApiTestHelper.performApiTest(
        apiHelper,
        endpoint,
        name,
        (data) => ApiTestHelper.validateNestedData(data)
      );
    });
  });
});

test.describe('Market Stock Specific API Tests', () => {
  test('should get top stock by volume for HOSE', async () => {
    await ApiTestHelper.performApiTest(
      apiHelper,
      API_ENDPOINTS.STOCK_TOP,
      'Top Stock',
      (data) => ApiTestHelper.validateTopStockData(data)
    );
  });

  test('should get stock influence data for HOSE with limit=1', async () => {
    await ApiTestHelper.performApiTest(
      apiHelper,
      API_ENDPOINTS.STOCK_INFLUENCE_LIMIT,
      'Stock Influence (Limit)',
      (data) => ApiTestHelper.validateInfluenceData(data)
    );
  });
});
