import { Locator, Page } from '@playwright/test';
import BasePage from './BasePage';
import { TableUtils, FormUtils } from '../../helpers/uiUtils';

// Interface definitions for better type safety
interface OrderData {
    account: string;
    orderNo: string;
    originOrderNo: string;
    time: string;
    side: string;
    stockCode: string;
    orderType: string;
    price: string;
    quantity: string;
    matchedQuantity: string;
    remainingQuantity: string;
    status: string;
}

interface orderConditionalData {
    orderNo: string;
    orderType: string;
    fromDate: string;
    toDate: string;
    method: string;
    side: string;
    stockCode: string;
    price: string;
    activeCondition?: string;
    orderCondition?: string;
    vol: string;
    matchedQuantity: string;
    status: string;
}

interface OrderModalInfo {
    stockCode: string;
    orderType: string;
    orderNumber: string;
}

interface ModifyOrderModalInfo {
    orderNumber: string;
    account: string;
    orderType: string;
    symbol: string;
    currentPrice: string;
    currentQuantity: string;
}

interface ActionButtonsAvailability {
    hasCancel: boolean;
    hasModify: boolean;
}

interface SearchVerificationResult {
    success: boolean;
    filteredCount: number;
    originalCount: number;
}

interface TableStructureValidation {
    hasHeaders: boolean;
    hasRows: boolean;
    columnCount: number;
}

interface AvailableFilters {
    status: boolean;
    account: boolean;
    orderType: boolean;
}

interface OrderSummaryStats {
    totalOrders: number;
    uniqueStocks: number;
    uniqueStatuses: number;
    avgOrderQuantity?: number;
    hasMatches: boolean;
}

interface DataValidationResult {
    isValid: boolean;
    errors: string[];
}

interface PerformanceMetrics {
    orderLoadTime: number;
    tableRenderTime: number;
    searchResponseTime: number;
}

interface HealthCheckResult {
    overall: 'healthy' | 'warning' | 'error';
    checks: {
        tableStructure: boolean;
        dataIntegrity: boolean;
        filtersWorking: boolean;
        searchWorking: boolean;
        tabsWorking: boolean;
    };
    issues: string[];
}

type TabName = 'inday' | 'history' | 'conditional' | 'putthrough';

class OrderBook extends BasePage {
    // Constants
    private static readonly DEFAULT_TIMEOUT = 10000;
    private static readonly SHORT_TIMEOUT = 1000;
    private static readonly POLLING_INTERVAL = 500;

    // Navigation Elements
    orderBookButton!: Locator;
    orderIndayTab!: Locator;
    orderHistoryTab!: Locator;
    conditionalOrderTab!: Locator;
    putThroughOrderTab!: Locator;
    reloadOrderBookButton!: Locator;
    expandOrderBookButton!: Locator;
    closeOrderBookButton!: Locator;

    // Filter and Search Elements
    cancelAllOrderButton!: Locator;
    searchInput!: Locator;
    statusSelect!: Locator;
    accountSelect!: Locator;
    orderTypeSelect!: Locator;

    // Table Elements
    orderTable!: Locator;
    tableHeaders!: Locator;
    tableRows!: Locator;
    totalOrder!: Locator;

    // Table Column Locators (using functions for dynamic row selection)
    checkboxHeaderAll!: Locator;

    // Modal Elements
    cancelAllModal!: Locator;
    cancelAllModalHeader!: Locator;
    cancelAllModalTable!: Locator;
    cancelAllConfirmButton!: Locator;
    cancelAllModalCloseButton!: Locator;
    deleteOrderModal!: Locator;
    deleteOrderStockCode!: Locator;
    deleteOrderType!: Locator;
    deleteOrderNumber!: Locator;
    deleteOrderConfirmButton!: Locator;
    deleteOrderCancelButton!: Locator;
    modifyOrderModal!: Locator;
    modifyOrderNumber!: Locator;
    modifyOrderAccount!: Locator;
    modifyOrderType!: Locator;
    modifyOrderSymbol!: Locator;
    modifyOrderPriceInput!: Locator;
    modifyOrderQuantityInput!: Locator;
    modifyOrderConfirmButton!: Locator;
    modifyOrderCancelButton!: Locator;


    deleteOrderConfirmButtonConditional!: Locator;
    deleteOrderCancelButtonConditional!: Locator;

    constructor(page: Page) {
        super(page);
        this.initializeLocators(page);
    }

    /**
     * Initialize all locators in one place
     */
    private initializeLocators(page: Page): void {
        // Navigation Elements
        this.orderBookButton = page.locator('.footer-btn:has(.iOrderList)');
        this.orderIndayTab = page.locator('.panel-tab', { hasText: /Lệnh trong ngày/ });
        this.orderHistoryTab = page.locator('.panel-tab', { hasText: /Lịch sử lệnh/ });
        this.conditionalOrderTab = page.locator('.panel-tab', { hasText: /Lệnh điều kiện/ });
        this.putThroughOrderTab = page.locator('.panel-tab', { hasText: /Sổ lệnh thỏa thuận/ });
        this.reloadOrderBookButton = page.locator('.btn-icon .icon.iRefresh');
        this.expandOrderBookButton = page.locator('.icon.iZoomIn');
        this.closeOrderBookButton = page.locator('.icon.iClose');

        // Filter and Search Elements
        this.cancelAllOrderButton = page.locator('.btn-icon--sell2.cursor-pointer');
        this.searchInput = page.locator('.input-text-search .form-control');
        this.statusSelect = page.locator('.filter-control-select__control').nth(0);
        this.accountSelect = page.locator('.filter-control-select__control').nth(1);
        this.orderTypeSelect = page.locator('.filter-control-select__control').nth(2);

        // Table Elements
        this.totalOrder = page.locator('.card-panel-header__label');
        this.orderTable = page.locator('.table.table-bordered.tbl-list');
        this.tableHeaders = page.locator('.table-bordered.tbl-list thead th');
        this.tableRows = page.locator('.table-bordered.tbl-list tbody tr');
        this.checkboxHeaderAll = page.locator('.table-bordered.tbl-list thead th:nth-child(1) span')


        // Modal Elements
        this.initializeModalLocators(page);
    }

    /**
     * Initialize modal locators separately for better organization
     */
    private initializeModalLocators(page: Page): void {
        // Cancel All Orders Modal
        this.cancelAllModal = page.locator('.wts-modal .modal-content', { hasText: /Xác nhận hủy lệnh/ });
        this.cancelAllModalHeader = page.locator('.wts-modal__header', { hasText: /Xác nhận hủy lệnh/ });
        this.cancelAllModalTable = page.locator('.wts-modal .table.table-bordered.table-fix');
        this.cancelAllConfirmButton = page.locator('.wts-modal .btn.btn--primary');
        this.cancelAllModalCloseButton = page.locator('.wts-modal .btn-close');

        // Individual Order Cancel Modal
        this.deleteOrderModal = page.locator('.delete-order');
        this.deleteOrderStockCode = page.locator('.delete-order-body__infor-value p').nth(0);
        this.deleteOrderType = page.locator('.delete-order-body__infor-value p').nth(1);
        this.deleteOrderNumber = page.locator('.delete-order-body__infor-value p').nth(2);
        this.deleteOrderConfirmButton = page.locator('.delete-order .btn-confirm');
        this.deleteOrderCancelButton = page.locator('.delete-order .btn-cancel');

        // Modify Order Modal
        this.modifyOrderModal = page.locator('.confirm-order');
        this.modifyOrderNumber = page.locator('.confirm-order-body__infor-value p').nth(0);
        this.modifyOrderAccount = page.locator('.confirm-order-body__infor-value p').nth(1);
        this.modifyOrderType = page.locator('.confirm-order-body__detail .order-type .i');
        this.modifyOrderSymbol = page.locator('.confirm-order-body__detail .order-symbol');
        this.modifyOrderPriceInput = page.locator('.confirm-order-body__detail input[name="newPrice"]');
        this.modifyOrderQuantityInput = page.locator('.confirm-order-body__detail input[name="newVol"]');
        this.modifyOrderConfirmButton = page.locator('.confirm-order .btn-confirm');
        this.modifyOrderCancelButton = page.locator('.confirm-order .btn-cancel');

        // Delete Order Modal Conditional
        this.deleteOrderConfirmButtonConditional = page.locator('button[type="submit"]');
        this.deleteOrderCancelButtonConditional = page.locator('button[type="submit"] ~ button');
    }


    // =================== DYNAMIC LOCATOR METHODS ===================

    /**
     * Get column locator for specific row
     */
    private getColumnLocator(rowIndex: number, columnIndex: number): Locator {
        return this.page.locator(`.table-bordered.tbl-list tbody tr:nth-child(${rowIndex + 1}) td:nth-child(${columnIndex})`);
    }

    private checkboxColumn = (rowIndex: number): Locator => this.getColumnLocator(rowIndex, 1);
    private accountColumn = (rowIndex: number): Locator => this.getColumnLocator(rowIndex, 2);
    private orderNoColumn = (rowIndex: number): Locator => this.getColumnLocator(rowIndex, 3);
    private originOrderNoColumn = (rowIndex: number): Locator => this.getColumnLocator(rowIndex, 4);
    private timeColumn = (rowIndex: number): Locator => this.getColumnLocator(rowIndex, 5);
    private sideColumn = (rowIndex: number): Locator => this.getColumnLocator(rowIndex, 6);
    private stockCodeColumn = (rowIndex: number): Locator => this.getColumnLocator(rowIndex, 7);
    private orderTypeColumn = (rowIndex: number): Locator => this.getColumnLocator(rowIndex, 8);
    private priceColumn = (rowIndex: number): Locator => this.getColumnLocator(rowIndex, 9);
    private quantityColumn = (rowIndex: number): Locator => this.getColumnLocator(rowIndex, 10);
    private matchedQuantityColumn = (rowIndex: number): Locator => this.getColumnLocator(rowIndex, 11);
    private remainingQuantityColumn = (rowIndex: number): Locator => this.getColumnLocator(rowIndex, 12);
    private statusColumn = (rowIndex: number): Locator => this.getColumnLocator(rowIndex, 13);
    private actionColumn = (rowIndex: number): Locator => this.getColumnLocator(rowIndex, 14);
    private expandOrderButton = (rowIndex: number): Locator => this.getColumnLocator(rowIndex, 15);

    /**
     * Get action button locators for specific row
     */
    private cancelOrderButton = (rowIndex: number): Locator =>
        this.page.locator(`.table tbody tr:nth-child(${rowIndex + 1}) .btn--delete`);

    private modifyOrderButton = (rowIndex: number): Locator =>
        this.page.locator(`.table tbody tr:nth-child(${rowIndex + 1}) .btn--edit`);

    // =================== NAVIGATION METHODS ===================

    async openOrderBook(): Promise<void> {
        await this.orderBookButton.click();
        await this.page.waitForSelector('.card-panel-body', { timeout: OrderBook.DEFAULT_TIMEOUT });
    }

    async reloadOrderBook(): Promise<void> {
        await this.reloadOrderBookButton.click();
        await this.page.waitForTimeout(OrderBook.SHORT_TIMEOUT);
    }

    async expandOrderBook(): Promise<void> {
        await this.expandOrderBookButton.click();
        await this.page.waitForTimeout(OrderBook.SHORT_TIMEOUT);
    }

    async closeOrderBook(): Promise<void> {
        await this.closeOrderBookButton.click();
    }

    async switchToTab(tabName: TabName): Promise<void> {
        const tabMap = {
            inday: this.orderIndayTab,
            history: this.orderHistoryTab,
            conditional: this.conditionalOrderTab,
            putthrough: this.putThroughOrderTab
        };

        await tabMap[tabName].click();
        await this.page.waitForTimeout(OrderBook.SHORT_TIMEOUT);
    }

    async switchToOrderInDayTab(): Promise<void> {
        await this.switchToTab('inday');
    }

    async switchToOrderHistoryTab(): Promise<void> {
        await this.switchToTab('history');
    }

    async switchToConditionalOrderTab(): Promise<void> {
        await this.switchToTab('conditional');
    }

    async switchToPutThroughOrderTab(): Promise<void> {
        await this.switchToTab('putthrough');
    }

    // =================== FILTER AND SEARCH METHODS ===================

    async searchOrder(searchTerm: string): Promise<void> {
        await this.searchInput.fill(searchTerm);
        await this.page.waitForTimeout(OrderBook.SHORT_TIMEOUT);
    }

    async filterByStatus(status: string): Promise<void> {
        await this.statusSelect.click();
        await this.page.waitForSelector('.filter-control-select__menu-list', { state: 'visible' });
        await this.page.locator('.filter-control-select__option').filter({ hasText: status }).click();
        await this.page.waitForTimeout(OrderBook.SHORT_TIMEOUT);
    }

    async filterByAccount(account: string): Promise<void> {
        await this.accountSelect.click();
        await this.page.waitForSelector('.filter-control-select__menu-list', { state: 'visible' });
        await this.page.locator('.filter-control-select__option').filter({ hasText: account }).click();
        await this.page.waitForTimeout(OrderBook.SHORT_TIMEOUT);
    }

    async filterByOrderType(orderType: string): Promise<void> {
        await this.orderTypeSelect.click();
        await this.page.waitForSelector('.filter-control-select__menu-list', { state: 'visible' });
        await this.page.locator('.filter-control-select__option').filter({ hasText: orderType }).click();
        await this.page.waitForTimeout(OrderBook.SHORT_TIMEOUT);
    }

    // =================== DATA RETRIEVAL METHODS ===================

    async getTotalOrder(): Promise<string> {
        return await this.totalOrder.textContent() ?? '';
    }

    async getOrderbookTableHeader(): Promise<string[]> {
        return TableUtils.getTableHeaders(this.tableHeaders);
    }

    async getOrderTableData(): Promise<OrderData[]> {
        await this.orderTable.waitFor({ state: 'visible' });
        const rows = await this.tableRows.all();
        const orders: OrderData[] = [];

        for (const row of rows) {
            const cells = await row.locator('td').all();
            if (cells.length > 0) {
                orders.push({
                    account: await cells[1]?.innerText() || '',
                    orderNo: await cells[2]?.innerText() || '',
                    originOrderNo: await cells[3]?.innerText() || '',
                    time: await cells[4]?.innerText() || '',
                    side: await cells[5]?.innerText() || '',
                    stockCode: await cells[6]?.innerText() || '',
                    orderType: await cells[7]?.innerText() || '',
                    price: await cells[8]?.innerText() || '',
                    quantity: await cells[9]?.innerText() || '',
                    matchedQuantity: await cells[10]?.innerText() || '',
                    remainingQuantity: await cells[11]?.innerText() || '',
                    status: await cells[12]?.innerText() || '',
                });
            }
        }
        return orders;
    }

    async getOrderConditionalTableData(): Promise<orderConditionalData[]> {
        await this.orderTable.waitFor({ state: 'visible' });
        const rows = await this.tableRows.all();
        const orders: orderConditionalData[] = [];

        for (const row of rows) {
            const cells = await row.locator('td').all();
            if (cells.length > 0) {
                orders.push({
                    orderNo: await cells[0]?.innerText() || '',
                    orderType: await cells[1]?.innerText() || '',
                    fromDate: await cells[2]?.innerText() || '',
                    toDate: await cells[3]?.innerText() || '',
                    method: await cells[4]?.innerText() || '',
                    side: await cells[5]?.innerText() || '',
                    stockCode: await cells[6]?.innerText() || '',
                    price: await cells[7]?.innerText() || '',
                    activeCondition: await cells[8]?.innerText() || '',
                    vol: await cells[9]?.innerText() || '',
                    matchedQuantity: await cells[10]?.innerText() || '',
                    status: await cells[11]?.innerText() || '',
                });
            }
        }
        return orders;
    }

    async getOrderDataByIndex(rowIndex: number): Promise<OrderData> {
        return {
            account: await this.accountColumn(rowIndex).innerText(),
            orderNo: await this.orderNoColumn(rowIndex).innerText(),
            originOrderNo: await this.originOrderNoColumn(rowIndex).innerText(),
            time: await this.timeColumn(rowIndex).innerText(),
            side: await this.sideColumn(rowIndex).innerText(),
            stockCode: await this.stockCodeColumn(rowIndex).innerText(),
            orderType: await this.orderTypeColumn(rowIndex).innerText(),
            price: await this.priceColumn(rowIndex).innerText(),
            quantity: await this.quantityColumn(rowIndex).innerText(),
            matchedQuantity: await this.matchedQuantityColumn(rowIndex).innerText(),
            remainingQuantity: await this.remainingQuantityColumn(rowIndex).innerText(),
            status: await this.statusColumn(rowIndex).innerText(),
        };
    }

    async getOrderCount(): Promise<number> {
        return await this.tableRows.count();
    }

    // =================== SELECTION METHODS ===================

    async selectAllOrders(): Promise<void> {
        await this.checkboxHeaderAll.click();
        await this.page.waitForTimeout(OrderBook.POLLING_INTERVAL);
    }

    async selectOrderByIndex(rowIndex: number): Promise<void> {
        await this.checkboxColumn(rowIndex).click();
        await this.page.waitForTimeout(300);
    }

    async selectOrdersByIndexes(orderIndexes: number[]): Promise<void> {
        for (const index of orderIndexes) {
            await this.selectOrderByIndex(index);
        }
    }

    // =================== ORDER ACTION METHODS ===================

    async cancelOrder(rowIndex: number = 0): Promise<void> {
        await this.cancelOrderButton(rowIndex).click();
        await this.deleteOrderModal.waitFor({ state: 'visible', timeout: OrderBook.DEFAULT_TIMEOUT });
        await this.deleteOrderConfirmButton.click();
        await this.deleteOrderModal.waitFor({ state: 'hidden', timeout: OrderBook.DEFAULT_TIMEOUT });
        await this.page.waitForTimeout(OrderBook.SHORT_TIMEOUT);
    }

    async cancelOrderConditional(rowIndex: number = 0): Promise<void> {
        await this.cancelOrderButton(rowIndex).click();
        await this.deleteOrderModal.waitFor({ state: 'visible', timeout: OrderBook.DEFAULT_TIMEOUT });
        await this.deleteOrderConfirmButtonConditional.click();
        await this.deleteOrderModal.waitFor({ state: 'hidden', timeout: OrderBook.DEFAULT_TIMEOUT });
        await this.page.waitForTimeout(OrderBook.SHORT_TIMEOUT);
    }

    async cancelActionCancelOrder(rowIndex: number = 0): Promise<void> {
        await this.cancelOrderButton(rowIndex).click();
        await this.deleteOrderModal.waitFor({ state: 'visible', timeout: OrderBook.DEFAULT_TIMEOUT });
        await this.deleteOrderCancelButton.click();
        await this.deleteOrderModal.waitFor({ state: 'hidden', timeout: OrderBook.DEFAULT_TIMEOUT });
        await this.page.waitForTimeout(OrderBook.SHORT_TIMEOUT);
    }

    async getDeleteOrderModalInfo(rowIndex: number = 0): Promise<OrderModalInfo> {
        await this.cancelOrderButton(rowIndex).click();
        await this.deleteOrderModal.waitFor({ state: 'visible', timeout: OrderBook.DEFAULT_TIMEOUT });
        return {
            stockCode: await this.deleteOrderStockCode.textContent() ?? '',
            orderType: await this.deleteOrderType.textContent() ?? '',
            orderNumber: await this.deleteOrderNumber.textContent() ?? ''
        };
    }

    async cancelOrderByStatus(targetStatus: string): Promise<void> {
        const allOrders = await this.getOrderTableData();
        const ordersToCancel = allOrders.filter(order => order.status.includes(targetStatus));

        console.log(`Found ${ordersToCancel.length} orders with status '${targetStatus}' to cancel`);

        for (let i = 0; i < ordersToCancel.length; i++) {
            try {
                const currentOrders = await this.getOrderTableData();
                const orderIndex = currentOrders.findIndex(order =>
                    order.orderNo === ordersToCancel[i].orderNo &&
                    order.stockCode === ordersToCancel[i].stockCode
                );

                if (orderIndex >= 0) {
                    await this.cancelOrder(orderIndex);
                    console.log(`Canceled order ${ordersToCancel[i].stockCode} - ${ordersToCancel[i].orderNo}`);
                } else {
                    console.log(`Order not found: ${ordersToCancel[i].stockCode} - ${ordersToCancel[i].orderNo}`);
                }

                await this.page.waitForTimeout(OrderBook.POLLING_INTERVAL);
            } catch (error) {
                console.log(`Failed to cancel order ${ordersToCancel[i].stockCode}: ${error}`);
            }
        }
    }

    async cancelOrderByOrderNumber(orderNumber: string): Promise<void> {
        const orderIndex = await this.findOrderIndexByOrderNumber(orderNumber);
        if (orderIndex >= 0) {
            await this.cancelOrder(orderIndex);
        }
    }


    async cancelOrderConditionalByStatus(targetStatus: string): Promise<void> {
        const allOrders = await this.getOrderConditionalTableData();
        const ordersToCancel = allOrders.filter(order => order.status.includes(targetStatus));

        console.log(`Found ${ordersToCancel.length} orders with status '${targetStatus}' to cancel`);

        for (let i = 0; i < ordersToCancel.length; i++) {
            try {
                const currentOrders = await this.getOrderConditionalTableData();
                const orderIndex = currentOrders.findIndex(order =>
                    order.orderNo === ordersToCancel[i].orderNo &&
                    order.stockCode === ordersToCancel[i].stockCode
                );

                if (orderIndex >= 0) {
                    await this.cancelOrderConditional(orderIndex);
                    console.log(`Canceled order ${ordersToCancel[i].stockCode} - ${ordersToCancel[i].orderNo}`);
                } else {
                    console.log(`Order not found: ${ordersToCancel[i].stockCode} - ${ordersToCancel[i].orderNo}`);
                }

                await this.page.waitForTimeout(OrderBook.POLLING_INTERVAL);
            } catch (error) {
                console.log(`Failed to cancel order ${ordersToCancel[i].stockCode}: ${error}`);
            }
        }
    }

    async cancelOrderConditionalByStockCodeAndStatus(stockCode: string, status: string[]): Promise<void> {
        try {
            // Define scroll container for conditional orders table
            const scrollContainer = this.page.locator('.card-panel-body .scrollbar-container.ps.ps--active-y');

            // Data extractor function for conditional orders
            const dataExtractor = async (rowIndex: number): Promise<orderConditionalData> => {
                const row = this.tableRows.nth(rowIndex);
                const cells = await row.locator('td').all();

                if (cells.length === 0) {
                    throw new Error(`No cells found in row ${rowIndex}`);
                }

                return {
                    orderNo: await cells[0]?.innerText() || '',
                    orderType: await cells[1]?.innerText() || '',
                    fromDate: await cells[2]?.innerText() || '',
                    toDate: await cells[3]?.innerText() || '',
                    method: await cells[4]?.innerText() || '',
                    side: await cells[5]?.innerText() || '',
                    stockCode: await cells[6]?.innerText() || '',
                    price: await cells[7]?.innerText() || '',
                    activeCondition: await cells[8]?.innerText() || '',
                    vol: await cells[9]?.innerText() || '',
                    matchedQuantity: await cells[10]?.innerText() || '',
                    status: await cells[11]?.innerText() || '',
                };
            };

            // Search criteria to find order by stock code
            const searchCriteria = (data: orderConditionalData): boolean => {
                return data.stockCode.trim() === stockCode.trim() && status.includes(data.status.trim());
            };

            // Use TableUtils.findRowWithScrolling to find the order with scrolling support
            const foundOrder = await TableUtils.findRowWithScrolling(
                this.page,
                this.tableRows,
                scrollContainer,
                dataExtractor,
                searchCriteria
            );

            if (foundOrder) {
                await this.cancelOrderConditional(foundOrder.index);
                console.log(`Canceled order ${stockCode} at index ${foundOrder.index}`);
            } else {
                console.log(`Order not found: ${stockCode}`);
            }
        } catch (error) {
            console.log(`Failed to cancel order ${stockCode}: ${error}`);
        }
    }

    async cancelRandomOrderConditionalByStatus(targetStatus: string): Promise<void> {
        try {
            const allOrders = await this.getOrderConditionalTableData();
            const ordersToCancel = allOrders.filter(order => order.status.includes(targetStatus));

            if (ordersToCancel.length === 0) {
                console.log(`No orders found with status '${targetStatus}'`);
                return;
            }

            // Chọn random 1 lệnh từ danh sách
            const randomIndex = Math.floor(Math.random() * ordersToCancel.length);
            const selectedOrder = ordersToCancel[randomIndex];

            console.log(`Randomly selected order to cancel: ${selectedOrder.stockCode} - ${selectedOrder.orderNo} (from ${ordersToCancel.length} orders)`);

            // Tìm lại index trong danh sách hiện tại để đảm bảo chính xác
            const currentOrders = await this.getOrderConditionalTableData();
            const orderIndex = currentOrders.findIndex(order =>
                order.orderNo === selectedOrder.orderNo &&
                order.stockCode === selectedOrder.stockCode
            );

            if (orderIndex >= 0) {
                await this.cancelOrderConditional(orderIndex);
                console.log(`Successfully canceled random order: ${selectedOrder.stockCode} - ${selectedOrder.orderNo}`);
            } else {
                console.log(`Order not found when trying to cancel: ${selectedOrder.stockCode} - ${selectedOrder.orderNo}`);
            }
        } catch (error) {
            console.log(`Failed to cancel random order with status '${targetStatus}': ${error}`);
        }
    }

    // =================== MODIFY ORDER METHODS ===================

    async openModifyOrderModal(rowIndex: number = 0): Promise<void> {
        await this.modifyOrderButton(rowIndex).click();
        await this.modifyOrderModal.waitFor({ state: 'visible', timeout: OrderBook.DEFAULT_TIMEOUT });
    }

    async getModifyOrderModalInfo(rowIndex: number = 0): Promise<ModifyOrderModalInfo> {
        await this.openModifyOrderModal(rowIndex);
        return {
            orderNumber: await this.modifyOrderNumber.textContent() ?? '',
            account: await this.modifyOrderAccount.textContent() ?? '',
            orderType: await this.modifyOrderType.textContent() ?? '',
            symbol: await this.modifyOrderSymbol.textContent() ?? '',
            currentPrice: await this.modifyOrderPriceInput.inputValue(),
            currentQuantity: await this.modifyOrderQuantityInput.inputValue()
        };
    }

    async modifyOrderPrice(newPrice: number): Promise<void> {
        await FormUtils.fillField(this.modifyOrderPriceInput, newPrice);
    }

    async modifyOrderQuantity(newQuantity: number): Promise<void> {
        await FormUtils.fillField(this.modifyOrderQuantityInput, newQuantity);
    }

    async modifyOrder(rowIndex: number = 0, newPrice?: number, newQuantity?: number): Promise<void> {
        await this.openModifyOrderModal(rowIndex);

        if (newPrice) {
            await this.modifyOrderPrice(newPrice);
        }

        if (newQuantity) {
            await this.modifyOrderQuantity(newQuantity);
        }

        await this.modifyOrderConfirmButton.click();
        await this.modifyOrderModal.waitFor({ state: 'hidden', timeout: OrderBook.DEFAULT_TIMEOUT });
        await this.page.waitForTimeout(OrderBook.SHORT_TIMEOUT);
    }

    async cancelModifyOrder(): Promise<void> {
        await this.modifyOrderCancelButton.click();
        await this.modifyOrderModal.waitFor({ state: 'hidden', timeout: OrderBook.DEFAULT_TIMEOUT });
        await this.page.waitForTimeout(OrderBook.SHORT_TIMEOUT);
    }

    async modifyOrderByOrderNumber(orderNumber: string, newPrice?: number, newQuantity?: number): Promise<void> {
        const orderIndex = await this.findOrderIndexByOrderNumber(orderNumber);
        if (orderIndex >= 0) {
            await this.modifyOrder(orderIndex, newPrice, newQuantity);
            console.log(`Modified order ${orderNumber} with new price: ${newPrice}, new quantity: ${newQuantity}`);
        } else {
            throw new Error(`Order with number ${orderNumber} not found`);
        }
    }

    async modifyOrderByStockCode(stockCode: string, newPrice?: number, newQuantity?: number): Promise<void> {
        const allOrders = await this.getOrderTableData();
        const orderIndex = allOrders.findIndex(order => order.stockCode.includes(stockCode));

        if (orderIndex >= 0) {
            await this.modifyOrder(orderIndex, newPrice, newQuantity);
            console.log(`Modified order for ${stockCode} with new price: ${newPrice}, new quantity: ${newQuantity}`);
        } else {
            throw new Error(`Order for stock ${stockCode} not found`);
        }
    }

    // =================== CANCEL ALL ORDERS METHODS ===================

    async cancelAllOrders(): Promise<void> {
        await this.selectAllOrders();
        const isChecked = await this.page.locator('.table-bordered.tbl-list thead th:nth-child(1) span .checkbox2__status--checked').isVisible();
        if (isChecked) {
            await this.cancelAllOrderButton.click();
            await this.cancelAllModal.waitFor({ state: 'visible', timeout: OrderBook.DEFAULT_TIMEOUT });
            await this.cancelAllConfirmButton.click();
            await this.cancelAllModal.waitFor({ state: 'hidden', timeout: OrderBook.DEFAULT_TIMEOUT });
            await this.page.waitForTimeout(2000);
        } else {
            console.log('No orders to cancel');
        }
    }

    async closeCancelAllModal(): Promise<void> {
        await this.cancelAllModalCloseButton.click();
        await this.cancelAllModal.waitFor({ state: 'hidden', timeout: 5000 });
    }

    async cancelSelectedOrders(): Promise<void> {
        await this.cancelAllOrderButton.click();
        await this.cancelAllModal.waitFor({ state: 'visible', timeout: OrderBook.DEFAULT_TIMEOUT });
        await this.cancelAllConfirmButton.click();
        await this.cancelAllModal.waitFor({ state: 'hidden', timeout: OrderBook.DEFAULT_TIMEOUT });
        await this.page.waitForTimeout(2000);
    }

    async cancelOrdersBySelection(orderIndexes: number[]): Promise<void> {
        await this.selectOrdersByIndexes(orderIndexes);
        await this.cancelSelectedOrders();
    }

    async getCancelAllModalOrdersData(): Promise<OrderData[]> {
        await this.cancelAllModal.waitFor({ state: 'visible', timeout: OrderBook.DEFAULT_TIMEOUT });
        const modalTable = this.cancelAllModalTable;
        const rows = await modalTable.locator('tbody tr').all();
        const orders: OrderData[] = [];

        for (const row of rows) {
            const cells = await row.locator('td').all();
            if (cells.length > 0) {
                orders.push({
                    account: await cells[0]?.innerText() || '',
                    orderNo: await cells[1]?.innerText() || '',
                    stockCode: await cells[2]?.innerText() || '',
                    side: await cells[3]?.innerText() || '',
                    price: await cells[4]?.innerText() || '',
                    remainingQuantity: await cells[5]?.innerText() || '',
                    // Fill empty fields for consistency
                    originOrderNo: '',
                    time: '',
                    orderType: '',
                    quantity: '',
                    matchedQuantity: '',
                    status: ''
                });
            }
        }
        return orders;
    }

    async openCancelAllModalAndGetData(): Promise<OrderData[]> {
        await this.selectAllOrders();
        await this.cancelAllOrderButton.click();
        return await this.getCancelAllModalOrdersData();
    }

    // =================== SEARCH AND FIND UTILITY METHODS ===================

    private async findOrderIndexByOrderNumber(orderNumber: string): Promise<number> {
        const allOrders = await this.getOrderTableData();
        return allOrders.findIndex(order => order.orderNo === orderNumber);
    }

    async getOrderByOrderNumber(orderNumber: string): Promise<OrderData | null> {
        const orders = await this.getOrderTableData();
        return orders.find(order => order.orderNo === orderNumber) || null;
    }

    async getOrdersByStatus(status: string): Promise<OrderData[]> {
        const orders = await this.getOrderTableData();
        return orders.filter(order => order.status.includes(status));
    }

    async getOrdersByStockCode(stockCode: string): Promise<OrderData[]> {
        const orders = await this.getOrderTableData();
        return orders.filter(order => order.stockCode.includes(stockCode));
    }

    async getAllOrderStatuses(): Promise<string[]> {
        const orders = await this.getOrderTableData();
        const statuses = orders.map(order => order.status);
        return [...new Set(statuses)];
    }

    async getAllStockCodes(): Promise<string[]> {
        const orders = await this.getOrderTableData();
        const stockCodes = orders.map(order => order.stockCode);
        return [...new Set(stockCodes)];
    }

    // =================== VERIFICATION METHODS ===================

    async verifyOrderExists(stockCode: string): Promise<boolean> {
        const orders = await this.getOrderTableData();
        return orders.some(order => order.stockCode.includes(stockCode));
    }

    async verifyOrderStatus(stockCode: string, expectedStatus: string): Promise<boolean> {
        const orders = await this.getOrderTableData();
        const order = orders.find(order => order.stockCode.includes(stockCode));
        return order ? order.status.includes(expectedStatus) : false;
    }

    async verifyTableHasData(): Promise<boolean> {
        const count = await this.getOrderCount();
        return count > 0;
    }

    async verifyNoDataMessage(): Promise<boolean> {
        const noDataMessage = this.page.locator('table.table-bordered.tbl-list + p');
        const message = await noDataMessage.textContent();
        return message?.includes('Không có dữ liệu') ?? false;
    }

    async verifyOrderModified(stockCode: string, expectedPrice?: string, expectedQuantity?: string): Promise<boolean> {
        await this.page.waitForTimeout(2000);
        const orders = await this.getOrderTableData();
        const modifiedOrder = orders.find(order => order.stockCode.includes(stockCode));

        if (!modifiedOrder) return false;

        let priceMatch = true;
        let quantityMatch = true;

        if (expectedPrice) {
            priceMatch = modifiedOrder.price.includes(expectedPrice);
        }

        if (expectedQuantity) {
            quantityMatch = modifiedOrder.quantity.includes(expectedQuantity);
        }

        return priceMatch && quantityMatch;
    }

    async verifySearchFunctionality(searchTerm: string): Promise<SearchVerificationResult> {
        const originalCount = await this.getOrderCount();

        await this.searchOrder(searchTerm);
        await this.page.waitForTimeout(OrderBook.SHORT_TIMEOUT);

        const filteredCount = await this.getOrderCount();

        // Clear search
        await this.searchOrder('');
        await this.page.waitForTimeout(OrderBook.SHORT_TIMEOUT);

        const clearedCount = await this.getOrderCount();

        return {
            success: clearedCount === originalCount,
            filteredCount,
            originalCount
        };
    }

    // =================== STATUS AND INFORMATION METHODS ===================

    async hasActionButtons(rowIndex: number): Promise<ActionButtonsAvailability> {
        try {
            const hasCancel = await this.cancelOrderButton(rowIndex).isVisible({ timeout: OrderBook.SHORT_TIMEOUT });
            const hasModify = await this.modifyOrderButton(rowIndex).isVisible({ timeout: OrderBook.SHORT_TIMEOUT });
            return { hasCancel, hasModify };
        } catch {
            return { hasCancel: false, hasModify: false };
        }
    }

    async isOrderBookVisible(): Promise<boolean> {
        try {
            return await this.orderIndayTab.isVisible({ timeout: OrderBook.SHORT_TIMEOUT });
        } catch {
            return false;
        }
    }

    async isTabActive(tabName: TabName): Promise<boolean> {
        const tabMap = {
            inday: this.orderIndayTab,
            history: this.orderHistoryTab,
            conditional: this.conditionalOrderTab,
            putthrough: this.putThroughOrderTab
        };

        try {
            const classes = await tabMap[tabName].getAttribute('class');
            return classes?.includes('active') || classes?.includes('selected') || false;
        } catch {
            return false;
        }
    }

    async checkAvailableFilters(): Promise<AvailableFilters> {
        try {
            const statusAvailable = await this.statusSelect.isVisible({ timeout: 2000 });
            const accountAvailable = await this.accountSelect.isVisible({ timeout: 2000 });
            const orderTypeAvailable = await this.orderTypeSelect.isVisible({ timeout: 2000 });

            return {
                status: statusAvailable,
                account: accountAvailable,
                orderType: orderTypeAvailable
            };
        } catch {
            return {
                status: false,
                account: false,
                orderType: false
            };
        }
    }

    async hasPagination(): Promise<boolean> {
        try {
            const paginationElement = this.page.locator('.pagination, .page-navigation, .pager');
            return await paginationElement.isVisible({ timeout: 3000 });
        } catch {
            return false;
        }
    }

    // =================== UTILITY AND WAIT METHODS ===================

    async waitForOrderBookToLoad(timeout: number = OrderBook.DEFAULT_TIMEOUT): Promise<void> {
        await this.orderTable.waitFor({ state: 'visible', timeout });
        await this.page.waitForTimeout(OrderBook.SHORT_TIMEOUT);
    }

    async waitForOrderCount(expectedCount: number, timeout: number = OrderBook.DEFAULT_TIMEOUT): Promise<boolean> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            try {
                const currentCount = await this.getOrderCount();
                if (currentCount === expectedCount) {
                    return true;
                }
                await this.page.waitForTimeout(OrderBook.POLLING_INTERVAL);
            } catch {
                await this.page.waitForTimeout(OrderBook.POLLING_INTERVAL);
            }
        }
        return false;
    }

    // =================== VALIDATION AND STRUCTURE METHODS ===================

    async validateTableStructure(): Promise<TableStructureValidation> {
        try {
            const headers = await this.tableHeaders.count();
            const rows = await this.tableRows.count();

            return {
                hasHeaders: headers > 0,
                hasRows: rows > 0,
                columnCount: headers
            };
        } catch {
            return {
                hasHeaders: false,
                hasRows: false,
                columnCount: 0
            };
        }
    }

    async validateOrderDataConsistency(): Promise<DataValidationResult> {
        const errors: string[] = [];

        try {
            const orders = await this.getOrderTableData();

            orders.forEach((order, index) => {
                // Check required fields
                if (!order.stockCode || order.stockCode.trim() === '') {
                    errors.push(`Order ${index}: Missing stock code`);
                }

                if (!order.status || order.status.trim() === '') {
                    errors.push(`Order ${index}: Missing status`);
                }

                if (!order.time || order.time.trim() === '') {
                    errors.push(`Order ${index}: Missing time`);
                }

                // Validate quantity is numeric (if present)
                if (order.quantity) {
                    const qty = parseFloat(order.quantity.replace(/[,\s]/g, ''));
                    if (isNaN(qty) || qty <= 0) {
                        errors.push(`Order ${index}: Invalid quantity: ${order.quantity}`);
                    }
                }

                // Validate price is numeric (if present and not market order)
                if (order.price && !order.price.includes('MP') && !order.price.includes('ATO') && !order.price.includes('ATC')) {
                    const price = parseFloat(order.price.replace(/[,\s]/g, ''));
                    if (isNaN(price) || price <= 0) {
                        errors.push(`Order ${index}: Invalid price: ${order.price}`);
                    }
                }
            });
        } catch (error) {
            errors.push(`Failed to validate data: ${error}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // =================== ANALYTICS AND PERFORMANCE METHODS ===================

    async getOrderSummaryStats(): Promise<OrderSummaryStats> {
        const orders = await this.getOrderTableData();
        const stockCodes = new Set(orders.map(o => o.stockCode));
        const statuses = new Set(orders.map(o => o.status));

        // Calculate average quantity (if numeric)
        let avgQuantity: number | undefined;
        const quantities = orders
            .map(o => parseFloat(o.quantity.replace(/[,\s]/g, '')))
            .filter(q => !isNaN(q));

        if (quantities.length > 0) {
            avgQuantity = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
        }

        // Check if any orders have matches
        const hasMatches = orders.some(o =>
            o.matchedQuantity &&
            parseFloat(o.matchedQuantity.replace(/[,\s]/g, '')) > 0
        );

        return {
            totalOrders: orders.length,
            uniqueStocks: stockCodes.size,
            uniqueStatuses: statuses.size,
            avgOrderQuantity: avgQuantity,
            hasMatches
        };
    }

    async measureOrderLoadTime(): Promise<number> {
        const startTime = Date.now();
        await this.waitForOrderBookToLoad();
        const endTime = Date.now();
        return endTime - startTime;
    }

    async getPerformanceMetrics(): Promise<PerformanceMetrics> {
        // Measure order loading time
        const orderLoadTime = await this.measureOrderLoadTime();

        // Measure table render time
        const tableRenderStart = Date.now();
        await this.orderTable.waitFor({ state: 'visible' });
        const tableRenderTime = Date.now() - tableRenderStart;

        // Measure search response time
        const searchStart = Date.now();
        await this.searchOrder('TEST');
        await this.page.waitForTimeout(OrderBook.POLLING_INTERVAL);
        await this.searchOrder(''); // Clear search
        const searchResponseTime = Date.now() - searchStart;

        return {
            orderLoadTime,
            tableRenderTime,
            searchResponseTime
        };
    }

    // =================== COMPREHENSIVE HEALTH CHECK ===================

    async performHealthCheck(): Promise<HealthCheckResult> {
        const issues: string[] = [];
        const checks = {
            tableStructure: false,
            dataIntegrity: false,
            filtersWorking: false,
            searchWorking: false,
            tabsWorking: false
        };

        try {
            // Check table structure
            const tableStructure = await this.validateTableStructure();
            checks.tableStructure = tableStructure.hasHeaders && tableStructure.columnCount > 5;
            if (!checks.tableStructure) {
                issues.push('Table structure invalid');
            }

            // Check data integrity
            const dataValidation = await this.validateOrderDataConsistency();
            checks.dataIntegrity = dataValidation.isValid;
            if (!checks.dataIntegrity) {
                issues.push(...dataValidation.errors);
            }

            // Check filters
            const availableFilters = await this.checkAvailableFilters();
            checks.filtersWorking = Object.values(availableFilters).some(f => f);
            if (!checks.filtersWorking) {
                issues.push('No filters available');
            }

            // Check search
            try {
                await this.verifySearchFunctionality('TEST');
                checks.searchWorking = true;
            } catch {
                checks.searchWorking = false;
                issues.push('Search functionality not working');
            }

            // Check tabs
            try {
                await this.switchToOrderHistoryTab();
                await this.switchToOrderInDayTab();
                checks.tabsWorking = true;
            } catch {
                checks.tabsWorking = false;
                issues.push('Tab switching not working');
            }

        } catch (error) {
            issues.push(`Health check failed: ${error}`);
        }

        const healthyChecks = Object.values(checks).filter(c => c).length;
        const totalChecks = Object.values(checks).length;

        let overall: 'healthy' | 'warning' | 'error';
        if (healthyChecks === totalChecks) {
            overall = 'healthy';
        } else if (healthyChecks >= totalChecks * 0.6) {
            overall = 'warning';
        } else {
            overall = 'error';
        }

        return {
            overall,
            checks,
            issues
        };
    }
}

export default OrderBook;