import { Page, Locator, expect } from '@playwright/test';
import BasePage from './BasePage';
import { getRandomStockCode } from '../../tests/utils/testConfig';
import MatrixPage from './MatrixPage';
import OrderBook from './OrderBook';
import PortfolioPage from './PorfolioPage';
import { FormUtils, TableUtils, CommonSelectors } from '../../helpers/uiUtils';

// Interface definitions for better type safety
interface OrderFormData {
    stockCode: string;
    quantity: number;
    price?: number | string;
    side: 'buy' | 'sell';
}

interface OrderPageElements {
    navigation: {
        orderButton: Locator;
        normalTab: Locator;
        conditionalTab: Locator;
        oddTab: Locator;
    };
    form: {
        stock: Locator;
        buyTab: Locator;
        sellTab: Locator;
        stockCodeInput: Locator;
        quantityInput: Locator;
        priceInput: Locator;
        priceCeil: Locator;
        priceFloor: Locator;
        priceReference: Locator;
        ATO: Locator;
        ATC: Locator;
        MTL: Locator;
        PLO: Locator;
        MOK: Locator;
        MAK: Locator;
        placeOrderButton: Locator;
        confirmOrderButton: Locator;
        reloadPurchasePower: Locator;
        closeOrderButton: Locator
    };
    orderBook: {
        orderIndayTab: Locator;
        assetTab: Locator;
        toggleWaitingMatch: Locator;
        cancelOrderButton: Locator;
        modifyOrderButton: Locator;
        switchQtyColumn: Locator;
        dropdownQty: Locator;
    };
    messages: {
        toastMessage: Locator;
        titleMessage: Locator;
        descriptionMessage: Locator;
        closeToastMessage: Locator;
    };
}

interface ConditionalOrderFormData {
    navigationConditional: 'outTime' | 'trend' | 'takeProfit' | 'stopLoss' | 'purchase';
    stockCodeConditional: string;
    quantityConditional: number;
    sideConditional: 'buy' | 'sell';
    triggerPrice: number | string;
    orderPrice: number | string;
    pauseValue: number | string;
    differenceTP: number | string;
    differenceBQ: number | string;
    lowestPrice: number | string;
}

interface ConditionalOrderPageElements {
    navigationConditional: {
        outTimeTab: Locator;
        trendTab: Locator;
        takeProfitTab: Locator;
        stopLossTab: Locator;
        purchaseTab: Locator;
    };
    formConditional: {
        stockCodeConditionalInput: Locator;
        quantityConditionalInput: Locator;
        buyTabConditional: Locator;
        sellTabConditional: Locator;
        triggerPriceInput: Locator;
        orderPriceInput: Locator;
        pauseValueInput: Locator;
        differenceTPInput: Locator;
        differenceBQInput: Locator;
        lowestPriceInput: Locator;
        cancelConditionalButton: Locator;
        placeConditionalButton: Locator;
        priceCeilConditional: Locator;
        priceFloorConditional: Locator;
        priceReferenceConditional: Locator;
    };
    messagesConditional: {
        toastMessageConditional: Locator;
        titleMessageConditional: Locator;
        descriptionMessageConditional: Locator;
        closeToastMessageConditional: Locator;
    };
}

class OrderPage extends BasePage {
    // Dependencies
    matrixPage: MatrixPage;
    orderBook: OrderBook;
    portfolioPage: PortfolioPage;

    // Constants
    private static readonly DEFAULT_QUANTITY = 1;
    private static readonly NAVIGATION_TIMEOUT = 3000;
    private static readonly MATRIX_TIMEOUT = 5000;
    private static readonly MESSAGE_TIMEOUT = 3000;

    // Element groups for better organization
    private elements!: OrderPageElements;
    private conditionalElements!: ConditionalOrderPageElements;

    constructor(page: Page) {
        super(page);
        this.matrixPage = new MatrixPage(page);
        this.orderBook = new OrderBook(page);
        this.portfolioPage = new PortfolioPage(page);
        this.initializeElements(page);
        this.initializeConditionalElements(page);
    }

    /**
     * Initialize all page elements in organized structure
     */
    private initializeElements(page: Page): void {
        this.elements = {
            navigation: {
                orderButton: page.locator('.footer-btn:has(.iOrder)'),
                normalTab: page.locator('.card-panel .order .card-panel-header__left span:nth-child(1)'),
                conditionalTab: page.locator('.card-panel .order .card-panel-header__left span:nth-child(2)'),
                oddTab: page.locator('.card-panel .order .card-panel-header__left span:nth-child(3)'),
            },
            form: {
                stock: page.locator('.symbol-information > .text-title'),
                buyTab: page.locator('.order-button.order-buy'),
                sellTab: page.locator('.order-button.order-sell'),
                stockCodeInput: page.getByPlaceholder('Mã CK', { exact: true }),
                priceInput: page.getByPlaceholder('Giá x1000'),
                quantityInput: page.getByPlaceholder('KL x1'),
                priceCeil: page.locator('span.cursor-pointer.c').first(),
                priceFloor: page.locator('span.cursor-pointer.f').first(),
                priceReference: page.locator('span.cursor-pointer.r').first(),
                ATO: page.locator('.btn.btn-info', { hasText: 'ATO' }),
                ATC: page.locator('.btn.btn-info', { hasText: 'ATC' }),
                MTL: page.locator('.btn.btn-info', { hasText: 'MTL' }),
                PLO: page.locator('.btn.btn-info', { hasText: 'PLO' }),
                MOK: page.locator('.btn.btn-info', { hasText: 'MOK' }),
                MAK: page.locator('.btn.btn-info', { hasText: 'MAK' }),
                placeOrderButton: page.getByRole('button', { name: 'Đặt lệnh' }),
                confirmOrderButton: page.getByRole('button', { name: 'Xác nhận' }),
                reloadPurchasePower: page.locator('.reset-order .iRefresh.icon'),
                closeOrderButton: page.locator('.card-panel.order .icon.iClose')
            },
            orderBook: {
                orderIndayTab: page.locator('.asset-panel .card-panel-header__title:nth-child(1)'),
                assetTab: page.locator('.asset-panel .card-panel-header__title:nth-child(2)'),
                toggleWaitingMatch: page.locator('.asset-panel .custom-checkbox'),
                cancelOrderButton: page.locator('td:nth-child(14) > div > span:nth-child(2) > .icon').first(),
                modifyOrderButton: page.locator('td:nth-child(14) > div > span:nth-child(2) > .icon').nth(1),
                switchQtyColumn: page.locator('.asset-panel .icon.i3Dots'),
                dropdownQty: page.locator('.header-dropdown__items')
            },
            messages: {
                toastMessage: page.locator('.notification.toast.top-right'),
                titleMessage: page.locator('.toast-content .toast-title'),
                descriptionMessage: page.locator('.toast-content .toast-description'),
                closeToastMessage: page.locator('.toast-action .icon.iClose')
            }
        };

        // Create legacy property references for backward compatibility
        this.createLegacyReferences();
    }

    private initializeConditionalElements(page: Page): void {
        this.conditionalElements = {
            navigationConditional: {
                outTimeTab: page.locator('a[data-rb-event-key="lenhngoaigio"]'),
                trendTab: page.locator('a[data-rb-event-key="lenhxuhuong"]'),
                takeProfitTab: page.locator('a[data-rb-event-key="lenhchotloi"]'),
                stopLossTab: page.locator('a[data-rb-event-key="lenhcatlo"]'),
                purchaseTab: page.locator('a[data-rb-event-key="dualenh"]'),
            },

            formConditional: {
                stockCodeConditionalInput: page.locator('input[name="orderSymbol"]'),
                quantityConditionalInput: page.locator('input[name="orderVolume"]'),
                buyTabConditional: page.locator('.btn-type-trade.text-uppercase.buy'),
                sellTabConditional: page.locator('.btn-type-trade.text-uppercase.sell'),
                triggerPriceInput: page.locator('input[name="refPrice"]'),
                orderPriceInput: page.locator('input[name="orderPrice"]'),
                pauseValueInput: page.locator('input[name="dungTheoGiaTri"]'),
                differenceTPInput: page.locator('input[name="giaChenhTp"]'),
                lowestPriceInput: page.locator('input[name="giaMuaThapNhat"]'),
                differenceBQInput: page.locator('input[name="chenhGiaBQ"]'),
                cancelConditionalButton: page.getByRole('button', { name: 'Huỷ' }),
                placeConditionalButton: page.locator('button[type="submit"]'),
                priceCeilConditional: page.locator('.card div.d-flex span.c'),
                priceFloorConditional: page.locator('.card div.d-flex span.f'),
                priceReferenceConditional: page.locator('.card div.d-flex span.r'),
            },
            messagesConditional: {
                toastMessageConditional: page.locator('.notification.toast.top-right'),
                titleMessageConditional: page.locator('.toast-content .toast-title'),
                descriptionMessageConditional: page.locator('.toast-content .toast-description'),
                closeToastMessageConditional: page.locator('.toast-action .icon.iClose')
            }
        };

        // Create legacy property references for backward compatibility
        this.createConditionalLegacyReferences();
    }
    /**
     * Create legacy property references for backward compatibility
     */
    private createLegacyReferences(): void {
        // Navigation
        this.orderButton = this.elements.navigation.orderButton;
        this.normalTab = this.elements.navigation.normalTab;
        this.conditionalTab = this.elements.navigation.conditionalTab;
        this.oddTab = this.elements.navigation.oddTab;

        // Order Form
        this.stock = this.elements.form.stock;
        this.buyTab = this.elements.form.buyTab;
        this.sellTab = this.elements.form.sellTab;
        this.stockCodeInput = this.elements.form.stockCodeInput;
        this.quantityInput = this.elements.form.quantityInput;
        this.priceInput = this.elements.form.priceInput;
        this.priceCeil = this.elements.form.priceCeil;
        this.priceFloor = this.elements.form.priceFloor;
        this.priceReference = this.elements.form.priceReference;
        this.ATO = this.elements.form.ATO;
        this.ATC = this.elements.form.ATC;
        this.MTL = this.elements.form.MTL;
        this.PLO = this.elements.form.PLO;
        this.MOK = this.elements.form.MOK;
        this.MAK = this.elements.form.MAK;
        this.placeOrderButton = this.elements.form.placeOrderButton;
        this.confirmOrderButton = this.elements.form.confirmOrderButton;
        this.reloadPurchasePower = this.elements.form.reloadPurchasePower;
        this.closeOrderButton = this.elements.form.closeOrderButton;

        // Order Book
        this.orderIndayTab = this.elements.orderBook.orderIndayTab;
        this.assetTab = this.elements.orderBook.assetTab;
        this.toggleWaitingMatch = this.elements.orderBook.toggleWaitingMatch;
        this.cancelOrderButton = this.elements.orderBook.cancelOrderButton;
        this.modifyOrderButton = this.elements.orderBook.modifyOrderButton;
        this.switchQtyColumn = this.elements.orderBook.switchQtyColumn;
        this.dropdownQty = this.elements.orderBook.dropdownQty;

        // Messages
        this.toastMessage = this.elements.messages.toastMessage;
        this.titleMessage = this.elements.messages.titleMessage;
        this.descriptionMessage = this.elements.messages.descriptionMessage;
        this.closeToastMessage = this.elements.messages.closeToastMessage;
    }

    private createConditionalLegacyReferences(): void {
        // Navigation
        this.outTimeTab = this.conditionalElements.navigationConditional.outTimeTab;
        this.trendTab = this.conditionalElements.navigationConditional.trendTab;
        this.takeProfitTab = this.conditionalElements.navigationConditional.takeProfitTab;
        this.stopLossTab = this.conditionalElements.navigationConditional.stopLossTab;
        this.purchaseTab = this.conditionalElements.navigationConditional.purchaseTab;

        // Form
        this.stockCodeConditionalInput = this.conditionalElements.formConditional.stockCodeConditionalInput;
        this.quantityConditionalInput = this.conditionalElements.formConditional.quantityConditionalInput;
        this.buyTabConditional = this.conditionalElements.formConditional.buyTabConditional;
        this.sellTabConditional = this.conditionalElements.formConditional.sellTabConditional;
        this.triggerPriceInput = this.conditionalElements.formConditional.triggerPriceInput;
        this.orderPriceInput = this.conditionalElements.formConditional.orderPriceInput;
        this.pauseValueInput = this.conditionalElements.formConditional.pauseValueInput;
        this.differenceTPInput = this.conditionalElements.formConditional.differenceTPInput;
        this.differenceBQInput = this.conditionalElements.formConditional.differenceBQInput;
        this.lowestPriceInput = this.conditionalElements.formConditional.lowestPriceInput;
        this.cancelConditionalButton = this.conditionalElements.formConditional.cancelConditionalButton;
        this.placeConditionalButton = this.conditionalElements.formConditional.placeConditionalButton;
        this.priceCeilConditional = this.conditionalElements.formConditional.priceCeilConditional;
        this.priceFloorConditional = this.conditionalElements.formConditional.priceFloorConditional;
        this.priceReferenceConditional = this.conditionalElements.formConditional.priceReferenceConditional;

        // Messages
        this.toastMessageConditional = this.conditionalElements.messagesConditional.toastMessageConditional;
        this.titleMessageConditional = this.conditionalElements.messagesConditional.titleMessageConditional;
        this.descriptionMessageConditional = this.conditionalElements.messagesConditional.descriptionMessageConditional;
        this.closeToastMessageConditional = this.conditionalElements.messagesConditional.closeToastMessageConditional;
    }

    // Legacy property declarations for backward compatibility
    orderButton!: Locator;
    normalTab!: Locator;
    conditionalTab!: Locator;
    oddTab!: Locator;

    stock!: Locator;
    buyTab!: Locator;
    sellTab!: Locator;
    stockCodeInput!: Locator;
    quantityInput!: Locator;
    priceInput!: Locator;
    priceCeil!: Locator;
    priceFloor!: Locator;
    priceReference!: Locator;
    ATO!: Locator;
    ATC!: Locator;
    MTL!: Locator;
    PLO!: Locator;
    MOK!: Locator;
    MAK!: Locator;
    placeOrderButton!: Locator;
    confirmOrderButton!: Locator;
    reloadPurchasePower!: Locator;
    closeOrderButton!: Locator;
    orderIndayTab!: Locator;
    assetTab!: Locator;
    toggleWaitingMatch!: Locator;
    cancelOrderButton!: Locator;
    modifyOrderButton!: Locator;
    switchQtyColumn!: Locator;
    dropdownQty!: Locator;

    toastMessage!: Locator;
    titleMessage!: Locator;
    descriptionMessage!: Locator;
    closeToastMessage!: Locator;

    outTimeTab!: Locator;
    trendTab!: Locator;
    takeProfitTab!: Locator;
    stopLossTab!: Locator;
    purchaseTab!: Locator;

    stockCodeConditionalInput!: Locator;
    quantityConditionalInput!: Locator;
    buyTabConditional!: Locator;
    sellTabConditional!: Locator;
    triggerPriceInput!: Locator;
    orderPriceInput!: Locator;
    pauseValueInput!: Locator;
    differenceTPInput!: Locator;
    differenceBQInput!: Locator;
    lowestPriceInput!: Locator;
    cancelConditionalButton!: Locator;
    placeConditionalButton!: Locator;
    priceCeilConditional!: Locator;
    priceFloorConditional!: Locator;
    priceReferenceConditional!: Locator;

    toastMessageConditional!: Locator;
    titleMessageConditional!: Locator;
    descriptionMessageConditional!: Locator;
    closeToastMessageConditional!: Locator;

    // =================== NAVIGATION METHODS ===================

    /**
     * Navigate to order page and handle matrix if needed
     */
    async navigateToOrder(): Promise<void> {
        try {
            await this.orderButton.click();
            await this.page.waitForTimeout(OrderPage.NAVIGATION_TIMEOUT);

            if (await this.matrixPage.isMatrixVisible()) {
                await this.matrixPage.enterMatrixValid();
            }

            await this.page.waitForTimeout(OrderPage.MATRIX_TIMEOUT);
        } catch (error) {
            throw new Error(`Failed to navigate to order page: ${error}`);
        }
    }

    async switchToNormalTab(): Promise<void> {
        await this.normalTab.click();
    }

    async switchToConditionalTab(): Promise<void> {
        await this.conditionalTab.click();
    }

    async switchToOddTab(): Promise<void> {
        await this.oddTab.click();
    }

    // Conditional Navigation
    async switchConditionalTab(tabName: ConditionalOrderFormData['navigationConditional']): Promise<void> {
        const tabMap = {
            outTime: this.outTimeTab,
            trend: this.trendTab,
            takeProfit: this.takeProfitTab,
            stopLoss: this.stopLossTab,
            purchase: this.purchaseTab
        };
        await tabMap[tabName].click();
    }


    // =================== ORDER FORM METHODS ===================

    /**
     * Fill stock code in the form
     */
    async fillStockCode(stockCode?: string): Promise<string> {
        const code = stockCode || getRandomStockCode();
        try {
            await FormUtils.fillField(this.stockCodeInput, code);
            return code;
        } catch (error) {
            throw new Error(`Failed to fill stock code: ${error}`);
        }
    }

    /**
     * Fill quantity in the form
     */
    async fillQuantity(quantity: number): Promise<void> {
        try {
            await FormUtils.fillField(this.quantityInput, quantity);
        } catch (error) {
            throw new Error(`Failed to fill quantity: ${error}`);
        }
    }

    /**
     * Select price option (floor, ceil, or reference)
     */
    async selectPriceOption(priceType: 'floor' | 'ceil' | 'reference'): Promise<void> {
        try {
            const priceElements = {
                floor: this.priceFloor,
                ceil: this.priceCeil,
                reference: this.priceReference
            };

            const selectedElement = priceElements[priceType];

            await expect(selectedElement).toBeVisible();
            await selectedElement.dblclick();
        } catch (error) {
            throw new Error(`Failed to select ${priceType} price: ${error}`);
        }
    }

    async selectMarketPrice(priceType: 'ATO' | 'ATC' | 'MTL' | 'PLO' | 'MOK' | 'MAK'): Promise<void> {
        try {
            const priceElements = {
                ATO: this.ATO,
                ATC: this.ATC,
                MTL: this.MTL,
                PLO: this.PLO,
                MOK: this.MOK,
                MAK: this.MAK
            };

            const selectedElement = priceElements[priceType];
            await this.priceInput.focus();

            await expect(selectedElement).toBeVisible();
            await selectedElement.click();
        } catch (error) {
            throw new Error(`Failed to select market price: ${error}`);
        }
    }
    /**
     * Set custom price
     */
    async setCustomPrice(price: number | string): Promise<void> {
        try {
            await FormUtils.fillField(this.priceInput, price);
        } catch (error) {
            throw new Error(`Failed to set custom price: ${error}`);
        }
    }

    /**
     * Submit order form
     */
    async submitOrder(): Promise<void> {
        try {
            await this.placeOrderButton.click();
            await this.confirmOrderButton.click();
        } catch (error) {
            throw new Error(`Failed to submit order: ${error}`);
        }
    }

    // =================== CONDITIONAL ORDER FORM METHODS ===================
    async fillStockCodeConditional(stockCode?: string): Promise<string> {
        const code = stockCode || getRandomStockCode();
        try {
            await FormUtils.fillField(this.stockCodeConditionalInput, code);
            return code;
        } catch (error) {
            throw new Error(`Failed to fill stock code: ${error}`);
        }
    }
    async fillQuantityConditional(quantity: number = 100): Promise<void> {
        try {
            await FormUtils.fillField(this.quantityConditionalInput, quantity);
        } catch (error) {
            throw new Error(`Failed to fill quantity: ${error}`);
        }
    }

    async fillOrderPriceConditional(price: number | string): Promise<void> {
        try {
            await FormUtils.fillField(this.orderPriceInput, price);
        } catch (error) {
            throw new Error(`Failed to set custom price: ${error}`);
        }
    }

    async selectPriceOptionConditional(priceType: 'floor' | 'ceil' | 'reference'): Promise<void> {
        try {
            const priceElements = {
                floor: this.priceFloorConditional,
                ceil: this.priceCeilConditional,
                reference: this.priceReferenceConditional
            };
            const selectedElement = priceElements[priceType];
            await expect(selectedElement).toBeVisible();
            const price = (await selectedElement.textContent())?.trim() || "0";
            await this.fillOrderPriceConditional(price);
        } catch (error) {
            throw new Error(`Failed to select ${priceType} price: ${error}`);
        }
    }

    async fillTriggerPriceConditional(price: number | string): Promise<void> {
        try {
            await FormUtils.fillField(this.triggerPriceInput, price);
        } catch (error) {
            throw new Error(`Failed to fill trigger price: ${error}`);
        }
    }

    async fillPauseValueConditional(value: number | string = 1): Promise<void> {
        try {
            await FormUtils.fillField(this.pauseValueInput, value);
        } catch (error) {
            throw new Error(`Failed to fill pause value: ${error}`);
        }
    }

    async fillDifferenceTPConditional(value: number | string = 1000): Promise<void> {
        try {
            await FormUtils.fillField(this.differenceTPInput, value);
        } catch (error) {
            throw new Error(`Failed to fill difference TP: ${error}`);
        }
    }
    async fillDifferenceBQConditional(value: number | string = 1000): Promise<void> {
        try {
            await FormUtils.fillField(this.differenceBQInput, value);
        } catch (error) {
            throw new Error(`Failed to fill difference BQ: ${error}`);
        }
    }

    async fillLowestPriceConditional(value?: number | string): Promise<void> {
        try {
            if (!value) {
                value = await this.priceFloorConditional.textContent() || 0;
            }
            await FormUtils.fillField(this.lowestPriceInput, value);
        } catch (error) {
            throw new Error(`Failed to fill lowest price: ${error}`);
        }
    }

    // =================== ORDER PLACEMENT METHODS ===================

    /**
     * Place a buy order with enhanced error handling
     */
    async placeBuyOrder(orderData?: Partial<OrderFormData>): Promise<string> {
        const {
            stockCode,
            quantity = OrderPage.DEFAULT_QUANTITY
        } = orderData || {};

        try {
            await this.buyTab.click();
            // Fill stock code
            const usedStockCode = await this.fillStockCode(stockCode);

            // Select price (default to floor for buy orders)
            await this.selectPriceOption('floor');

            // Fill quantity
            await this.fillQuantity(quantity);

            // Submit order
            await this.submitOrder();

            return usedStockCode;
        } catch (error) {
            throw new Error(`Failed to place buy order: ${error}`);
        }
    }

    /**
     * Place a sell order with enhanced error handling
     */
    async placeSellOrder(orderData?: Partial<OrderFormData>): Promise<string> {
        const {
            stockCode,
            quantity = OrderPage.DEFAULT_QUANTITY
        } = orderData || {};

        try {
            await this.sellTab.click();
            // Fill stock code
            const usedStockCode = await this.fillStockCode(stockCode);

            // Select price (default to ceil for sell orders)
            await this.selectPriceOption('ceil');

            // Fill quantity
            await this.fillQuantity(quantity);

            // Submit order
            await this.submitOrder();

            return usedStockCode;
        } catch (error) {
            throw new Error(`Failed to place sell order: ${error}`);
        }
    }

    async placeSellOrderFromPorfolio(orderData?: Partial<OrderFormData>): Promise<string> {
        const {
            quantity = OrderPage.DEFAULT_QUANTITY
        } = orderData || {};
        await this.sellTab.click();

        await this.portfolioPage.navigateToPortfolio();
        await this.portfolioPage.clickPorfolioRowByQuantity(quantity);

        const usedStockCode = await this.stock.textContent();
        await this.selectPriceOption('ceil');
        await this.fillQuantity(quantity);
        await this.submitOrder();

        return usedStockCode || '';
    }

    /**
     * Place order with custom price
     */
    async placeOrderWithCustomPrice(orderData: OrderFormData): Promise<string> {
        const { stockCode, quantity, price, side } = orderData;

        if (!price) {
            throw new Error('Custom price is required for this method');
        }

        try {
            if (side === 'buy') {
                await this.buyTab.click();
            } else {
                await this.sellTab.click();
            }

            // Fill stock code
            const usedStockCode = await this.fillStockCode(stockCode);

            // Set custom price
            await this.setCustomPrice(price);

            // Fill quantity
            await this.fillQuantity(quantity);

            // Submit order
            await this.submitOrder();

            return usedStockCode;
        } catch (error) {
            throw new Error(`Failed to place order with custom price: ${error}`);
        }
    }

    /**
     * Place market order (using reference price)
     */
    async placeMarketOrder(orderData?: Partial<OrderFormData>): Promise<string> {
        const {
            stockCode,
            quantity = OrderPage.DEFAULT_QUANTITY,
            price,
            side
        } = orderData || {};

        try {
            if (side === 'buy') {
                await this.buyTab.click();
            } else {
                await this.sellTab.click();
            }

            // Fill stock code
            const usedStockCode = await this.fillStockCode(stockCode);
            const priceType = price as 'ATO' | 'ATC' | 'MTL' | 'PLO' | 'MOK' | 'MAK';

            // Select reference price for market order
            await this.selectMarketPrice(priceType);

            // Fill quantity
            await this.fillQuantity(quantity);

            // Submit order
            await this.submitOrder();

            return usedStockCode;
        } catch (error) {
            throw new Error(`Failed to place market order: ${error}`);
        }
    }

    async placeOutTimeOrder(orderData?: Partial<ConditionalOrderFormData>): Promise<string> {
        const {
            stockCodeConditional,
            quantityConditional,
            sideConditional
        } = orderData || {};

        try {
            if (sideConditional === 'buy') {
                await this.buyTabConditional.click();
            } else {
                await this.sellTabConditional.click();
            }
            await this.switchConditionalTab('outTime');
            await this.fillStockCodeConditional(stockCodeConditional);
            await this.fillQuantityConditional(quantityConditional);
            if (sideConditional === 'buy') {
                await this.selectPriceOptionConditional('floor');
            } else {
                await this.selectPriceOptionConditional('ceil');
            }
            await this.placeConditionalButton.click();
            return stockCodeConditional || '';
        } catch (error) {
            throw new Error(`Failed to place out time order: ${error}`);
        }
    }

    async placeTrendOrder(orderData?: Partial<ConditionalOrderFormData>): Promise<string> {
        const {
            stockCodeConditional,
            quantityConditional,
            pauseValue,
            sideConditional,
            differenceTP,
            lowestPrice
        } = orderData || {};
        try {
            if (sideConditional === 'buy') {
                await this.buyTabConditional.click();
            } else {
                await this.sellTabConditional.click();
            }
            await this.switchConditionalTab('trend');
            await this.fillStockCodeConditional(stockCodeConditional);
            await this.fillQuantityConditional(quantityConditional);
            await this.fillPauseValueConditional(pauseValue!);
            await this.fillDifferenceTPConditional(differenceTP!);
            if (lowestPrice) {
                await this.fillLowestPriceConditional(lowestPrice);
            } else {
                await this.fillLowestPriceConditional();
            }
            await this.placeConditionalButton.click();
            return stockCodeConditional || '';
        } catch (error) {
            throw new Error(`Failed to place trend order: ${error}`);
        }
    }

    async placeTakeProfitOrder(orderData?: Partial<ConditionalOrderFormData>): Promise<string> {
        const {
            stockCodeConditional,
            quantityConditional,
            differenceBQ,
            sideConditional = 'sell',
        } = orderData || {};
        try {
            await this.switchConditionalTab('takeProfit');
            await this.fillQuantityConditional(quantityConditional);
            await this.fillDifferenceBQConditional(differenceBQ!);
            await this.placeConditionalButton.click();
            return stockCodeConditional || '';

        } catch (error) {
            throw new Error(`Failed to place take profit order: ${error}`);
        }
    }

    async placeStopLossOrder(orderData?: Partial<ConditionalOrderFormData>): Promise<string> {
        const {
            stockCodeConditional,
            quantityConditional,
            differenceBQ,
            sideConditional = 'sell',
        } = orderData || {};
        try {
            await this.switchConditionalTab('stopLoss');
            await this.fillQuantityConditional(quantityConditional);
            await this.fillDifferenceBQConditional(differenceBQ!);
            await this.placeConditionalButton.click();
            return stockCodeConditional || '';
        } catch (error) {
            throw new Error(`Failed to place stop loss order: ${error}`);
        }
    }

    async placePurchaseOrder(orderData?: Partial<ConditionalOrderFormData>): Promise<string> {
        const {
            stockCodeConditional,
            quantityConditional,
            sideConditional,
        } = orderData || {};
        try {
            await this.switchConditionalTab('purchase');
            if (sideConditional === 'buy') {
                await this.buyTabConditional.click();
            } else {
                await this.sellTabConditional.click();
            }
            await this.fillStockCodeConditional(stockCodeConditional);
            await this.fillQuantityConditional(quantityConditional);
            await this.placeConditionalButton.click();
            return stockCodeConditional || '';
        } catch (error) {
            throw new Error(`Failed to place purchase order: ${error}`);
        }
    }

    // =================== MESSAGE VERIFICATION METHODS ===================

    /**
     * Verify message with improved error handling and timeout
     */
    async verifyMessageOrder(expectedTitle: string | string[], expectedDescription?: string | string[]): Promise<void> {
        await FormUtils.verifyArrayMessage(expectedTitle, this.titleMessage, expectedDescription, this.descriptionMessage);
    }

    async getMessage(): Promise<any> {
        return await FormUtils.getCurrentMessage(this.titleMessage, this.descriptionMessage);
    }

    async closeToastMessageOrder(): Promise<void> {
        await this.closeToastMessage.click();
    }

    async closeAllToastMessages(elements?: Locator): Promise<void> {
        const toastElements = elements || this.page.locator('.notification.toast.toast-stacked.top-right, .notification.toast.top-right');
        const count = await toastElements.count();

        // If no toast messages found, skip silently
        if (count === 0) {
            return;
        }

        for (let i = count - 1; i >= 0; i--) {
            const iconClose = toastElements.nth(i).locator('.toast-action .icon.iClose');

            // Check if close button exists and is visible before clicking
            if (await iconClose.isVisible()) {
                try {
                    await iconClose.click();
                } catch (error) {
                    // Skip silently if click fails
                    continue;
                }
            }
        }
    }

    /**
     * Get current message content
     */
    async getCurrentMessageOrder(): Promise<void> {
        await FormUtils.getCurrentMessage(this.titleMessage, this.descriptionMessage);
    }

    /**
     * Wait for success message
     */
    async waitForSuccessMessageOrder(timeout: number = OrderPage.MESSAGE_TIMEOUT): Promise<boolean> {
        return FormUtils.waitForSuccessMessage(this.titleMessage, timeout);
    }

    /**
     * Wait for error message
     */
    async waitForErrorMessageOrder(timeout: number = OrderPage.MESSAGE_TIMEOUT): Promise<boolean> {
        return FormUtils.waitForErrorMessage(this.titleMessage, timeout);
    }

    async updatePurchasePower(): Promise<void> {
        await this.reloadPurchasePower.click();
    }

    async closeOrder(): Promise<void> {
        await this.closeOrderButton.click();
    }

    // =================== ORDER IN DAY METHODS ===================

    async openOrderInDayTab(): Promise<void> {
        await this.orderIndayTab.click();
    }

    async switchToAssetTab(): Promise<void> {
        await this.assetTab.click();
    }

    async reloadData(): Promise<void> {
        await this.orderBook.reloadOrderBook();
    }
    async closeOrderInDay(): Promise<void> {
        await this.page.locator('.card-panel.asset-panel .icon.iClose').click();
    }
    async verifyToggleWaitingMatchOn(): Promise<boolean> {
        return await FormUtils.verifyToggle(this.toggleWaitingMatch, 'ON');
    }

    async verifyToggleWaitingMatchOff(): Promise<boolean> {
        return await FormUtils.verifyToggle(this.toggleWaitingMatch, 'OFF');
    }

    async clickToggleWaitingMatch(): Promise<void> {
        await this.toggleWaitingMatch.click();
    }

    async getOrderInDayRowData(rowIndex: number): Promise<any> {
        await this.orderIndayTab.waitFor({ state: 'visible' });
        const rows = await this.page.locator('.asset-panel .table.table-fix tbody tr').nth(rowIndex);
        await rows.waitFor({ state: 'visible' });

        const stockCode = await rows.locator('td:nth-child(1)').textContent();
        const side = await rows.locator('td:nth-child(2)').textContent();
        const price = await rows.locator('td:nth-child(3)').textContent();
        const remainingQuantity = await rows.locator('td:nth-child(4)').textContent();
        const status = await rows.locator('td:nth-child(5)').textContent();

        await this.switchQtyColumn.click();
        await FormUtils.selectOption(this.page, this.dropdownQty, this.dropdownQty, 'KL');

        const quantity = await rows.locator('td:nth-child(4)').textContent();

        await this.switchQtyColumn.click();
        await FormUtils.selectOption(this.page, this.dropdownQty, this.dropdownQty, 'KL khớp');
        const matchedQuantity = await rows.locator('td:nth-child(4)').textContent();

        return {
            stockCode,
            side,
            price,
            quantity,
            matchedQuantity,
            remainingQuantity,
            status
        };
    }

    async getStockCodeInDayRowData(rowIndex: number): Promise<any> {
        await this.orderIndayTab.waitFor({ state: 'visible' });
        const rows = await this.page.locator('.asset-panel .table.table-fix tbody tr').nth(rowIndex);
        if (await rows.isVisible()) {
            return await rows.locator('td:nth-child(1)').textContent();
        }
        return '';
    }

    async getPriceInDayRowData(rowIndex: number): Promise<any> {
        await this.orderIndayTab.waitFor({ state: 'visible' });
        const rows = await this.page.locator('.asset-panel .table.table-fix tbody tr').nth(rowIndex);
        await rows.waitFor({ state: 'visible' });
        return await rows.locator('td:nth-child(3)').textContent();
    }

    async getQuantityInDayRowData(rowIndex: number): Promise<any> {
        await this.orderIndayTab.waitFor({ state: 'visible' });
        const rows = await this.page.locator('.asset-panel .table.table-fix tbody tr').nth(rowIndex);
        await rows.waitFor({ state: 'visible' });
        return await rows.locator('td:nth-child(4)').textContent();
    }

    async getAllOrderInDayData(useScrolling: boolean = true): Promise<any[]> {
        await this.orderIndayTab.waitFor({ state: 'visible' });
        return await TableUtils.getAllTableData(this.page, this.orderBook.tableRows, this.page.locator(CommonSelectors.SCROLL_TABLE), this.getOrderInDayRowData, useScrolling);
    }
}

export default OrderPage;