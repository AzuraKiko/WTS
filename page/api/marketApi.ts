import { TEST_CONFIG } from '../../tests/utils/testConfig';
import apiHelper from "../../helpers/ApiHelper";

// Test data configurations
const API_ENDPOINTS = {
    GET_LIST_INDEX_DETAIL: `/getlistindexdetail/10,11,02,03,25`,
    GET_LATEST_DVX: `/getliststockdata`,
    GET_LIST_DVX: `/getListDvx`,
    GET_SUMMARY: `/getSummary`,

    GLOBAL_MARKET: '/market/public/market/global',
    COMMODITY_MARKET: '/Market/GetCommodity?lang=1',
    GET_LIST_STOCK: '/getliststockById',
    GET_CW: '/listCW.pt',
    GET_ETF: '/etf',

};

export class MarketApi extends apiHelper {
    apiHelper = new apiHelper({ baseUrl: TEST_CONFIG.WEB_LOGIN_URL });

    async getListIndexDetail(indexCode: string): Promise<any> {
        if (indexCode.toUpperCase() === 'VNI') {
            indexCode = '10';
        } else if (indexCode.toUpperCase() === 'VN30') {
            indexCode = '11';
        } else if (indexCode.toUpperCase() === 'HNX') {
            indexCode = '02';
        } else if (indexCode.toUpperCase() === 'UPCOM') {
            indexCode = '03';
        } else if (indexCode.toUpperCase() === 'VN100') {
            indexCode = '25';
        } else {
            throw new Error(`Invalid index code: "${indexCode}"`);
        }
        const response = await this.apiHelper.getFullResponse(API_ENDPOINTS.GET_LIST_INDEX_DETAIL);
        const indexData = response.data.find((index: any) => index.mc === indexCode);
        if (!indexData) {
            throw new Error(`Index data not found for indexCode="${indexCode}"`);
        }

        const openPrice = indexData.oIndex;
        const closePrice = indexData.cIndex;

        // "ot" format example: "6.26|0.34%|29798078|150|180|46"
        const otRaw = indexData.ot;
        const otParts = String(otRaw ?? '').split('|');
        const otIndexChange = otParts[0] || 0;
        const otChangePercent = otParts[1] || "0%";

        let signedIndexChange: string = "0";
        let signedChangePercent: string = "0%";

        if (Number(closePrice) > Number(openPrice)) {
            signedIndexChange = String(otIndexChange);
            signedChangePercent = String(otChangePercent);
        } else {
            signedIndexChange = String(-Number(otIndexChange));
            signedChangePercent = String(-Number(otChangePercent.replace('%', ''))) + '%';
        }

        return {
            indexValue: closePrice,
            indexChange: signedIndexChange,
            changePercent: signedChangePercent,
            volValue: indexData.vol,
            valueValue: indexData.value,
        };
    }

    async getTotalValue(): Promise<any> {
        const response = await this.apiHelper.getFullResponse(API_ENDPOINTS.GET_LIST_INDEX_DETAIL);
        const data = response.data.filter((index: any) => index.mc == '10' || index.mc == '02');
        const totalValue = data.reduce((total: number, index: any) => total + Number(index.value), 0);
        return totalValue;
    }

    async getOverViewlData(): Promise<any> {
        const response = await this.apiHelper.get(API_ENDPOINTS.GET_SUMMARY);
        const totalValue = await this.getTotalValue();
        return {
            totalVolume: response.ptvalue,
            totalValue: totalValue,
            roomNN: response.frvalue,
        };
    }

    async getListDvx(): Promise<any> {
        return this.apiHelper.getFullResponse(API_ENDPOINTS.GET_LIST_DVX);
    }

    async getLatestDvx(): Promise<any> {
        const response = await this.apiHelper.getFullResponse(API_ENDPOINTS.GET_LIST_DVX);
        // Lọc các items có setTp === "21"
        const filteredData = response.data.filter((dvx: any) => dvx.seTp === "21");
        if (filteredData.length === 0) {
            throw new Error('No DVX data found with setTp === "21"');
        }
        // Tìm item có exprDt nhỏ nhất (ngày đáo hạn gần nhất)
        const latestData = filteredData.reduce((latest: any, current: any) => {
            const latestExprDt = parseInt(latest.exprDt || "0");
            const currentExprDt = parseInt(current.exprDt || "0");
            return currentExprDt < latestExprDt ? current : latest;
        });
        const indexValue = latestData.lastPrice;
        const referencePrice = latestData.r;
        let indexChange: string = "0";
        let changePercent: string = "0%";

        if (Number(indexValue) > Number(referencePrice)) {
            indexChange = String(latestData.ot);
            changePercent = String(latestData.changePc);
        } else {
            indexChange = String(-Number(latestData.ot));
            changePercent = String(-Number(latestData.changePc.replace('%', ''))) + '%';
        }

        const volValue = latestData.lot;
        const valueValue = volValue * latestData.avePrice;
        return {
            indexCode: latestData.sym,
            indexValue: indexValue,
            indexChange: indexChange,
            changePercent: changePercent,
            volValue: volValue,
            valueValue: valueValue,
        };
    }

    async getDataLatestDvx(indexCode: string): Promise<any> {
        const endpoint = `${API_ENDPOINTS.GET_LATEST_DVX}/${indexCode}`;
        const response = await this.apiHelper.getFullResponse(endpoint);
        return response.data[0];
    }

    async getListStockById(boardId: string, board: string, noetf?: string): Promise<any> {
        const endpoint = `${API_ENDPOINTS.GET_LIST_STOCK}/${boardId}?board=${board}${noetf ? `&noetf=${noetf}` : ''}`;
        const response = await this.apiHelper.getFullResponse(endpoint);
        return response.data;
    }

    async getDataBySymbol(symbol: string, boardId: string, board: string, noetf: string): Promise<any> {
        const response = await this.getListStockById(boardId, board, noetf);
        const data = response.data.find((stock: any) => stock.sym === symbol);
        return data;
    }

    async getFirstStockCode(boardId: string, board: string, noetf?: string): Promise<any> {
        const response = await this.getListStockById(boardId, board, noetf);
        return response[0]?.sym;
    }

    async getCWData(): Promise<any> {
        const response = await this.apiHelper.getFullResponse(API_ENDPOINTS.GET_CW);
        return response.data;
    }

    async getFirstCWCode(): Promise<any> {
        const response = await this.getCWData();
        return response[0]?.code;
    }

    async getETFData(): Promise<any> {
        const response = await this.apiHelper.getFullResponse(API_ENDPOINTS.GET_ETF);
        return response.data;
    }

    async getFirstETFCode(): Promise<any> {
        const response = await this.getETFData();
        return response[0]?.sym;
    }
}

export class MarketGatewayApi extends apiHelper {
    apiHelper = new apiHelper({ baseUrl: TEST_CONFIG.BASE_URL });

    async getGlobalDataByName(indexName: string): Promise<any> {
        const response = await this.apiHelper.get(API_ENDPOINTS.GLOBAL_MARKET);
        const data = response.data.find((index: any) => index?.name === indexName);
        return {
            indexValue: data.closePrice,
            indexChange: data.changePriceValue,
            indexChangePercent: data.changePercentValue,
        };
    }
}

export class MarketWapiApi extends apiHelper {
    apiHelper = new apiHelper({ baseUrl: TEST_CONFIG.WAPI_URL });

    async getCommodityDataByName(commodityName: string): Promise<any> {
        const response = await this.apiHelper.get(API_ENDPOINTS.COMMODITY_MARKET);
        const data = response.data.find((commodity: any) => commodity?.SymbolName === commodityName);
        return {
            indexValue: data.Last,
            indexChange: data.Change,
            indexChangePercent: data.Percent,
        };
    }
}
