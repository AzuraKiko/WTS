import { Page, Locator, expect } from '@playwright/test';
import BasePage from './BasePage';
import MatrixPage from './MatrixPage';
import { FormUtils, TableUtils, CommonSelectors } from '../../helpers/uiUtils';
import SelectSubacc from './SubaccPage';
import PositionPage from './PositionPage';

// Interface definitions for better type safety
interface OrderDerivativeFormData {
    stockCode: string;
    quantity?: number;
    price?: number | string;
    side: 'long' | 'short';
}

interface StopLimitOrderData extends OrderDerivativeFormData {
    triggerPrice?: number;
    triggerCondition?: 'greater_than' | 'less_than';
    validFromDate?: string;
    validToDate?: string;
}

interface SLTPOrderData {
    stockCode: string;
    quantity: number;
    side: 'long' | 'short';
    takeProfitOrder?: {
        type: 'ON' | 'OFF';
        triggerPrice?: number;
        orderPrice?: number;
        orderType?: 'LO' | 'MTL';
    };
    stopLossOrder?: {
        type: 'ON' | 'OFF';
        triggerPrice?: number;
        orderPrice?: number;
        orderType?: 'LO' | 'MTL';
    };
    validFromDate?: string;
    validToDate?: string;
}

interface DerivativePageElements {
    navigation: {
        orderButton: Locator;
        normalTab: Locator;
        quickTab: Locator;
        stopLimitTab: Locator;
        stopTakeProfitTab: Locator;
        settingsButton: Locator;
    };
    form: {
        iconSearchStock: Locator;
        inputSearchStock: Locator;
        optionSearchStock: Locator;
        quantityInput: Locator;
        priceInput: Locator;
        priceCeil: Locator;
        priceFloor: Locator;
        priceReference: Locator;
        marketPrice: Locator;

        LO: Locator,
        ATO: Locator;
        ATC: Locator;
        MTL: Locator;
        MOK: Locator;
        MAK: Locator;
        maxLongDisplay: Locator;
        maxShortDisplay: Locator;

        longButton: Locator;
        shortButton: Locator;

        confirmOrderButton: Locator;
        closeOrderButton: Locator
    };
    stopLimit: {
        // Stop limit tab specific elements
        longSideTab: Locator;
        shortSideTab: Locator;
        triggerPriceInput: Locator;
        triggerConditionGreaterThan: Locator;
        triggerConditionLessThan: Locator;
        orderTypeLO: Locator;
        orderTypeMTL: Locator;
        orderPriceInput: Locator;
        orderPriceIncrease: Locator;
        orderPriceDecrease: Locator;
        quantityInput: Locator;
        quantityIncrease: Locator;
        quantityDecrease: Locator;
        validFromDateInput: Locator;
        validToDateInput: Locator;
        maxLongDisplay: Locator;
        orderButton: Locator;
    };
    sltp: {
        // SL/TP tab specific elements
        positionInfo: {
            positionValue: Locator;
            avgPriceValue: Locator;
            quantityValue: Locator;
            currentPLValue: Locator;
        };
        quantityInput: Locator;
        quantityIncrease: Locator;
        quantityDecrease: Locator;
        takeProfitSection: {
            checkbox: Locator;
            triggerPriceInput: Locator;
            triggerPriceIncrease: Locator;
            triggerPriceDecrease: Locator;
            orderPriceInput: Locator;
            orderPriceIncrease: Locator;
            orderPriceDecrease: Locator;
            orderTypeLO: Locator;
            orderTypeMTL: Locator;
            estProfitDisplay: Locator;
        };
        stopLossSection: {
            checkbox: Locator;
            triggerPriceInput: Locator;
            triggerPriceIncrease: Locator;
            triggerPriceDecrease: Locator;
            orderPriceInput: Locator;
            orderPriceIncrease: Locator;
            orderPriceDecrease: Locator;
            orderTypeLO: Locator;
            orderTypeMTL: Locator;
            estLossDisplay: Locator;
        };
        validFromDateInput: Locator;
        validToDateInput: Locator;
        orderButton: Locator;
    };
    quickTab: {
        // Quick tab specific elements - only unique ones not in form
        longSection: {
            contractCode: Locator;
            contractCodeEdit: Locator;
            priceDecrease: Locator;
            priceIncrease: Locator;
            quantityDecrease: Locator;
            quantityIncrease: Locator;
            percentageButtons: {
                p25: Locator;
                p50: Locator;
                p75: Locator;
                p100: Locator;
            };
        };
        shortSection: {
            contractCode: Locator;
            contractCodeEdit: Locator;
            priceDecrease: Locator;
            priceIncrease: Locator;
            quantityDecrease: Locator;
            quantityIncrease: Locator;
            percentageButtons: {
                p25: Locator;
                p50: Locator;
                p75: Locator;
                p100: Locator;
            };
        };
    };
    messages: {
        toastMessage: Locator;
        titleMessage: Locator;
        descriptionMessage: Locator;
        closeToastMessage: Locator;
    };
}

class DerivativePage extends BasePage {
    // Dependencies
    matrixPage: MatrixPage;
    subaccPage: SelectSubacc;
    positionPage: PositionPage;


    // Constants
    private static readonly DEFAULT_QUANTITY = 1;
    private static readonly NAVIGATION_TIMEOUT = 3000;
    private static readonly MATRIX_TIMEOUT = 5000;
    private static readonly MESSAGE_TIMEOUT = 3000;

    // Element groups for better organization
    private elements!: DerivativePageElements;

    constructor(page: Page) {
        super(page);
        this.matrixPage = new MatrixPage(page);
        this.subaccPage = new SelectSubacc(page);
        this.positionPage = new PositionPage(page);
        this.initializeElements(page);
    }

    /**
     * Initialize all page elements in organized structure
     */
    private initializeElements(page: Page): void {
        this.elements = {
            navigation: {
                orderButton: page.locator('.footer-btn:has(.iOrder)'),
                normalTab: page.locator('.derivative-order .panel-header .panel-tabs div:nth-child(1)'),
                quickTab: page.locator('.derivative-order .panel-header .panel-tabs div:nth-child(2)'),
                stopLimitTab: page.locator('.derivative-order .panel-header .panel-tabs div:nth-child(3)'),
                stopTakeProfitTab: page.locator('.derivative-order .panel-header .panel-tabs div:nth-child(4)'),
                settingsButton: page.locator('.derivative-order .panel-header .icon'),

            },
            form: {
                iconSearchStock: page.locator('.icon.iEdit'),
                inputSearchStock: page.getByPlaceholder('Mã hợp đồng', { exact: true }),
                optionSearchStock: page.locator('.list-unstyled'),
                priceInput: page.getByPlaceholder('Giá x1000'),
                quantityInput: page.locator('input.order-quantity'),
                priceCeil: page.locator('span.c.text.text--sm').first(),
                priceFloor: page.locator('span.f.text.text--sm').first(),
                priceReference: page.locator('span.r.text.text--sm').first(),
                marketPrice: page.locator('.symbol__lastPrice'),

                maxLongDisplay: page.locator(' .max .max__long .text.text--light'),
                maxShortDisplay: page.locator(' .max .max__short .text.text--light'),

                LO: page.locator('.type.btn.btn--dark  ', { hasText: 'LO' }),
                ATO: page.locator('.type.btn.btn--dark  ', { hasText: 'ATO' }),
                ATC: page.locator('.type.btn.btn--dark  ', { hasText: 'ATC' }),
                MTL: page.locator('.type.btn.btn--dark  ', { hasText: 'MTL' }),
                MOK: page.locator('.type.btn.btn--dark  ', { hasText: 'MOK' }),
                MAK: page.locator('.type.btn.btn--dark  ', { hasText: 'MAK' }),

                longButton: page.locator('.btn.btn--buy:nth-child(1)'),
                shortButton: page.locator('.btn.btn--sell'),
                confirmOrderButton: page.locator('.btn-confirm'),
                closeOrderButton: page.locator('.btn--cancel')
            },
            stopLimit: {
                // Stop limit tab specific elements
                longSideTab: page.locator('.switch-order-side button:nth-child(1)'),
                shortSideTab: page.locator('.switch-order-side button:nth-child(2)'),
                triggerPriceInput: page.locator('.derivative-order__normal input[placeholder="TP"]'),
                triggerConditionGreaterThan: page.locator('.derivative-order__normal .group-control--right .btn-primary'),
                triggerConditionLessThan: page.locator('.derivative-order__normal .group-control--right .btn--transparent2:has-text("≤")'),
                orderTypeLO: page.locator('.derivative-order__normal .types .type.btn--dark.active'),
                orderTypeMTL: page.locator('.derivative-order__normal .types .type.btn--dark:has-text("MTL")'),
                orderPriceInput: page.locator('.derivative-order__normal .price input[placeholder="Price x1000"]'),
                orderPriceIncrease: page.locator('.derivative-order__normal .price .group-control--right .btn-icon:has(.icon.iPlus)'),
                orderPriceDecrease: page.locator('.derivative-order__normal .price .group-control--right .btn-icon:has(.icon.iMinus)'),
                quantityInput: page.locator('.derivative-order__normal .quantity input[placeholder="Quantity"]'),
                quantityIncrease: page.locator('.derivative-order__normal .quantity .group-control--right .btn-icon:has(.icon.iPlus)'),
                quantityDecrease: page.locator('.derivative-order__normal .quantity .group-control--right .btn-icon:has(.icon.iMinus)'),
                validFromDateInput: page.locator('.derivative-order__normal .filter-datePicker__from input'),
                validToDateInput: page.locator('.derivative-order__normal .filter-datePicker__to input'),
                maxLongDisplay: page.locator('.derivative-order__normal .max__long .text--light'),
                orderButton: page.locator('.derivative-order__normal .btn--buy'),
            },
            sltp: {
                // SL/TP tab specific elements
                positionInfo: {
                    positionValue: page.locator('.derivative-order__normal .d-flex .text.text--sm:has(div:text("Position")) .text-right'),
                    avgPriceValue: page.locator('.derivative-order__normal .d-flex .text.text--sm:has(div:text("Avg. Price")) .text--light'),
                    quantityValue: page.locator('.derivative-order__normal .d-flex .text.text--sm:has(div:text("Quantity")) .text--light'),
                    currentPLValue: page.locator('.derivative-order__normal .d-flex .text.text--sm:has(div:text("Current P/L")) .r'),
                },
                quantityInput: page.locator('.derivative-order__normal .quantity input#order-quantity'),
                quantityIncrease: page.locator('.derivative-order__normal .quantity .group-control--right .btn-icon:has(.icon.iPlus)'),
                quantityDecrease: page.locator('.derivative-order__normal .quantity .group-control--right .btn-icon:has(.icon.iMinus)'),
                takeProfitSection: {
                    checkbox: page.locator('.derivative-order__normal .checkbox-group:has(label:text("Take profit order")) input[type="checkbox"]'),
                    triggerPriceInput: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Trigger Price (<")) .price input[placeholder="TP"]'),
                    triggerPriceIncrease: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Trigger Price (<")) .price .btn-icon:has(.icon.iPlus)'),
                    triggerPriceDecrease: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Trigger Price (<")) .price .btn-icon:has(.icon.iMinus)'),
                    orderPriceInput: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Trigger Price (<")) .types ~ .price input[placeholder="OP"]'),
                    orderPriceIncrease: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Trigger Price (<")) .types ~ .price .btn-icon:has(.icon.iPlus)'),
                    orderPriceDecrease: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Trigger Price (<")) .types ~ .price .btn-icon:has(.icon.iMinus)'),
                    orderTypeLO: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Trigger Price (<")) .types button:has-text("LO")'),
                    orderTypeMTL: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Trigger Price (<")) .types button:has-text("MTL")'),
                    estProfitDisplay: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Est Profit")) .text.text--sm.r'),
                },
                stopLossSection: {
                    checkbox: page.locator('.derivative-order__normal .checkbox-group:has(label:text("Stop loss order")) input[type="checkbox"]'),
                    triggerPriceInput: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Trigger Price (>")) .price input[placeholder="TP"]'),
                    triggerPriceIncrease: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Trigger Price (>")) .price .btn-icon:has(.icon.iPlus)'),
                    triggerPriceDecrease: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Trigger Price (>")) .price .btn-icon:has(.icon.iMinus)'),
                    orderPriceInput: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Trigger Price (>")) .types ~ .price input[placeholder="OP"]'),
                    orderPriceIncrease: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Trigger Price (>")) .types ~ .price .btn-icon:has(.icon.iPlus)'),
                    orderPriceDecrease: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Trigger Price (>")) .types ~ .price .btn-icon:has(.icon.iMinus)'),
                    orderTypeLO: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Trigger Price (>")) .types button:has-text("LO")'),
                    orderTypeMTL: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Trigger Price (>")) .types button:has-text("MTL")'),
                    estLossDisplay: page.locator('.derivative-order__normal .w-150px:has(.text:has-text("Est Loss")) .text.text--sm.r'),
                },
                validFromDateInput: page.locator('.derivative-order__normal .filter-datePicker__from input'),
                validToDateInput: page.locator('.derivative-order__normal .filter-datePicker__to input'),
                orderButton: page.locator('.derivative-order__normal .btn.bg-green'),
            },

            quickTab: {
                longSection: {
                    contractCode: page.locator('.derivative-order__quick--left .symbol__infor div'),
                    contractCodeEdit: page.locator('.derivative-order__quick--left .symbol__infor .icon.iEdit'),
                    priceDecrease: page.locator('.derivative-order__quick--left .price .group-control .btn-icon:first-child'),
                    priceIncrease: page.locator('.derivative-order__quick--left .price .group-control .btn-icon:last-child'),
                    quantityDecrease: page.locator('.derivative-order__quick--left .quantity .group-control .btn-icon:first-child'),
                    quantityIncrease: page.locator('.derivative-order__quick--left .quantity .group-control .btn-icon:last-child'),
                    percentageButtons: {
                        p25: page.locator('.derivative-order__quick--left .quantity-pc button:has-text("25%")'),
                        p50: page.locator('.derivative-order__quick--left .quantity-pc button:has-text("50%")'),
                        p75: page.locator('.derivative-order__quick--left .quantity-pc button:has-text("75%")'),
                        p100: page.locator('.derivative-order__quick--left .quantity-pc button:has-text("100%")'),
                    },
                },
                shortSection: {
                    contractCode: page.locator('.derivative-order__quick--right .symbol__infor div'),
                    contractCodeEdit: page.locator('.derivative-order__quick--right .symbol__infor .icon.iEdit'),
                    priceDecrease: page.locator('.derivative-order__quick--right .price .group-control .btn-icon:first-child'),
                    priceIncrease: page.locator('.derivative-order__quick--right .price .group-control .btn-icon:last-child'),
                    quantityDecrease: page.locator('.derivative-order__quick--right .quantity .group-control .btn-icon:first-child'),
                    quantityIncrease: page.locator('.derivative-order__quick--right .quantity .group-control .btn-icon:last-child'),
                    percentageButtons: {
                        p25: page.locator('.derivative-order__quick--right .quantity-pc button:has-text("25%")'),
                        p50: page.locator('.derivative-order__quick--right .quantity-pc button:has-text("50%")'),
                        p75: page.locator('.derivative-order__quick--right .quantity-pc button:has-text("75%")'),
                        p100: page.locator('.derivative-order__quick--right .quantity-pc button:has-text("100%")'),
                    },
                },
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

    /**
     * Create legacy property references for backward compatibility
     */
    private createLegacyReferences(): void {
        // Navigation
        this.orderButton = this.elements.navigation.orderButton;

        // Order Form
        this.iconSearchStock = this.elements.form.iconSearchStock;
        this.inputSearchStock = this.elements.form.inputSearchStock;
        this.optionSearchStock = this.elements.form.optionSearchStock;
        this.quantityInput = this.elements.form.quantityInput;
        this.priceInput = this.elements.form.priceInput;
        this.priceCeil = this.elements.form.priceCeil;
        this.priceFloor = this.elements.form.priceFloor;
        this.priceReference = this.elements.form.priceReference;
        this.marketPrice = this.elements.form.marketPrice;

        this.LO = this.elements.form.LO;
        this.ATO = this.elements.form.ATO;
        this.ATC = this.elements.form.ATC;
        this.MTL = this.elements.form.MTL;
        this.MOK = this.elements.form.MOK;
        this.MAK = this.elements.form.MAK;

        this.longButton = this.elements.form.longButton;
        this.shortButton = this.elements.form.shortButton;
        this.confirmOrderButton = this.elements.form.confirmOrderButton;
        this.closeOrderButton = this.elements.form.closeOrderButton;

        // Messages
        this.toastMessage = this.elements.messages.toastMessage;
        this.titleMessage = this.elements.messages.titleMessage;
        this.descriptionMessage = this.elements.messages.descriptionMessage;
        this.closeToastMessage = this.elements.messages.closeToastMessage;
    }

    // Legacy property declarations for backward compatibility
    orderButton!: Locator;
    iconSearchStock!: Locator;
    inputSearchStock!: Locator;
    optionSearchStock!: Locator;
    quantityInput!: Locator;
    priceInput!: Locator;
    priceCeil!: Locator;
    priceFloor!: Locator;
    priceReference!: Locator;
    marketPrice!: Locator;

    LO!: Locator;
    ATO!: Locator;
    ATC!: Locator;
    MTL!: Locator;
    MOK!: Locator;
    MAK!: Locator;

    longButton!: Locator;
    shortButton!: Locator;

    confirmOrderButton!: Locator;
    closeOrderButton!: Locator;

    toastMessage!: Locator;
    titleMessage!: Locator;
    descriptionMessage!: Locator;
    closeToastMessage!: Locator;

    // =================== NAVIGATION METHODS ===================

    /**
     * Navigate to order page and handle matrix if needed
     */
    async navigateToDerivativeOrder(): Promise<void> {
        try {
            await this.orderButton.click();
            await this.page.waitForTimeout(DerivativePage.NAVIGATION_TIMEOUT);

            if (await this.matrixPage.isMatrixVisible()) {
                await this.matrixPage.enterMatrixValid();
            }

            await this.page.waitForTimeout(DerivativePage.MATRIX_TIMEOUT);
            await this.subaccPage.selectFutureSubacc();
            await this.orderButton.click();

        } catch (error) {
            throw new Error(`Failed to navigate to order page: ${error}`);
        }
    }

    // =================== ORDER FORM METHODS ===================

    /**
     * Select stock code in the form
     */
    async selectStockCode(stockCode: string): Promise<string> {
        const code: string = stockCode;
        try {
            await FormUtils.selectOption(this.page, this.iconSearchStock, this.optionSearchStock, code);
            await this.page.waitForTimeout(500);
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

    async getInfoPrice(): Promise<{
        marketPrice: number;
        priceFloor: number;
        priceCeil: number;
        priceReference: number;
    }> {
        try {
            function formatPrice(price: string): number {
                const priceText = price.replace(/,/g, '');
                const priceNumber = parseFloat(priceText) || 0;
                return priceNumber;
            }
            const marketPriceText = await this.marketPrice.textContent() || '0';
            const marketPrice = formatPrice(marketPriceText);

            const priceFloorText = await this.priceFloor.textContent() || '0';
            const priceFloor = formatPrice(priceFloorText);
            const priceCeilText = await this.priceCeil.textContent() || '0';
            const priceCeil = formatPrice(priceCeilText);
            const priceReferenceText = await this.priceReference.textContent() || '0';
            const priceReference = formatPrice(priceReferenceText);

            return {
                marketPrice,
                priceFloor,
                priceCeil,
                priceReference
            };
        } catch (error) {
            throw new Error(`Failed to get info price: ${error}`);
        }
    }

    async selectMarketPrice(priceType: 'ATO' | 'ATC' | 'MTL' | 'MOK' | 'MAK'): Promise<void> {
        try {
            const priceElements = {
                ATO: this.ATO,
                ATC: this.ATC,
                MTL: this.MTL,
                MOK: this.MOK,
                MAK: this.MAK
            };

            const selectedElement = priceElements[priceType];
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
    async submitOrder(side: 'long' | 'short'): Promise<void> {
        try {
            if (side === 'long') {
                await this.longButton.click();
            } else {
                await this.shortButton.click();
            }
            await this.confirmOrderButton.click();
        } catch (error) {
            throw new Error(`Failed to submit order: ${error}`);
        }
    }

    // =================== ORDER PLACEMENT METHODS ===================

    /**
     * Place a buy order with enhanced error handling
     */
    async placeOrder(side: 'long' | 'short', orderData?: Partial<OrderDerivativeFormData>): Promise<string> {
        const {
            stockCode,
            quantity = DerivativePage.DEFAULT_QUANTITY
        } = orderData || {};

        try {
            // Fill stock code
            const usedStockCode: string = await this.selectStockCode(stockCode!);

            // Select price based on side: floor for long, ceil for short
            const priceType = side === 'long' ? 'floor' : 'ceil';
            await this.selectPriceOption(priceType);

            // Fill quantity
            await this.fillQuantity(quantity);

            // Submit order
            await this.submitOrder(side);

            return usedStockCode;
        } catch (error) {
            throw new Error(`Failed to place ${side} order: ${error}`);
        }
    }


    async placeStopTakeProfitOrderFromOpenPositionByContractCode(contractCode: string, validFromDate?: string, validToDate?: string): Promise<string> {
        try {
            await this.positionPage.openPositionPanel();
            await this.positionPage.stopTakeProfitByContractCode(contractCode);
            const positionInfo = await this.getSLTPPositionInfo();
            const priceInfo = await this.getInfoPrice();
            if (positionInfo.position === 'Mua') {
                await this.setTakeProfitTriggerPrice(priceInfo.priceCeil);
                await this.selectTakeProfitOrderType('MTL');
                await this.setStopLossTriggerPrice(priceInfo.priceCeil);
                await this.selectStopLossOrderType('MTL');
            } else {
                await this.setTakeProfitTriggerPrice(priceInfo.priceFloor);
                await this.selectTakeProfitOrderType('MTL');
                await this.setStopLossTriggerPrice(priceInfo.priceCeil);
                await this.selectStopLossOrderType('MTL');
            }

            // Set valid date range if provided
            if (validFromDate || validToDate) {
                await this.setSLTPValidDate(validFromDate, validToDate);
            }

            // Submit order
            await this.elements.sltp.orderButton.click();

            // Confirm order if confirmation dialog appears
            if (await this.elements.form.confirmOrderButton.isVisible()) {
                await this.elements.form.confirmOrderButton.click();
            }
            return contractCode || '';
        } catch (error) {
            throw new Error(`Failed to place stop take profit order from open position by contract code: ${error}`);
        }
    }

    /**
     * Place order with custom price
     */
    async placeOrderWithCustomPrice(orderData: OrderDerivativeFormData): Promise<string> {
        const { stockCode, quantity, price, side } = orderData;

        if (!price) {
            throw new Error('Custom price is required for this method');
        }

        try {
            const usedStockCode: string = await this.selectStockCode(stockCode!);

            // Set custom price
            await this.setCustomPrice(price);

            // Fill quantity
            await this.fillQuantity(quantity!);


            if (side === 'long') {
                await this.longButton.click();
            } else {
                await this.shortButton.click();
            }
            await this.submitOrder(side);

            return usedStockCode;
        } catch (error) {
            throw new Error(`Failed to place order with custom price: ${error}`);
        }
    }

    /**
     * Place market order (using reference price)
     */
    async placeMarketOrder(orderData?: Partial<OrderDerivativeFormData>): Promise<string> {
        const {
            stockCode,
            quantity = DerivativePage.DEFAULT_QUANTITY,
            price,
            side
        } = orderData || {};

        try {
            // Fill stock code
            const usedStockCode = await this.selectStockCode(stockCode!);
            const priceType = price as 'ATO' | 'ATC' | 'MTL' | 'MOK' | 'MAK';

            // Select reference price for market order
            await this.selectMarketPrice(priceType);

            // Fill quantity
            await this.fillQuantity(quantity);

            if (side === 'long') {
                await this.longButton.click();
            } else {
                await this.shortButton.click();
            }
            await this.submitOrder(side!);

            return usedStockCode;
        } catch (error) {
            throw new Error(`Failed to place market order: ${error}`);
        }
    }

    async switchToTab(tabName: 'normal' | 'quick' | 'stopLimit' | 'stopTakeProfit'): Promise<void> {
        try {
            const tabElements = {
                normal: this.elements.navigation.normalTab,
                quick: this.elements.navigation.quickTab,
                stopLimit: this.elements.navigation.stopLimitTab,
                stopTakeProfit: this.elements.navigation.stopTakeProfitTab
            };
            const selectedTab = tabElements[tabName];
            await selectedTab.click();
        } catch (error) {
            throw new Error(`Failed to switch to ${tabName} tab: ${error}`);
        }
    }

    // =================== QUICK TAB METHODS ===================

    /**
     * Switch to quick tab and perform quick order operations
     */
    async switchToQuickTab(): Promise<void> {
        try {
            await this.switchToTab('quick');
            await this.page.waitForTimeout(500); // Wait for quick tab to load
        } catch (error) {
            throw new Error(`Failed to switch to quick tab: ${error}`);
        }
    }

    /**
     * Select order type in quick tab section
     */
    async selectQuickOrderType(side: 'long' | 'short', orderType: 'LO' | 'ATO' | 'ATC' | 'MTL' | 'MOK' | 'MAK'): Promise<void> {
        try {
            // Sử dụng order type buttons riêng cho quick tab
            const sectionSelector = side === 'long'
                ? '.derivative-order__quick--left .types'
                : '.derivative-order__quick--right .types';
            const orderTypeButton = this.page.locator(`${sectionSelector} button:has-text("${orderType}")`);

            await expect(orderTypeButton).toBeVisible();
            await orderTypeButton.click();
        } catch (error) {
            throw new Error(`Failed to select ${orderType} order type for ${side} section: ${error}`);
        }
    }

    /**
     * Set price in quick tab section
     */
    async setQuickPrice(side: 'long' | 'short', price: number | string): Promise<void> {
        try {
            // Sử dụng price input riêng cho quick tab với ID tương ứng
            const priceInputSelector = side === 'long'
                ? '.derivative-order__quick--left .price input'
                : '.derivative-order__quick--right .price input';
            const priceInput = this.page.locator(priceInputSelector);
            await FormUtils.fillField(priceInput, price);
        } catch (error) {
            throw new Error(`Failed to set price for ${side} section: ${error}`);
        }
    }

    /**
     * Adjust price using increase/decrease buttons
     */
    async adjustQuickPrice(side: 'long' | 'short', direction: 'increase' | 'decrease', times: number = 1): Promise<void> {
        try {
            const section = side === 'long' ? this.elements.quickTab.longSection : this.elements.quickTab.shortSection;
            const button = direction === 'increase' ? section.priceIncrease : section.priceDecrease;

            for (let i = 0; i < times; i++) {
                await button.click();
                await this.page.waitForTimeout(100);
            }
        } catch (error) {
            throw new Error(`Failed to adjust price for ${side} section: ${error}`);
        }
    }

    /**
     * Set quantity in quick tab section
     */
    async setQuickQuantity(side: 'long' | 'short', quantity: number): Promise<void> {
        try {
            // Sử dụng quantity input riêng cho quick tab với ID tương ứng
            const quantityInputSelector = side === 'long'
                ? '.derivative-order__quick--left .quantity input'
                : '.derivative-order__quick--right .quantity input';
            const quantityInput = this.page.locator(quantityInputSelector);
            await FormUtils.fillField(quantityInput, quantity);
        } catch (error) {
            throw new Error(`Failed to set quantity for ${side} section: ${error}`);
        }
    }

    /**
     * Adjust quantity using increase/decrease buttons
     */
    async adjustQuickQuantity(side: 'long' | 'short', direction: 'increase' | 'decrease', times: number = 1): Promise<void> {
        try {
            const section = side === 'long' ? this.elements.quickTab.longSection : this.elements.quickTab.shortSection;
            const button = direction === 'increase' ? section.quantityIncrease : section.quantityDecrease;

            for (let i = 0; i < times; i++) {
                await button.click();
                await this.page.waitForTimeout(100);
            }
        } catch (error) {
            throw new Error(`Failed to adjust quantity for ${side} section: ${error}`);
        }
    }

    /**
     * Select percentage for quantity (25%, 50%, 75%, 100%)
     */
    async selectQuickQuantityPercentage(side: 'long' | 'short', percentage: '25' | '50' | '75' | '100'): Promise<void> {
        try {
            const section = side === 'long' ? this.elements.quickTab.longSection : this.elements.quickTab.shortSection;
            const button = section.percentageButtons[`p${percentage}` as keyof typeof section.percentageButtons];

            await expect(button).toBeVisible();
            await button.click();
        } catch (error) {
            throw new Error(`Failed to select ${percentage}% quantity for ${side} section: ${error}`);
        }
    }

    /**
     * Place quick order in the specified section
     */
    async placeQuickOrder(orderData: OrderDerivativeFormData): Promise<string> {
        const { stockCode, quantity, price, side } = orderData;

        try {
            // Switch to quick tab
            await this.switchToQuickTab();

            // Set stock code if provided (sử dụng lại từ elements.form)
            if (stockCode) {
                const section = side === 'long' ? this.elements.quickTab.longSection : this.elements.quickTab.shortSection;
                await section.contractCodeEdit.click();
                await this.elements.form.inputSearchStock.fill(stockCode);
                await this.elements.form.optionSearchStock.locator(`text=${stockCode}`).first().click();
            }

            // Set order type (default to LO if not specified)
            const orderType = typeof price === 'string' && ['ATO', 'ATC', 'MTL', 'MOK', 'MAK'].includes(price)
                ? price as 'ATO' | 'ATC' | 'MTL' | 'MOK' | 'MAK'
                : 'LO';
            await this.selectQuickOrderType(side, orderType);

            // Set price if it's a number (for LO orders)
            if (typeof price === 'number') {
                await this.setQuickPrice(side, price);
            }

            // Set quantity
            if (quantity) {
                await this.setQuickQuantity(side, quantity);
            }

            // Click the order button (sử dụng lại từ elements.form hoặc quick tab specific)
            if (side === 'long') {
                await this.elements.form.longButton.click();
            } else {
                await this.elements.form.shortButton.click();
            }

            // Confirm order if confirmation dialog appears (sử dụng lại từ elements.form)
            if (await this.elements.form.confirmOrderButton.isVisible()) {
                await this.elements.form.confirmOrderButton.click();
            }

            return stockCode;
        } catch (error) {
            throw new Error(`Failed to place quick ${side} order: ${error}`);
        }
    }

    /**
     * Get max long/short values from quick tab display
     */
    async getQuickMaxValues(): Promise<{ maxLong: string, maxShort: string }> {
        try {
            await this.switchToQuickTab();

            const maxLong = await this.elements.form.maxLongDisplay.textContent() || '0';
            const maxShort = await this.elements.form.maxShortDisplay.textContent() || '0';

            return { maxLong, maxShort };
        } catch (error) {
            throw new Error(`Failed to get max values from quick tab: ${error}`);
        }
    }

    /**
     * Use keyboard shortcuts for quick order placement (F2 for Long, F9 for Short)
     */
    async placeQuickOrderWithKeyboard(orderData: OrderDerivativeFormData): Promise<void> {
        const { stockCode, quantity, price, side } = orderData;
        try {
            // Switch to quick tab
            await this.switchToQuickTab();

            // Set stock code if provided (sử dụng lại từ elements.form)
            if (stockCode) {
                const section = side === 'long' ? this.elements.quickTab.longSection : this.elements.quickTab.shortSection;
                await section.contractCodeEdit.click();
                await this.elements.form.inputSearchStock.fill(stockCode);
                await this.elements.form.optionSearchStock.locator(`text=${stockCode}`).first().click();
            }

            // Set order type (default to LO if not specified)
            const orderType = typeof price === 'string' && ['ATO', 'ATC', 'MTL', 'MOK', 'MAK'].includes(price)
                ? price as 'ATO' | 'ATC' | 'MTL' | 'MOK' | 'MAK'
                : 'LO';
            await this.selectQuickOrderType(side, orderType);

            // Set price if it's a number (for LO orders)
            if (typeof price === 'number') {
                await this.setQuickPrice(side, price);
            }

            // Set quantity
            if (quantity) {
                await this.setQuickQuantity(side, quantity);
            }

            const key = side === 'long' ? 'F2' : 'F9';
            await this.page.keyboard.press(key);

            // Confirm order if confirmation dialog appears (sử dụng lại từ elements.form)
            if (await this.elements.form.confirmOrderButton.isVisible()) {
                await this.elements.form.confirmOrderButton.click();
            }
        } catch (error) {
            throw new Error(`Failed to place quick ${side} order with keyboard shortcut: ${error}`);
        }
    }

    /**
     * Open settings
     */
    async openSettings(): Promise<void> {
        try {
            await this.elements.navigation.settingsButton.click();
        } catch (error) {
            throw new Error(`Failed to open quick tab settings: ${error}`);
        }
    }

    // =================== STOP LIMIT TAB METHODS ===================

    /**
     * Switch to stop limit tab
     */
    async switchToStopLimitTab(): Promise<void> {
        try {
            await this.switchToTab('stopLimit');
            await this.page.waitForTimeout(500);
        } catch (error) {
            throw new Error(`Failed to switch to stop limit tab: ${error}`);
        }
    }

    /**
     * Set trigger price for stop limit order
     */
    async setTriggerPrice(triggerPrice: number): Promise<void> {
        try {
            await FormUtils.fillField(this.elements.stopLimit.triggerPriceInput, triggerPrice);
        } catch (error) {
            throw new Error(`Failed to set trigger price: ${error}`);
        }
    }

    /**
     * Select trigger condition for stop limit order
     */
    async selectTriggerCondition(condition: 'greater_than' | 'less_than'): Promise<void> {
        try {
            const conditionElements = {
                greater_than: this.elements.stopLimit.triggerConditionGreaterThan,
                less_than: this.elements.stopLimit.triggerConditionLessThan,
            };

            const selectedElement = conditionElements[condition];
            await expect(selectedElement).toBeVisible();
            await selectedElement.click();
        } catch (error) {
            throw new Error(`Failed to select trigger condition ${condition}: ${error}`);
        }
    }

    /**
     * Select order type in stop limit tab
     */
    async selectStopLimitOrderType(orderType: 'LO' | 'MTL'): Promise<void> {
        try {
            const orderTypeElements = {
                LO: this.elements.stopLimit.orderTypeLO,
                MTL: this.elements.stopLimit.orderTypeMTL
            };

            const selectedElement = orderTypeElements[orderType];
            await expect(selectedElement).toBeVisible();
            await selectedElement.click();
        } catch (error) {
            throw new Error(`Failed to select order type ${orderType}: ${error}`);
        }
    }

    /**
     * Set order price in stop limit tab
     */
    async setStopLimitOrderPrice(price: number): Promise<void> {
        try {
            await FormUtils.fillField(this.elements.stopLimit.orderPriceInput, price);
        } catch (error) {
            throw new Error(`Failed to set order price: ${error}`);
        }
    }

    /**
     * Adjust order price using increase/decrease buttons
     */
    async adjustStopLimitOrderPrice(direction: 'increase' | 'decrease', times: number = 1): Promise<void> {
        try {
            const button = direction === 'increase'
                ? this.elements.stopLimit.orderPriceIncrease
                : this.elements.stopLimit.orderPriceDecrease;

            for (let i = 0; i < times; i++) {
                await button.click();
                await this.page.waitForTimeout(100);
            }
        } catch (error) {
            throw new Error(`Failed to adjust order price: ${error}`);
        }
    }

    /**
     * Set quantity in stop limit tab
     */
    async setStopLimitQuantity(quantity: number): Promise<void> {
        try {
            await FormUtils.fillField(this.elements.stopLimit.quantityInput, quantity);
        } catch (error) {
            throw new Error(`Failed to set quantity: ${error}`);
        }
    }

    /**
     * Adjust quantity using increase/decrease buttons
     */
    async adjustStopLimitQuantity(direction: 'increase' | 'decrease', times: number = 1): Promise<void> {
        try {
            const button = direction === 'increase'
                ? this.elements.stopLimit.quantityIncrease
                : this.elements.stopLimit.quantityDecrease;

            for (let i = 0; i < times; i++) {
                await button.click();
                await this.page.waitForTimeout(100);
            }
        } catch (error) {
            throw new Error(`Failed to adjust quantity: ${error}`);
        }
    }

    /**
     * Set valid date range for stop limit order
     */
    async setStopLimitValidDate(fromDate?: string, toDate?: string): Promise<void> {
        try {
            if (fromDate) {
                await FormUtils.fillField(this.elements.stopLimit.validFromDateInput, fromDate);
            }
            if (toDate) {
                await FormUtils.fillField(this.elements.stopLimit.validToDateInput, toDate);
            }
        } catch (error) {
            throw new Error(`Failed to set valid date: ${error}`);
        }
    }

    /**
     * Get max long value from stop limit tab
     */
    async getStopLimitMaxLong(): Promise<string> {
        try {
            await this.switchToStopLimitTab();
            const maxLong = await this.elements.stopLimit.maxLongDisplay.textContent() || '0';
            return maxLong;
        } catch (error) {
            throw new Error(`Failed to get max long value: ${error}`);
        }
    }

    /**
     * Place stop limit order
     */
    async placeStopLimitOrder(orderData: StopLimitOrderData): Promise<string> {
        const {
            stockCode,
            quantity,
            price,
            side,
            triggerPrice,
            triggerCondition,
            validFromDate,
            validToDate
        } = orderData;

        try {
            // Switch to stop limit tab
            await this.switchToStopLimitTab();
            if (side === 'long') {
                await this.elements.stopLimit.longSideTab.click();
            } else {
                await this.elements.stopLimit.shortSideTab.click();
            }

            // Set stock code
            const usedStockCode = await this.selectStockCode(stockCode);

            // Set trigger price if provided
            if (triggerPrice) {
                await this.setTriggerPrice(triggerPrice);
            }

            // Select trigger condition if provided (default to greater_than)
            const condition = triggerCondition || 'greater_than';
            await this.selectTriggerCondition(condition);

            // Select order type (default to LO)
            const orderType = typeof price === 'string' && price === 'MTL' ? 'MTL' : 'LO';
            await this.selectStopLimitOrderType(orderType);

            // Set order price if it's a number
            if (typeof price === 'number') {
                await this.setStopLimitOrderPrice(price);
            }

            if (quantity) {
                // Set quantity
                await this.setStopLimitQuantity(quantity);
            }

            // Set valid date range if provided
            if (validFromDate || validToDate) {
                await this.setStopLimitValidDate(validFromDate, validToDate);
            }

            // Submit order
            await this.elements.stopLimit.orderButton.click();

            // Confirm order if confirmation dialog appears
            if (await this.elements.form.confirmOrderButton.isVisible()) {
                await this.elements.form.confirmOrderButton.click();
            }

            return usedStockCode;
        } catch (error) {
            throw new Error(`Failed to place stop limit order: ${error}`);
        }
    }

    // =================== SL/TP TAB METHODS ===================

    /**
     * Switch to SL/TP tab
     */
    async switchToSLTPTab(): Promise<void> {
        try {
            await this.switchToTab('stopTakeProfit');
            await this.page.waitForTimeout(500); // Wait for SL/TP tab to load
        } catch (error) {
            throw new Error(`Failed to switch to SL/TP tab: ${error}`);
        }
    }

    /**
     * Get position information from SL/TP tab
     */
    async getSLTPPositionInfo(): Promise<{
        position: string;
        avgPrice: string;
        quantity: string;
        currentPL: string;
    }> {
        try {
            const position = await this.elements.sltp.positionInfo.positionValue.textContent() || '';
            const avgPrice = await this.elements.sltp.positionInfo.avgPriceValue.textContent() || '';
            const quantity = await this.elements.sltp.positionInfo.quantityValue.textContent() || '';
            const currentPL = await this.elements.sltp.positionInfo.currentPLValue.textContent() || '';

            return { position, avgPrice, quantity, currentPL };
        } catch (error) {
            throw new Error(`Failed to get position info: ${error}`);
        }
    }

    /**
     * Set quantity in SL/TP tab
     */
    async setSLTPQuantity(quantity: number): Promise<void> {
        try {
            await FormUtils.fillField(this.elements.sltp.quantityInput, quantity);
        } catch (error) {
            throw new Error(`Failed to set quantity: ${error}`);
        }
    }

    /**
     * Adjust quantity using increase/decrease buttons in SL/TP tab
     */
    async adjustSLTPQuantity(direction: 'increase' | 'decrease', times: number = 1): Promise<void> {
        try {
            const button = direction === 'increase'
                ? this.elements.sltp.quantityIncrease
                : this.elements.sltp.quantityDecrease;

            for (let i = 0; i < times; i++) {
                await button.click();
                await this.page.waitForTimeout(100);
            }
        } catch (error) {
            throw new Error(`Failed to adjust quantity: ${error}`);
        }
    }

    /**
     * Enable/disable take profit order
     */
    async toggleTakeProfitOrder(type: 'ON' | 'OFF'): Promise<void> {
        try {
            const isChecked = await this.elements.sltp.takeProfitSection.checkbox.isChecked();
            if (isChecked === true && type === 'OFF') {
                await this.elements.sltp.takeProfitSection.checkbox.click();
            } else if (isChecked === false && type === 'ON') {
                await this.elements.sltp.takeProfitSection.checkbox.click();
            }
        } catch (error) {
            throw new Error(`Failed to toggle take profit order: ${error}`);
        }
    }

    /**
     * Set take profit trigger price
     */
    async setTakeProfitTriggerPrice(price: number): Promise<void> {
        try {
            await FormUtils.fillField(this.elements.sltp.takeProfitSection.triggerPriceInput, price);
        } catch (error) {
            throw new Error(`Failed to set take profit trigger price: ${error}`);
        }
    }

    /**
     * Adjust take profit trigger price using increase/decrease buttons
     */
    async adjustTakeProfitTriggerPrice(direction: 'increase' | 'decrease', times: number = 1): Promise<void> {
        try {
            const button = direction === 'increase'
                ? this.elements.sltp.takeProfitSection.triggerPriceIncrease
                : this.elements.sltp.takeProfitSection.triggerPriceDecrease;

            for (let i = 0; i < times; i++) {
                await button.click();
                await this.page.waitForTimeout(100);
            }
        } catch (error) {
            throw new Error(`Failed to adjust take profit trigger price: ${error}`);
        }
    }

    /**
     * Set take profit order price
     */
    async setTakeProfitOrderPrice(price: number): Promise<void> {
        try {
            await FormUtils.fillField(this.elements.sltp.takeProfitSection.orderPriceInput, price);
        } catch (error) {
            throw new Error(`Failed to set take profit order price: ${error}`);
        }
    }

    /**
     * Select take profit order type
     */
    async selectTakeProfitOrderType(orderType: 'LO' | 'MTL'): Promise<void> {
        try {
            const orderTypeElements = {
                LO: this.elements.sltp.takeProfitSection.orderTypeLO,
                MTL: this.elements.sltp.takeProfitSection.orderTypeMTL
            };

            const selectedElement = orderTypeElements[orderType];
            await expect(selectedElement).toBeVisible();
            await selectedElement.click();
        } catch (error) {
            throw new Error(`Failed to select take profit order type ${orderType}: ${error}`);
        }
    }

    /**
     * Enable/disable stop loss order
     */
    async toggleStopLossOrder(type: 'ON' | 'OFF'): Promise<void> {
        try {
            const isChecked = await this.elements.sltp.stopLossSection.checkbox.isChecked();
            if (isChecked === true && type === 'OFF') {
                await this.elements.sltp.stopLossSection.checkbox.click();
            } else if (isChecked === false && type === 'ON') {
                await this.elements.sltp.stopLossSection.checkbox.click();
            }
        } catch (error) {
            throw new Error(`Failed to toggle stop loss order: ${error}`);
        }
    }

    /**
     * Set stop loss trigger price
     */
    async setStopLossTriggerPrice(price: number): Promise<void> {
        try {
            await FormUtils.fillField(this.elements.sltp.stopLossSection.triggerPriceInput, price);
        } catch (error) {
            throw new Error(`Failed to set stop loss trigger price: ${error}`);
        }
    }

    /**
     * Adjust stop loss trigger price using increase/decrease buttons
     */
    async adjustStopLossTriggerPrice(direction: 'increase' | 'decrease', times: number = 1): Promise<void> {
        try {
            const button = direction === 'increase'
                ? this.elements.sltp.stopLossSection.triggerPriceIncrease
                : this.elements.sltp.stopLossSection.triggerPriceDecrease;

            for (let i = 0; i < times; i++) {
                await button.click();
                await this.page.waitForTimeout(100);
            }
        } catch (error) {
            throw new Error(`Failed to adjust stop loss trigger price: ${error}`);
        }
    }

    /**
     * Set stop loss order price
     */
    async setStopLossOrderPrice(price: number): Promise<void> {
        try {
            await FormUtils.fillField(this.elements.sltp.stopLossSection.orderPriceInput, price);
        } catch (error) {
            throw new Error(`Failed to set stop loss order price: ${error}`);
        }
    }

    /**
     * Select stop loss order type
     */
    async selectStopLossOrderType(orderType: 'LO' | 'MTL'): Promise<void> {
        try {
            const orderTypeElements = {
                LO: this.elements.sltp.stopLossSection.orderTypeLO,
                MTL: this.elements.sltp.stopLossSection.orderTypeMTL
            };

            const selectedElement = orderTypeElements[orderType];
            await expect(selectedElement).toBeVisible();
            await selectedElement.click();
        } catch (error) {
            throw new Error(`Failed to select stop loss order type ${orderType}: ${error}`);
        }
    }

    /**
     * Set valid date range for SL/TP order
     */
    async setSLTPValidDate(fromDate?: string, toDate?: string): Promise<void> {
        try {
            if (fromDate) {
                await FormUtils.fillField(this.elements.sltp.validFromDateInput, fromDate);
            }
            if (toDate) {
                await FormUtils.fillField(this.elements.sltp.validToDateInput, toDate);
            }
        } catch (error) {
            throw new Error(`Failed to set valid date: ${error}`);
        }
    }

    /**
     * Get estimated profit/loss values
     */
    async getSLTPEstimatedValues(): Promise<{
        estimatedProfit: string;
        estimatedLoss: string;
    }> {
        try {
            await this.switchToSLTPTab();

            const estimatedProfit = await this.elements.sltp.takeProfitSection.estProfitDisplay.textContent() || '0 (0%)';
            const estimatedLoss = await this.elements.sltp.stopLossSection.estLossDisplay.textContent() || '0 (0%)';

            return { estimatedProfit, estimatedLoss };
        } catch (error) {
            throw new Error(`Failed to get estimated values: ${error}`);
        }
    }

    /**
     * Place SL/TP order
     */
    async placeSLTPOrder(orderData: SLTPOrderData): Promise<string> {
        const {
            stockCode,
            quantity,
            side,
            takeProfitOrder,
            stopLossOrder,
            validFromDate,
            validToDate
        } = orderData;

        try {
            // Switch to SL/TP tab
            await this.switchToSLTPTab();

            // Set stock code
            const usedStockCode = await this.selectStockCode(stockCode);

            // Set quantity
            await this.setSLTPQuantity(quantity);

            // Configure take profit order if provided
            if (takeProfitOrder) {

                if (takeProfitOrder.type === 'ON') {
                    await this.toggleTakeProfitOrder('ON');
                    if (takeProfitOrder.triggerPrice) {
                        await this.setTakeProfitTriggerPrice(takeProfitOrder.triggerPrice);
                    }

                    if (takeProfitOrder.orderType) {
                        await this.selectTakeProfitOrderType(takeProfitOrder.orderType);
                    }

                    if (takeProfitOrder.orderPrice && takeProfitOrder.orderType !== 'MTL') {
                        await this.setTakeProfitOrderPrice(takeProfitOrder.orderPrice);
                    }

                }
            } else {
                await this.toggleTakeProfitOrder('OFF');
            }

            // Configure stop loss order if provided
            if (stopLossOrder) {
                if (stopLossOrder.type === 'ON') {
                    await this.toggleStopLossOrder('ON');
                    if (stopLossOrder.triggerPrice) {
                        await this.setStopLossTriggerPrice(stopLossOrder.triggerPrice);
                    }

                    if (stopLossOrder.orderType) {
                        await this.selectStopLossOrderType(stopLossOrder.orderType);
                    }

                    if (stopLossOrder.orderPrice && stopLossOrder.orderType !== 'MTL') {
                        await this.setStopLossOrderPrice(stopLossOrder.orderPrice);
                    }
                }
            } else {
                await this.toggleStopLossOrder('OFF');
            }

            // Set valid date range if provided
            if (validFromDate || validToDate) {
                await this.setSLTPValidDate(validFromDate, validToDate);
            }

            // Submit order
            await this.elements.sltp.orderButton.click();

            // Confirm order if confirmation dialog appears
            if (await this.elements.form.confirmOrderButton.isVisible()) {
                await this.elements.form.confirmOrderButton.click();
            }

            return usedStockCode;
        } catch (error) {
            throw new Error(`Failed to place SL/TP order: ${error}`);
        }
    }

}

export default DerivativePage;