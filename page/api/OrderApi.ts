import apiHelper from "../../helpers/ApiHelper";
import crypto from "crypto";

interface NewOrderPayload {
    group: string;
    user: string;
    session: string;
    cmd: string;
    rqId: string;
    channel: string;
    type: string;
    token: string;
    data: {
        acntNo: string;
        subAcntNo: string;
        symbol: string;
        ordrQty: string;
        ordrUntprc: string;
        ordrTrdTp: string;
        buySelTp: string;
        oddOrdrYn: string;
        signStr: string;
    };
}

interface OrderParams {
    symbol: string;
    ordrQty: string;
    ordrUntprc: string;
    ordrTrdTp: string;
    buySelTp: string;
    oddOrdrYn: string;
    privateKey: string;
}

export default class OrderApi {
    private baseUrl: string;
    private apiHelper: apiHelper;

    constructor(baseUrl: string, timeout?: number) {
        this.baseUrl = baseUrl;
        if (timeout) {
            this.apiHelper = new apiHelper({ baseUrl: this.baseUrl, timeout: timeout });
        } else {
            this.apiHelper = new apiHelper({ baseUrl: this.baseUrl });
        }
    }

    /**
     * Generate SHA-256 hash
     */
    private sha256Hash(text: string): Buffer {
        return crypto.createHash("sha256").update(text).digest();
    }

    /**
     * Convert buffer to base64 string
     */
    private base64Stringify(buffer: Buffer): string {
        return buffer.toString("base64");
    }

    /**
     * Generate signature string for order
     */
    private generateSignStr(
        acntNo: string,      // Số tài khoản
        subAcntNo: string,   // Số tài khoản phụ
        symbol: string,      // Mã chứng khoán/symbol
        ordrQty: string,     // Số lượng đặt lệnh
        ordrUntprc: string,  // Giá đặt lệnh
        ordrTrdTp: string,   // Loại giao dịch
        buySelTp: string,    // Loại mua/bán
        oddOrdrYn: string,   // Có phải lệnh lẻ không
        uuid: string,        // ID duy nhất
        privateKey: string   // Khóa bí mật
    ): string {
        // Nối tất cả tham số thành một chuỗi
        const text = acntNo + subAcntNo + symbol + ordrQty + ordrUntprc + ordrTrdTp + buySelTp + oddOrdrYn + uuid + privateKey;

        // Tạo hash SHA-256
        const hash = this.sha256Hash(text);

        // Chuyển đổi sang Base64
        const signStr = this.base64Stringify(hash);

        return signStr;
    }

    /**
     * Generate matrix auth
     */
    public genMatrixAuth(matrixCode: string): string {
        const hashValue = this.sha256Hash(matrixCode);
        const matrixValue = this.base64Stringify(hashValue);
        return matrixValue;
    }

    /**
     * Place new order
     */
    async placeNewOrder(
        user: string,
        session: string,
        acntNo: string,
        subAcntNo: string,
        orderParams: OrderParams,
        rqId: string,
        token: string
    ): Promise<any> {
        const orderApiHelper = new apiHelper({ baseUrl: this.baseUrl });

        const signStr = this.generateSignStr(
            acntNo,
            subAcntNo,
            orderParams.symbol,
            orderParams.ordrQty,
            orderParams.ordrUntprc,
            orderParams.ordrTrdTp,
            orderParams.buySelTp,
            orderParams.oddOrdrYn,
            rqId,
            orderParams.privateKey
        );

        const newOrderPayload: NewOrderPayload = {
            group: "CORE",
            user: user,
            session: session,
            cmd: "NewOrder",
            rqId: rqId,
            channel: "WTS",
            type: "3",
            token: token,
            data: {
                acntNo,
                subAcntNo,
                symbol: orderParams.symbol,
                ordrQty: orderParams.ordrQty,
                ordrUntprc: orderParams.ordrUntprc,
                ordrTrdTp: orderParams.ordrTrdTp,
                buySelTp: orderParams.buySelTp,
                oddOrdrYn: orderParams.oddOrdrYn,
                signStr,
            },
        };

        const response = await orderApiHelper.post(
            '/CoreServlet.pt',
            JSON.stringify(newOrderPayload),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                },
            }
        );

        return response;
    }

    /**
     * Get list of all stocks
     */
    async getListAllStock(): Promise<any> {
        const listStockApiHelper = new apiHelper({ baseUrl: this.baseUrl });
        const response = await listStockApiHelper.get(`${this.baseUrl}/getlistallstock`);
        return response;
    }

}