import { Locator, Page } from '@playwright/test';
import BasePage from './BasePage';
import { TableUtils, FormUtils } from '../../helpers/uiUtils';

// Interface definitions for better type safety
interface OpenPositionData {
    contractCode: string;
    position: string;
    quantityOpen: string;
    longPending: string;
    shortPending: string;
    avgPrice: string;
    marketPrice: string;
    profitLossPercent: string;
    profitLoss: string;
}

interface reversePositionModalInfo {
    vsdNumber: string;
    subaccount: string;
    orderType: string;
    symbol: string;
    currentPrice: string;
    currentQuantity: string;
}

interface closeOpenPositionModalInfo {
    vsdNumber: string;
    subaccount: string;
    orderType: string;
    symbol: string;
    currentPrice: string;
    currentQuantity: string;
}

interface orderListData {
    orderNumber: string;
    orignalNumber: string;
    contractCode: string;
    orderType: string;
    type: string;
    orderPrice: string;
    orderQuantity: string;
    matchedQuantity: string;
    remainQuantity: string;
    status: string;
}

interface editOrderModalInfo {
    vsdNumber: string;
    subaccount: string;
    orderType: string;
    symbol: string;
    currentPrice: string;
    currentQuantity: string;
}

interface OrderModalInfo {
    contractCode: string;
    orderType: string;
    orderNumber: string;
}


type TabName = 'openPosition' | 'orderList' | 'history' | 'conditionalOrderList' | 'closedPosition' | 'PLReport' | 'Asset';

class PositionPage extends BasePage {
    // Constants
    private static readonly DEFAULT_TIMEOUT = 10000;
    private static readonly SHORT_TIMEOUT = 1000;
    private static readonly POLLING_INTERVAL = 500;

    // Navigation Elements
    positionButton!: Locator;
    openPositionTab!: Locator;
    orderListTab!: Locator;
    historyTab!: Locator;
    conditionalOrderListTab!: Locator;
    closedPositionTab!: Locator;
    PLReportTab!: Locator;
    AssetTab!: Locator;
    expandPositionButton!: Locator;
    closePositionButton!: Locator;
    closeAllPositionButton!: Locator;


    // Open Position Table Elements
    positionTable!: Locator;
    tableHeaders!: Locator;
    tableRows!: Locator;

    reversePositionModal!: Locator;
    reversePositionModalVsdNumber!: Locator;
    reversePositionModalSubaccount!: Locator;
    reversePositionModalOrderType!: Locator;
    reversePositionModalSymbol!: Locator;
    reversePositionModalCurrentPrice!: Locator;
    reversePositionModalCurrentQuantity!: Locator;
    reversePositionModalConfirmButton!: Locator;
    reversePositionModalCancelButton!: Locator;

    closeOpenPositionModal!: Locator;
    closeOpenPositionModalVsdNumber!: Locator;
    closeOpenPositionModalSubaccount!: Locator;
    closeOpenPositionModalOrderType!: Locator;
    closeOpenPositionModalSymbol!: Locator;
    closeOpenPositionModalCurrentPrice!: Locator;
    closeOpenPositionModalCurrentQuantity!: Locator;
    closeOpenPositionModalConfirmButton!: Locator;
    closeOpenPositionModalCancelButton!: Locator;

    closeAllPositionModal!: Locator;
    closeAllPositionConfirmButton!: Locator;
    closeAllPositionModalCloseButton!: Locator;

    // Order List Table Elements
    orderListTable!: Locator;
    orderListTableHeaders!: Locator;
    orderListTableRows!: Locator;

    editOrderModal!: Locator;
    editOrderModalVsdNumber!: Locator;
    editOrderModalSubaccount!: Locator;
    editOrderModalOrderType!: Locator;
    editOrderModalSymbol!: Locator;
    editOrderModalCurrentPrice!: Locator;
    editOrderModalCurrentQuantity!: Locator;
    editOrderModalConfirmButton!: Locator;
    editOrderModalCancelButton!: Locator;

    cancelModal!: Locator;
    cancelModalConfirmButton!: Locator;
    cancelModalCancelButton!: Locator;
    cancelModalContractCode!: Locator;
    cancelModalOrderType!: Locator;
    cancelModalOrderNumber!: Locator;

    cancelAllOrderButton!: Locator;
    cancelAllModal!: Locator;
    cancelAllConfirmButton!: Locator;
    cancelAllModalCloseButton!: Locator;

    constructor(page: Page) {
        super(page);
        this.initializeLocators(page);
    }

    /**
     * Initialize all locators in one place
     */
    private initializeLocators(page: Page): void {
        // Navigation Elements
        this.positionButton = page.locator('.footer-btn:has(.iOrderList)');
        this.openPositionTab = page.locator('.panel-tab', { hasText: /Vị thế mở/ });
        this.orderListTab = page.locator('.panel-tab', { hasText: /Sổ lệnh/ });
        this.historyTab = page.locator('.panel-tab', { hasText: /Lịch sử lệnh/ });
        this.conditionalOrderListTab = page.locator('.panel-tab', { hasText: /Sổ lệnh điều kiện/ });
        this.closedPositionTab = page.locator('.panel-tab', { hasText: /Vị thế đóng/ });
        this.PLReportTab = page.locator('.panel-tab', { hasText: /Báo cáo Lãi/ });
        this.AssetTab = page.locator('.panel-tab', { hasText: /Tài sản/ });
        this.expandPositionButton = page.locator('.panel-header .icon.iZoomOut');
        this.closePositionButton = page.locator('.panel-header .icon.iClose');
        this.closeAllPositionButton = page.locator('.btn--cancel.btn-icon');

        // Open Position Table Elements
        this.positionTable = page.locator('.derivative__postion');
        this.tableHeaders = page.locator('.derivative__postion thead th');
        this.tableRows = page.locator('.derivative__postion tbody tr');

        // Order List Table Elements
        this.orderListTable = page.locator('.derivative__open-orders');
        this.orderListTableHeaders = page.locator('..derivative__open-orders thead th');
        this.orderListTableRows = page.locator('.derivative__open-orders tbody tr');
        this.cancelAllOrderButton = page.locator('.derivative__open-orders .btn--cancel.btn-icon');

        // Modal Elements
        this.initializeModalLocators(page);
    }

    /**
     * Initialize modal locators separately for better organization
     */
    private initializeModalLocators(page: Page): void {
        // Close All Position Modal
        this.closeAllPositionModal = page.locator('.wts-modal', { hasText: /Xác nhận đóng vị thế/ });
        this.closeAllPositionConfirmButton = page.locator('.wts-modal .btn-confirm');
        this.closeAllPositionModalCloseButton = page.locator('.wts-modal .btn--cancel');

        // Reverse Position Modal
        this.reversePositionModal = page.locator('.wts-modal', { hasText: /Xác nhận đảo vị thế/ });
        this.reversePositionModalVsdNumber = page.locator('.wts-modal .confirm-order-body__infor-value p').nth(0);
        this.reversePositionModalSubaccount = page.locator('.wts-modal .confirm-order-body__infor-value p').nth(1);
        this.reversePositionModalOrderType = page.locator('.wts-modal .confirm-order-body__detail .d');
        this.reversePositionModalSymbol = page.locator('.wts-modal .confirm-order-body__detail .order-symbol');
        this.reversePositionModalCurrentPrice = page.locator('.wts-modal .confirm-order-body__detail .order-price');
        this.reversePositionModalCurrentQuantity = page.locator('.wts-modal .confirm-order-body__detail .order-quantity');
        this.reversePositionModalConfirmButton = page.locator('.wts-modal .btn-confirm');
        this.reversePositionModalCancelButton = page.locator('.wts-modal .btn--cancel');

        // Close Open Position Modal
        this.closeOpenPositionModal = page.locator('.wts-modal', { hasText: /Xác nhận đóng vị thế/ });
        this.closeOpenPositionModalVsdNumber = page.locator('.wts-modal .confirm-order-body__infor-value p').nth(0);
        this.closeOpenPositionModalSubaccount = page.locator('.wts-modal .confirm-order-body__infor-value p').nth(1);
        this.closeOpenPositionModalOrderType = page.locator('.wts-modal .confirm-order-body__detail .d');
        this.closeOpenPositionModalSymbol = page.locator('.wts-modal .confirm-order-body__detail .order-symbol');
        this.closeOpenPositionModalCurrentPrice = page.locator('.wts-modal .confirm-order-body__detail .order-price');
        this.closeOpenPositionModalCurrentQuantity = page.locator('.wts-modal .confirm-order-body__detail .order-quantity');
        this.closeOpenPositionModalConfirmButton = page.locator('.wts-modal .btn-confirm');
        this.closeOpenPositionModalCancelButton = page.locator('.wts-modal .btn--cancel');

        // Edit Order Modal
        this.editOrderModal = page.locator('.wts-modal', { hasText: /Xác nhận sửa lệnh/ });
        this.editOrderModalVsdNumber = page.locator('.wts-modal .confirm-order-body__infor-value p').nth(0);
        this.editOrderModalSubaccount = page.locator('.wts-modal .confirm-order-body__infor-value p').nth(1);
        this.editOrderModalOrderType = page.locator('.wts-modal .confirm-order-body__detail .d');
        this.editOrderModalSymbol = page.locator('.wts-modal .confirm-order-body__detail .order-symbol');
        this.editOrderModalCurrentPrice = page.locator('.wts-modal .confirm-order-body__detail .order-price');
        this.editOrderModalCurrentQuantity = page.locator('.wts-modal .confirm-order-body__detail .order-quantity');
        this.editOrderModalConfirmButton = page.locator('.wts-modal .btn-confirm');
        this.editOrderModalCancelButton = page.locator('.wts-modal .btn--cancel');

        this.cancelModal = page.locator('.wts-modal', { hasText: /Xác nhận hủy lệnh/ });
        this.cancelModalContractCode = page.locator('.wts-modal .delete-order-body__infor-value p').nth(0);
        this.cancelModalOrderType = page.locator('.wts-modal .delete-order-body__infor-value p').nth(1);
        this.cancelModalOrderNumber = page.locator('.wts-modal .delete-order-body__infor-value p').nth(2);
        this.cancelModalConfirmButton = page.locator('.wts-modal .btn-confirm');
        this.cancelModalCancelButton = page.locator('.wts-modal .btn--cancel');

        this.cancelAllModal = page.locator('.wts-modal', { hasText: /Xác nhận hủy tất cả lệnh/ });
        this.cancelAllConfirmButton = page.locator('.wts-modal .btn-confirm');
        this.cancelAllModalCloseButton = page.locator('.wts-modal .btn--cancel');

    }

    // =================== DYNAMIC LOCATOR METHODS ===================

    /**
     * Get column locator for specific row
     */
    private getColumnOpenPositionLocator(rowIndex: number, columnIndex: number): Locator {
        return this.page.locator(`.table-bordered.tbl-list tbody tr:nth-child(${rowIndex + 1}) td:nth-child(${columnIndex})`);
    }
    private contractCodePositionColumn = (rowIndex: number): Locator => this.getColumnOpenPositionLocator(rowIndex, 1);
    private positionColumn = (rowIndex: number): Locator => this.getColumnOpenPositionLocator(rowIndex, 2);
    private quantityOpenColumn = (rowIndex: number): Locator => this.getColumnOpenPositionLocator(rowIndex, 3);
    private longPendingColumn = (rowIndex: number): Locator => this.getColumnOpenPositionLocator(rowIndex, 4);
    private shortPendingColumn = (rowIndex: number): Locator => this.getColumnOpenPositionLocator(rowIndex, 5);
    private avgPriceColumn = (rowIndex: number): Locator => this.getColumnOpenPositionLocator(rowIndex, 6);
    private marketPriceColumn = (rowIndex: number): Locator => this.getColumnOpenPositionLocator(rowIndex, 7);
    private profitLossPercentColumn = (rowIndex: number): Locator => this.getColumnOpenPositionLocator(rowIndex, 8);
    private profitLossColumn = (rowIndex: number): Locator => this.getColumnOpenPositionLocator(rowIndex, 9);

    private getColumnOrderListLocator(rowIndex: number, columnIndex: number): Locator {
        return this.page.locator(`.derivative__open-orders tbody tr:nth-child(${rowIndex + 1}) td:nth-child(${columnIndex})`);
    }
    private orderNumberColumn = (rowIndex: number): Locator => this.getColumnOrderListLocator(rowIndex, 1);
    private orignalNumberColumn = (rowIndex: number): Locator => this.getColumnOrderListLocator(rowIndex, 2);
    private contractCodeOrderListColumn = (rowIndex: number): Locator => this.getColumnOrderListLocator(rowIndex, 3);
    private orderTypeColumn = (rowIndex: number): Locator => this.getColumnOrderListLocator(rowIndex, 4);
    private typeColumn = (rowIndex: number): Locator => this.getColumnOrderListLocator(rowIndex, 5);
    private orderPriceColumn = (rowIndex: number): Locator => this.getColumnOrderListLocator(rowIndex, 6);
    private orderQuantityColumn = (rowIndex: number): Locator => this.getColumnOrderListLocator(rowIndex, 7);
    private matchedQuantityColumn = (rowIndex: number): Locator => this.getColumnOrderListLocator(rowIndex, 8);
    private remainQuantityColumn = (rowIndex: number): Locator => this.getColumnOrderListLocator(rowIndex, 9);
    private statusColumn = (rowIndex: number): Locator => this.getColumnOrderListLocator(rowIndex, 10);

    /**
     * Get action button locators for specific row
     */
    private stopTakeProfitButton = (rowIndex: number): Locator =>
        this.page.locator(`.table tbody tr:nth-child(${rowIndex + 1}) .btn--authen`);

    private reversePositionButton = (rowIndex: number): Locator =>
        this.page.locator(`.table tbody tr:nth-child(${rowIndex + 1}) .btn--edit`);

    private closeOpenPositionButton = (rowIndex: number): Locator =>
        this.page.locator(`.table tbody tr:nth-child(${rowIndex + 1}) .btn--delete`);

    private editOrderButton = (rowIndex: number): Locator =>
        this.page.locator(`.table tbody tr:nth-child(${rowIndex + 1}) .btn--edit`);

    private cancelOrderButton = (rowIndex: number): Locator =>
        this.page.locator(`.table tbody tr:nth-child(${rowIndex + 1}) .btn--delete`);

    // =================== NAVIGATION METHODS ===================

    async openPositionPanel(): Promise<void> {
        await this.safeClick(this.positionButton);
        await this.page.waitForSelector('.card-panel-body', { timeout: PositionPage.DEFAULT_TIMEOUT });
    }


    async expandPositionPanel(): Promise<void> {
        await this.safeClick(this.expandPositionButton);
        await this.page.waitForTimeout(PositionPage.SHORT_TIMEOUT);
    }

    async closePositionPanel(): Promise<void> {
        await this.safeClick(this.closePositionButton);
    }

    async switchToTab(tabName: TabName): Promise<void> {
        const tabMap = {
            openPosition: this.openPositionTab,
            orderList: this.orderListTab,
            history: this.historyTab,
            conditionalOrderList: this.conditionalOrderListTab,
            closedPosition: this.closedPositionTab,
            PLReport: this.PLReportTab,
            Asset: this.AssetTab
        };

        await this.safeClick(tabMap[tabName]);
        await this.page.waitForTimeout(PositionPage.SHORT_TIMEOUT);
    }

    // =================== DATA RETRIEVAL METHODS ===================


    async getOpenPositionTableHeader(): Promise<string[]> {
        return TableUtils.getTableHeaders(this.tableHeaders);
    }

    async getOpenPositionTableData(): Promise<OpenPositionData[]> {
        await this.positionTable.waitFor({ state: 'visible' });
        const rows = await this.tableRows.all();
        const openPositions: OpenPositionData[] = [];

        for (const row of rows) {
            const cells = await row.locator('td').all();
            if (cells.length > 0) {
                openPositions.push({
                    contractCode: await cells[1]?.innerText() || '',
                    position: await cells[2]?.innerText() || '',
                    quantityOpen: await cells[3]?.innerText() || '',
                    longPending: await cells[4]?.innerText() || '',
                    shortPending: await cells[5]?.innerText() || '',
                    avgPrice: await cells[6]?.innerText() || '',
                    marketPrice: await cells[8]?.innerText() || '',
                    profitLossPercent: await cells[9]?.innerText() || '',
                    profitLoss: await cells[10]?.innerText() || '',
                });
            }
        }
        return openPositions;
    }

    async getOpenPositionDataByIndex(rowIndex: number): Promise<OpenPositionData> {
        return {
            contractCode: await this.contractCodePositionColumn(rowIndex).innerText(),
            position: await this.positionColumn(rowIndex).innerText(),
            quantityOpen: await this.quantityOpenColumn(rowIndex).innerText(),
            longPending: await this.longPendingColumn(rowIndex).innerText(),
            shortPending: await this.shortPendingColumn(rowIndex).innerText(),
            avgPrice: await this.avgPriceColumn(rowIndex).innerText(),
            marketPrice: await this.marketPriceColumn(rowIndex).innerText(),
            profitLossPercent: await this.profitLossPercentColumn(rowIndex).innerText(),
            profitLoss: await this.profitLossColumn(rowIndex).innerText(),
        };
    }

    async getOpenPositionCount(): Promise<number> {
        return await this.tableRows.count();
    }

    async getOrderListTableHeader(): Promise<string[]> {
        return TableUtils.getTableHeaders(this.orderListTableHeaders);
    }

    async getOrderListTableData(): Promise<orderListData[]> {
        await this.orderListTable.waitFor({ state: 'visible' });
        const rows = await this.orderListTableRows.all();
        const orders: orderListData[] = [];

        for (const row of rows) {
            const cells = await row.locator('td').all();
            if (cells.length > 0) {
                orders.push({
                    orderNumber: await cells[1]?.innerText() || '',
                    orignalNumber: await cells[2]?.innerText() || '',
                    contractCode: await cells[3]?.innerText() || '',
                    orderType: await cells[4]?.innerText() || '',
                    type: await cells[5]?.innerText() || '',
                    orderPrice: await cells[6]?.innerText() || '',
                    orderQuantity: await cells[7]?.innerText() || '',
                    matchedQuantity: await cells[8]?.innerText() || '',
                    remainQuantity: await cells[9]?.innerText() || '',
                    status: await cells[10]?.innerText() || '',
                });
            }
        }
        return orders;
    }

    async getOrderListDataByIndex(rowIndex: number): Promise<orderListData> {

        return {
            orderNumber: await this.orderNumberColumn(rowIndex).innerText(),
            orignalNumber: await this.orignalNumberColumn(rowIndex).innerText(),
            contractCode: await this.contractCodeOrderListColumn(rowIndex).innerText(),
            orderType: await this.orderTypeColumn(rowIndex).innerText(),
            type: await this.typeColumn(rowIndex).innerText(),
            orderPrice: await this.orderPriceColumn(rowIndex).innerText(),
            orderQuantity: await this.orderQuantityColumn(rowIndex).innerText(),
            matchedQuantity: await this.matchedQuantityColumn(rowIndex).innerText(),
            remainQuantity: await this.remainQuantityColumn(rowIndex).innerText(),
            status: await this.statusColumn(rowIndex).innerText(),
        };
    }

    async getOrderListCount(): Promise<number> {
        return await this.orderListTableRows.count();
    }

    // =================== ORDER ACTION METHODS ===================

    async stopTakeProfit(rowIndex: number = 0): Promise<void> {
        await this.safeClick(this.stopTakeProfitButton(rowIndex));
        await this.page.waitForTimeout(PositionPage.SHORT_TIMEOUT);
    }

    async stopTakeProfitByContractCode(contractCode: string): Promise<void> {
        const allPositions = await this.getOpenPositionTableData();
        const positionIndex = allPositions.findIndex(position => position.contractCode.includes(contractCode));
        if (positionIndex >= 0) {
            await this.stopTakeProfit(positionIndex);
        }
    }

    // =================== CANCEL ORDER METHODS ===================

    async cancelOrder(rowIndex: number = 0): Promise<void> {
        await this.safeClick(this.cancelOrderButton(rowIndex));
        await this.cancelModal.waitFor({ state: 'visible', timeout: PositionPage.DEFAULT_TIMEOUT });
        await this.safeClick(this.cancelModalConfirmButton);
        await this.cancelModal.waitFor({ state: 'hidden', timeout: PositionPage.DEFAULT_TIMEOUT });
        await this.page.waitForTimeout(PositionPage.SHORT_TIMEOUT);
    }

    async cancelActionCancelOrder(rowIndex: number = 0): Promise<void> {
        await this.safeClick(this.cancelOrderButton(rowIndex));
        await this.cancelModal.waitFor({ state: 'visible', timeout: PositionPage.DEFAULT_TIMEOUT });
        await this.safeClick(this.cancelModalCancelButton);
        await this.cancelModal.waitFor({ state: 'hidden', timeout: PositionPage.DEFAULT_TIMEOUT });
        await this.page.waitForTimeout(PositionPage.SHORT_TIMEOUT);
    }

    async getCancelOrderModalInfo(rowIndex: number = 0): Promise<OrderModalInfo> {
        await this.safeClick(this.cancelOrderButton(rowIndex));
        await this.cancelModal.waitFor({ state: 'visible', timeout: PositionPage.DEFAULT_TIMEOUT });
        return {
            contractCode: await this.cancelModalContractCode.textContent() || '',
            orderType: await this.cancelModalOrderType.textContent() || '',
            orderNumber: await this.cancelModalOrderNumber.textContent() || '',
        };
    }

    async cancelOrderByContractCode(contractCode: string): Promise<void> {
        const allOrders = await this.getOrderListTableData();
        const orderIndex = allOrders.findIndex(order => order.contractCode.includes(contractCode));
        if (orderIndex >= 0) {
            await this.cancelOrder(orderIndex);
        }
    }

    async cancelOrderByOrderNumber(orderNumber: string): Promise<void> {
        const allOrders = await this.getOrderListTableData();
        const orderIndex = allOrders.findIndex(order => order.orderNumber.includes(orderNumber));
        if (orderIndex >= 0) {
            await this.cancelOrder(orderIndex);
        }
    }

    async cancelOrderByStatus(status: string): Promise<void> {
        const allOrders = await this.getOrderListTableData();
        const orderIndex = allOrders.findIndex(order => order.status.includes(status));
        if (orderIndex >= 0) {
            await this.cancelOrder(orderIndex);
        }
    }

    async cancelOrderByStatusAndIndex(status: string, orderIndexInFilteredList: number = 0): Promise<void> {
        const allOrders = await this.getOrderListTableData();
        const matchingOrders = allOrders.filter(order => order.status.includes(status));

        if (matchingOrders.length > orderIndexInFilteredList) {
            const actualIndex = allOrders.indexOf(matchingOrders[orderIndexInFilteredList]);
            await this.cancelOrder(actualIndex);
        }
    }

    async cancelAllOrdersByStatus(status: string): Promise<void> {
        const allOrders = await this.getOrderListTableData();
        const ordersToCancel = allOrders
            .map((order, index) => ({ order, index }))
            .filter(({ order }) => order.status.includes(status));

        for (const { index } of ordersToCancel) {
            await this.cancelOrder(index);
            await this.page.waitForTimeout(500);
        }
    }

    // =================== CANCEL ALL ORDERS METHODS ===================

    async cancelAllOrders(): Promise<void> {
        await this.safeClick(this.cancelAllOrderButton);
        await this.cancelAllModal.waitFor({ state: 'visible', timeout: PositionPage.DEFAULT_TIMEOUT });
        await this.safeClick(this.cancelAllConfirmButton);
        await this.cancelAllModal.waitFor({ state: 'hidden', timeout: PositionPage.DEFAULT_TIMEOUT });
        await this.page.waitForTimeout(2000);
    }

    async closeCancelAllModal(): Promise<void> {
        await this.safeClick(this.cancelAllModalCloseButton);
        await this.cancelAllModal.waitFor({ state: 'hidden', timeout: 5000 });
        await this.page.waitForTimeout(PositionPage.SHORT_TIMEOUT);
    }

    async closeAllPositions(): Promise<void> {
        await this.safeClick(this.closeAllPositionButton);
        await this.closeAllPositionModal.waitFor({ state: 'visible', timeout: PositionPage.DEFAULT_TIMEOUT });
        await this.safeClick(this.closeAllPositionConfirmButton);
        await this.closeAllPositionModal.waitFor({ state: 'hidden', timeout: PositionPage.DEFAULT_TIMEOUT });
        await this.page.waitForTimeout(2000);
    }

    async closeCloseAllPositions(): Promise<void> {
        await this.safeClick(this.closeAllPositionModalCloseButton);
        await this.closeAllPositionModal.waitFor({ state: 'hidden', timeout: PositionPage.DEFAULT_TIMEOUT });
        await this.page.waitForTimeout(PositionPage.SHORT_TIMEOUT);
    }

    // =================== EDIT ORDER METHODS ===================

    async openEditOrderModal(rowIndex: number = 0): Promise<void> {
        await this.safeClick(this.editOrderButton(rowIndex));
        await this.editOrderModal.waitFor({ state: 'visible', timeout: PositionPage.DEFAULT_TIMEOUT });
    }

    async getEditOrderModalInfo(rowIndex: number = 0): Promise<editOrderModalInfo> {
        await this.openEditOrderModal(rowIndex);
        return {
            vsdNumber: await this.editOrderModalVsdNumber.textContent() || '',
            subaccount: await this.editOrderModalSubaccount.textContent() || '',
            orderType: await this.editOrderModalOrderType.textContent() || '',
            symbol: await this.editOrderModalSymbol.textContent() || '',
            currentPrice: await this.editOrderModalCurrentPrice.textContent() || '',
            currentQuantity: await this.editOrderModalCurrentQuantity.textContent() || '',
        };
    }

    async editOrder(rowIndex: number = 0, newPrice?: number, newQuantity?: number): Promise<void> {
        await this.openEditOrderModal(rowIndex);
        if (newPrice) {
            await FormUtils.fillField(this.editOrderModalCurrentPrice, newPrice);
        }
        if (newQuantity) {
            await FormUtils.fillField(this.editOrderModalCurrentQuantity, newQuantity);
        }
        await this.safeClick(this.editOrderModalConfirmButton);
        await this.editOrderModal.waitFor({ state: 'hidden', timeout: PositionPage.DEFAULT_TIMEOUT });
        await this.page.waitForTimeout(PositionPage.SHORT_TIMEOUT);
    }

    async cancelEditOrder(): Promise<void> {
        await this.safeClick(this.editOrderModalCancelButton);
        await this.editOrderModal.waitFor({ state: 'hidden', timeout: PositionPage.DEFAULT_TIMEOUT });
        await this.page.waitForTimeout(PositionPage.SHORT_TIMEOUT);
    }

    async editOrderByOrderNumber(orderNumber: string, newPrice?: number, newQuantity?: number): Promise<void> {
        const orderIndex = await this.findOrderIndexByOrderNumber(orderNumber);
        if (orderIndex >= 0) {
            await this.editOrder(orderIndex, newPrice, newQuantity);
        }
        else {
            throw new Error(`Order with number ${orderNumber} not found`);
        }
    }

    async editOrderByContractCode(contractCode: string, newPrice?: number, newQuantity?: number): Promise<void> {
        const allOrders = await this.getOrderListTableData();
        const orderIndex = allOrders.findIndex(order => order.contractCode.includes(contractCode));
        if (orderIndex >= 0) {
            await this.editOrder(orderIndex, newPrice, newQuantity);
        }
        else {
            throw new Error(`Order with contract code ${contractCode} not found`);
        }
    }

    // =================== REVERSE POSITION METHODS ===================
    async openReversePositionModal(rowIndex: number = 0): Promise<void> {
        await this.safeClick(this.reversePositionButton(rowIndex));
        await this.reversePositionModal.waitFor({ state: 'visible', timeout: PositionPage.DEFAULT_TIMEOUT });
    }

    async getReversePositionModalInfo(rowIndex: number = 0): Promise<reversePositionModalInfo> {
        await this.openReversePositionModal(rowIndex);
        return {
            vsdNumber: await this.reversePositionModalVsdNumber.textContent() || '',
            subaccount: await this.reversePositionModalSubaccount.textContent() || '',
            orderType: await this.reversePositionModalOrderType.textContent() || '',
            symbol: await this.reversePositionModalSymbol.textContent() || '',
            currentPrice: await this.reversePositionModalCurrentPrice.textContent() || '',
            currentQuantity: await this.reversePositionModalCurrentQuantity.textContent() || '',
        };
    }
    async reversePosition(rowIndex: number = 0): Promise<void> {
        await this.safeClick(this.reversePositionButton(rowIndex));
        await this.reversePositionModal.waitFor({ state: 'visible', timeout: PositionPage.DEFAULT_TIMEOUT });
        await this.safeClick(this.reversePositionModalConfirmButton);
        await this.reversePositionModal.waitFor({ state: 'hidden', timeout: PositionPage.DEFAULT_TIMEOUT });
        await this.page.waitForTimeout(PositionPage.SHORT_TIMEOUT);
    }

    async cancelReversePosition(): Promise<void> {
        await this.safeClick(this.reversePositionModalCancelButton);
        await this.reversePositionModal.waitFor({ state: 'hidden', timeout: PositionPage.DEFAULT_TIMEOUT });
        await this.page.waitForTimeout(PositionPage.SHORT_TIMEOUT);
    }

    async reversePositionByContractCode(contractCode: string): Promise<void> {
        const allOrders = await this.getOrderListTableData();
        const orderIndex = allOrders.findIndex(order => order.contractCode.includes(contractCode));
        if (orderIndex >= 0) {
            await this.reversePosition(orderIndex);
        }
    }

    // =================== CLOSE OPEN POSITION METHODS ===================
    async openCloseOpenPositionModal(rowIndex: number = 0): Promise<void> {
        await this.safeClick(this.closeOpenPositionButton(rowIndex));
        await this.closeOpenPositionModal.waitFor({ state: 'visible', timeout: PositionPage.DEFAULT_TIMEOUT });
    }

    async getCloseOpenPositionModalInfo(rowIndex: number = 0): Promise<closeOpenPositionModalInfo> {
        await this.openCloseOpenPositionModal(rowIndex);
        return {
            vsdNumber: await this.closeOpenPositionModalVsdNumber.textContent() || '',
            subaccount: await this.closeOpenPositionModalSubaccount.textContent() || '',
            orderType: await this.closeOpenPositionModalOrderType.textContent() || '',
            symbol: await this.closeOpenPositionModalSymbol.textContent() || '',
            currentPrice: await this.closeOpenPositionModalCurrentPrice.textContent() || '',
            currentQuantity: await this.closeOpenPositionModalCurrentQuantity.textContent() || '',
        };
    }

    async closeOpenPosition(rowIndex: number = 0): Promise<void> {
        await this.safeClick(this.closeOpenPositionButton(rowIndex));
        await this.closeOpenPositionModal.waitFor({ state: 'visible', timeout: PositionPage.DEFAULT_TIMEOUT });
        await this.safeClick(this.closeOpenPositionModalConfirmButton);
        await this.closeOpenPositionModal.waitFor({ state: 'hidden', timeout: PositionPage.DEFAULT_TIMEOUT });
        await this.page.waitForTimeout(PositionPage.SHORT_TIMEOUT);
    }

    async cancelCloseOpenPosition(): Promise<void> {
        await this.safeClick(this.closeOpenPositionModalCancelButton);
        await this.closeOpenPositionModal.waitFor({ state: 'hidden', timeout: PositionPage.DEFAULT_TIMEOUT });
        await this.page.waitForTimeout(PositionPage.SHORT_TIMEOUT);
    }

    async closeOpenPositionByContractCode(contractCode: string): Promise<void> {
        const allOrders = await this.getOrderListTableData();
        const orderIndex = allOrders.findIndex(order => order.contractCode.includes(contractCode));
        if (orderIndex >= 0) {
            await this.closeOpenPosition(orderIndex);
        }
    }

    // =================== SEARCH AND FIND UTILITY METHODS ===================

    private async findOrderIndexByOrderNumber(orderNumber: string): Promise<number> {
        const allOrders = await this.getOrderListTableData();
        return allOrders.findIndex(order => order.orderNumber === orderNumber);
    }

    async getOrderByOrderNumber(orderNumber: string): Promise<orderListData | null> {
        const orders = await this.getOrderListTableData();
        return orders.find(order => order.orderNumber === orderNumber) || null;
    }

    async getOrdersByStatus(status: string): Promise<orderListData[]> {
        const orders = await this.getOrderListTableData();
        return orders.filter(order => order.status.includes(status));
    }

    async getOrdersByContractCode(contractCode: string): Promise<orderListData[]> {
        const orders = await this.getOrderListTableData();
        return orders.filter(order => order.contractCode.includes(contractCode));
    }

    async getAllOrderStatuses(): Promise<string[]> {
        const orders = await this.getOrderListTableData();
        const statuses = orders.map(order => order.status);
        return [...new Set(statuses)];
    }

    async getAllContractCodes(): Promise<string[]> {
        const orders = await this.getOrderListTableData();
        const contractCodes = orders.map(order => order.contractCode);
        return [...new Set(contractCodes)];
    }

    // =================== VERIFICATION METHODS ===================

    async verifyOrderExists(contractCode: string): Promise<boolean> {
        const orders = await this.getOrderListTableData();
        return orders.some(order => order.contractCode.includes(contractCode));
    }

    async verifyOrderStatus(contractCode: string, expectedStatus: string): Promise<boolean> {
        const orders = await this.getOrderListTableData();
        const order = orders.find(order => order.contractCode.includes(contractCode));
        return order ? order.status.includes(expectedStatus) : false;
    }

    async verifyTableHasData(): Promise<boolean> {
        const count = await this.getOrderListCount();
        return count > 0;
    }


}

export default PositionPage;