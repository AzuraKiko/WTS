import { Page, Locator } from '@playwright/test';
import BasePage from './BasePage';
import { ScrollUtils, TableUtils } from '../../helpers/uiUtils';
import { NumberValidator, StockCodeValidator } from '../../helpers/validationUtils';

// Interface definitions for better type safety
interface PortfolioRowData {
    stockCode: string;
    transaction: string;
    quantity: string;
    avgPrice: string;
    currentPrice: string;
    percentage: string;
    painLoss: string;
}

interface PortfolioRowDataWithIndex extends PortfolioRowData {
    rowIndex: number;
}

interface PortfolioTotalData {
    totalAmount: string;
    totalPercentage: string;
    totalPainLoss: string;
}

class PortfolioPage extends BasePage {
    private static readonly DEFAULT_TIMEOUT = 2000;
    private static readonly SCROLL_TIMEOUT = 1000;
    private static readonly MAX_SCROLL_ATTEMPTS = 50;

    // Portfolio Elements
    portfolioTab!: Locator;
    portfolioTable!: Locator;
    portfolioTableHeaders!: Locator;
    portfolioTableRows!: Locator;
    portfolioTableHeaderRow!: Locator;
    portfolioTableBody!: Locator;
    portfolioTableTotalRow!: Locator;
    portfolioTableScrollContainer!: Locator;
    portfolioTableToggleLeft!: Locator;
    portfolioTableToggleRight!: Locator;


    // Constants
    private static readonly EXPECTED_HEADERS = ['Mã CK', 'GD', 'KL', 'Giá TB', 'Giá TT', '%'];
    private static readonly EXTENDED_EXPECTED_HEADERS = ['Mã CK', 'GD', 'KL', 'Giá TB', 'Giá TT', 'Lãi/lỗ'];

    constructor(page: Page) {
        super(page);
        this.initializeLocators(page);
    }

    /**
     * Initialize all locators in one place
     */
    private initializeLocators(page: Page): void {
        // Portfolio Elements
        this.portfolioTab = page.locator('.asset-panel .card-panel-header__title:nth-child(2)');
        this.portfolioTable = page.locator('.card-panel-body.position-relative');
        this.portfolioTableHeaderRow = page.locator('.card-panel-body .table thead tr');
        this.portfolioTableHeaders = page.locator('.card-panel-body .table thead tr th');
        this.portfolioTableRows = page.locator('.card-panel-body .table tbody tr');
        this.portfolioTableBody = page.locator('.card-panel-body .scrollbar-container .table tbody');
        this.portfolioTableTotalRow = page.locator('.card-panel-body .table.position-absolute tbody tr');
        this.portfolioTableScrollContainer = page.locator('.card-panel-body .scrollbar-container');
        this.portfolioTableToggleLeft = page.locator('.tbl-toggle-left.toggle-color--light3');
        this.portfolioTableToggleRight = page.locator('.tbl-toggle-right.toggle-color--light3');
    }

    // =================== NAVIGATION METHODS ===================

    /**
     * Navigate to Portfolio tab
     */
    async navigateToPortfolio(): Promise<void> {
        await this.safeClick(this.portfolioTab);
        await this.page.waitForTimeout(PortfolioPage.DEFAULT_TIMEOUT);
    }

    // =================== DATA RETRIEVAL METHODS ===================

    /**
     * Get Portfolio table headers
     */
    async getPortfolioTableHeaders(): Promise<string[]> {
        return await TableUtils.getTableHeaders(this.portfolioTableHeaders);
    }

    /**
     * Get Portfolio table data for a specific row
     */
    async getPortfolioRowData(rowIndex: number): Promise<PortfolioRowData> {
        const row = this.portfolioTableRows.nth(rowIndex);
        await row.waitFor({ state: 'visible' });

        const stockCode = await row.locator('td:nth-child(1)').textContent() || '';
        const transaction = await row.locator('td:nth-child(2)').textContent() || '';
        const quantity = await row.locator('td:nth-child(3)').textContent() || '';
        const avgPrice = await row.locator('td:nth-child(4)').textContent() || '';
        const currentPrice = await row.locator('td:nth-child(5)').textContent() || '';
        const percentage = await row.locator('td:nth-child(6)').textContent() || '';

        await this.safeClick(this.portfolioTableToggleRight);
        const painLoss = await row.locator('td:nth-child(6)').textContent() || '';
        await this.safeClick(this.portfolioTableToggleRight);

        return {
            stockCode: stockCode.trim(),
            transaction: transaction.trim(),
            quantity: quantity.trim(),
            avgPrice: avgPrice.trim(),
            currentPrice: currentPrice.trim(),
            percentage: percentage.trim(),
            painLoss: painLoss.trim()
        };
    }

    /**
     * Get all Portfolio table data (with auto-scrolling to load all data)
     */
    async getAllPortfolioData(useScrolling: boolean = true): Promise<PortfolioRowData[]> {
        await this.portfolioTableRows.first().waitFor({ state: 'visible' });
        return await TableUtils.getAllTableData(this.page, this.portfolioTableRows, this.portfolioTableScrollContainer, this.getPortfolioRowData, useScrolling);
    }

    /**
     * Get Portfolio table total row data
     */
    async getPortfolioTotalData(): Promise<PortfolioTotalData> {
        await this.portfolioTableTotalRow.waitFor({ state: 'visible' });

        const totalAmountElement = this.portfolioTableTotalRow.locator('.position-absolute.fw-500.text--light');
        const totalPercentageElement = this.portfolioTableTotalRow.locator('td:nth-child(6)');

        const totalAmount = await totalAmountElement.textContent() || '';
        const totalPercentage = await totalPercentageElement.textContent() || '';
        await this.safeClick(this.portfolioTableToggleLeft);
        const totalPainLoss = await totalPercentageElement.textContent() || '';
        await this.safeClick(this.portfolioTableToggleRight);

        return {
            totalAmount: totalAmount.trim(),
            totalPercentage: totalPercentage.trim(),
            totalPainLoss: totalPainLoss.trim()
        };
    }

    /**
     * Get total count of Portfolio items (with scrolling)
     */
    async getPortfolioItemCount(withScrolling: boolean = true): Promise<number> {
        if (!withScrolling) {
            try {
                await this.portfolioTableRows.first().waitFor({ state: 'visible' });
                return await this.portfolioTableRows.count();
            } catch (error) {
                return 0;
            }
        }

        const allData = await this.getAllPortfolioData();
        return allData.length;
    }

    // =================== SEARCH AND FIND METHODS ===================

    /**
     * Find Portfolio row by stock code (returns row data if found)
     */
    async findPortfolioRowByStockCode(stockCode: string): Promise<PortfolioRowDataWithIndex | null> {
        try {
            await this.portfolioTableRows.first().waitFor({ state: 'visible' });

            const result = await TableUtils.findRowWithScrolling(
                this.page,
                this.portfolioTableRows,
                this.portfolioTableScrollContainer,
                this.getPortfolioRowData,
                rowData => rowData.stockCode === stockCode
            );

            return result ? { ...result.data, rowIndex: result.index } : null;
        } catch (error) {
            console.error(`Error finding portfolio row by stock code: ${error}`);
            return null;
        }
    }

    // =================== INTERACTION METHODS ===================

    /**
     * Click on a specific Portfolio table row
     */

    async clickPortfolioRow(rowIndex: number): Promise<void> {
        await TableUtils.clickTableRow(this.portfolioTableRows, rowIndex);
    }


    async doubleClickPortfolioRow(rowIndex: number): Promise<void> {
        const row = this.portfolioTableRows.nth(rowIndex);
        await row.waitFor({ state: 'visible' });
        await row.dblclick();
    }

    /**
     * Click on a Portfolio row by stock code (with scrolling search)
     */
    async clickPortfolioRowByStockCode(stockCode: string, searchWithScroll: boolean = true): Promise<void> {
        if (!searchWithScroll) {
            const rows = this.portfolioTableRows;
            const rowCount = await rows.count();

            for (let i = 0; i < rowCount; i++) {
                const row = rows.nth(i);
                const cellStockCode = await row.locator('td:nth-child(1)').textContent();
                if (cellStockCode?.trim() === stockCode) {
                    await row.dblclick();
                    return;
                }
            }
            throw new Error(`Stock code ${stockCode} not found in portfolio table`);
        }

        await this.portfolioTableRows.first().waitFor({ state: 'visible' });
        await this.scrollPortfolioTableToTop();

        let found = false;
        let canScrollMore = true;
        let scrollAttempts = 0;

        while (!found && canScrollMore && scrollAttempts < PortfolioPage.MAX_SCROLL_ATTEMPTS) {
            const rowCount = await this.portfolioTableRows.count();

            for (let i = 0; i < rowCount; i++) {
                try {
                    const row = this.portfolioTableRows.nth(i);
                    const cellStockCode = await row.locator('td:nth-child(1)').textContent();
                    if (cellStockCode?.trim() === stockCode) {
                        await row.dblclick();
                        found = true;
                        return;
                    }
                } catch (error) {
                    continue;
                }
            }

            canScrollMore = await this.canScrollPortfolioTableDown();
            if (canScrollMore) {
                const scrolled = await this.scrollPortfolioTablePageDown();
                if (!scrolled) break;
                await this.page.waitForTimeout(PortfolioPage.SCROLL_TIMEOUT);
            }

            scrollAttempts++;
        }

        if (!found) {
            throw new Error(`Stock code ${stockCode} not found in portfolio table after scrolling`);
        }
    }

    async clickPorfolioRowByQuantity(minQuantity: number = 1): Promise<void> {
        const rows = await this.portfolioTableRows.all();

        for (const row of rows) {
            const quantityText = await row.locator('td:nth-child(2)').innerText();
            const quantity = parseInt(quantityText.replace(/,/g, ''), 10);

            if (quantity >= minQuantity) {
                await row.dblclick();
                await this.page.waitForTimeout(PortfolioPage.SCROLL_TIMEOUT);
                break;
            }
        }
    }

    /**
     * Toggle Portfolio table percentage column view
     */
    async togglePortfolioPercentageView(direction: 'left' | 'right'): Promise<void> {
        const toggleButton = direction === 'left' ? this.portfolioTableToggleLeft : this.portfolioTableToggleRight;
        await toggleButton.waitFor({ state: 'visible' });
        await this.safeClick(toggleButton);
        await this.page.waitForTimeout(PortfolioPage.SCROLL_TIMEOUT);
    }


    // =================== VALIDATION METHODS ===================

    /**
     * Validate Portfolio table structure and headers
     */
    async validatePortfolioTableStructure(): Promise<boolean> {
        try {
            await this.portfolioTable.waitFor({ state: 'visible', timeout: 5000 });

            const headers = await this.getPortfolioTableHeaders();
            if (headers.length !== PortfolioPage.EXPECTED_HEADERS.length) {
                console.log(`Expected ${PortfolioPage.EXPECTED_HEADERS.length} headers, found ${headers.length}`);
                return false;
            }

            for (let i = 0; i < PortfolioPage.EXPECTED_HEADERS.length; i++) {
                if (!headers[i].includes(PortfolioPage.EXPECTED_HEADERS[i])) {
                    console.log(`Header mismatch at index ${i}: expected "${PortfolioPage.EXPECTED_HEADERS[i]}", found "${headers[i]}"`);
                    return false;
                }
            }

            await this.portfolioTableToggleLeft.waitFor({ state: 'visible' });
            await this.portfolioTableToggleRight.waitFor({ state: 'visible' });

            await this.safeClick(this.portfolioTableToggleRight);
            await this.page.waitForTimeout(PortfolioPage.SCROLL_TIMEOUT);

            const newHeaders = await this.getPortfolioTableHeaders();
            if (newHeaders.length !== PortfolioPage.EXTENDED_EXPECTED_HEADERS.length) {
                console.log(`Expected ${PortfolioPage.EXTENDED_EXPECTED_HEADERS.length} headers, found ${newHeaders.length}`);
                return false;
            }

            for (let i = 0; i < PortfolioPage.EXTENDED_EXPECTED_HEADERS.length; i++) {
                if (!newHeaders[i].includes(PortfolioPage.EXTENDED_EXPECTED_HEADERS[i])) {
                    console.log(`Header mismatch at index ${i}: expected "${PortfolioPage.EXTENDED_EXPECTED_HEADERS[i]}", found "${newHeaders[i]}"`);
                    return false;
                }
            }

            await this.safeClick(this.portfolioTableToggleRight);
            return true;
        } catch (error) {
            console.log(`Portfolio table validation failed: ${error}`);
            return false;
        }
    }

    /**
     * Validate Portfolio row data format
     */
    async validatePortfolioRowDataFormat(rowIndex: number): Promise<boolean> {
        try {
            const rowData = await this.getPortfolioRowData(rowIndex);

            if (!StockCodeValidator.validate(rowData.stockCode)) return false;
            if (!NumberValidator.validateQuantity(rowData.quantity, 'quantity')) return false;
            if (!NumberValidator.validatePrice(rowData.avgPrice, 'average price')) return false;
            if (!NumberValidator.validatePrice(rowData.currentPrice, 'current price')) return false;
            if (!NumberValidator.validatePercentageFormat(rowData.percentage)) return false;

            // Check extended fields
            await this.safeClick(this.portfolioTableToggleRight);
            await this.page.waitForTimeout(PortfolioPage.SCROLL_TIMEOUT);

            const painLoss = await this.portfolioTableRows.nth(rowIndex).locator('td:nth-child(6)').textContent();
            if (painLoss && painLoss.trim() !== '') {
                const painLossPattern = /^-?(\d{1,3}(,\d{3})*(\.\d+)?|\d+(\.\d+)?)$/;
                if (!painLossPattern.test(painLoss.trim())) {
                    console.log(`Invalid Pain/Loss format: ${painLoss}`);
                    await this.safeClick(this.portfolioTableToggleRight);
                    return false;
                }
            }

            await this.safeClick(this.portfolioTableToggleRight);
            return true;
        } catch (error) {
            console.log(`Portfolio row data validation failed: ${error}`);
            return false;
        }
    }

    /**
     * Validate all Portfolio table data
     */
    async validateAllPortfolioData(): Promise<boolean> {
        try {
            const rowCount = await this.portfolioTableRows.count();

            if (rowCount === 0) {
                console.log('No portfolio data found');
                return false;
            }

            for (let i = 0; i < rowCount; i++) {
                const isValid = await this.validatePortfolioRowDataFormat(i);
                if (!isValid) {
                    console.log(`Portfolio row ${i} validation failed`);
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.log(`Portfolio data validation failed: ${error}`);
            return false;
        }
    }

    async verifyNoDataMessage(): Promise<boolean> {
        const message = this.portfolioTable.locator('.card-panel-body .table.table-bordered.border-top-0 .text-center');
        return await TableUtils.verifyNoDataMessage(message);
    }

    /**
     * Verify Portfolio table total calculation and format
     */
    async verifyPortfolioTotalCalculation(): Promise<boolean> {
        try {
            const allData = await this.getAllPortfolioData();
            const totalData = await this.getPortfolioTotalData();

            if (!NumberValidator.validateNumberFormat(totalData.totalAmount, 'total amount')) return false;
            if (!NumberValidator.validatePercentageFormat(totalData.totalPercentage)) return false;
            if (!NumberValidator.validateNumberFormat(totalData.totalPainLoss, 'total pain loss')) return false;

            let expectedTotalAmount = 0;
            let expectedTotalPercentage = 0;
            let expectedTotalPainLoss = 0;

            for (const row of allData) {
                if (!NumberValidator.validateNumberFormat(row.quantity, `quantity for ${row.stockCode}`)) return false;
                if (!NumberValidator.validateNumberFormat(row.currentPrice, `current price for ${row.stockCode}`)) return false;
                if (!NumberValidator.validatePercentageFormat(row.percentage)) return false;
                if (!NumberValidator.validateNumberFormat(row.painLoss, 'pain loss')) return false;

                const quantity = NumberValidator.parseNumberWithCommas(row.quantity);
                const currentPrice = NumberValidator.parseNumberWithCommas(row.currentPrice);
                expectedTotalAmount += quantity * currentPrice;
                expectedTotalPercentage += NumberValidator.parseNumberWithCommas(row.percentage);
                expectedTotalPainLoss += NumberValidator.parseNumberWithCommas(row.painLoss);
            }

            const actualTotalAmount = NumberValidator.parseNumberWithCommas(totalData.totalAmount);
            const actualTotalPercentage = NumberValidator.parseNumberWithCommas(totalData.totalPercentage);
            const actualTotalPainLoss = NumberValidator.parseNumberWithCommas(totalData.totalPainLoss);

            if (actualTotalAmount !== expectedTotalAmount || actualTotalPercentage !== expectedTotalPercentage || actualTotalPainLoss !== expectedTotalPainLoss) {
                console.log(`Total calculation mismatch: expected ${expectedTotalAmount}, actual ${actualTotalAmount}, expected ${expectedTotalPercentage}, actual ${actualTotalPercentage}, expected ${expectedTotalPainLoss}, actual ${actualTotalPainLoss}`);
                return false;
            }

            return true;
        } catch (error) {
            console.log(`Portfolio total calculation verification failed: ${error}`);
            return false;
        }
    }


    // =================== SCROLL METHODS ===================

    /**
     * Scroll portfolio table to top
     */
    private async scrollPortfolioTableToTop(): Promise<void> {
        await ScrollUtils.scrollToTop(this.page, this.portfolioTableScrollContainer);
    }

    /**
     * Check if portfolio table can scroll down
     */
    private async canScrollPortfolioTableDown(): Promise<boolean> {
        return await ScrollUtils.canScrollDown(this.portfolioTableScrollContainer);
    }

    /**
     * Scroll portfolio table down by one page
     */
    private async scrollPortfolioTablePageDown(): Promise<boolean> {
        return await ScrollUtils.scrollPageDown(this.page, this.portfolioTableScrollContainer);
    }
}

export default PortfolioPage;