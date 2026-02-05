import { Page, Locator } from '@playwright/test';
import BasePage from './BasePage';
import { FormUtils, TableUtils } from '../../helpers/uiUtils';
import Menu from './Menu';
import MatrixPage from './MatrixPage';
import { NumberValidator } from '../../helpers/validationUtils';
import OrderPage from './OrderPage';


export interface TransferStockRow {
    stockCode: string;
    holdingQty: number;
    maxQty: number;
}

export interface TransferStockHistoryRow {
    source: string;
    destination: string;
    stockCode: string;
    quantity: number;
    content: string;
    status: string;
    createdDate: string;
}

class TransferStockPage extends BasePage {
    readonly menu: Menu;
    readonly matrixPage: MatrixPage;
    readonly numberValidator: NumberValidator;
    readonly orderPage: OrderPage;
    readonly container: Locator;
    readonly title: Locator;
    readonly sourceSection: Locator;
    readonly destinationSection: Locator;
    readonly sourceSelectControl: Locator;
    readonly destinationSelectControl: Locator;
    readonly sourceSelectValue: Locator;
    readonly destinationSelectValue: Locator;
    readonly selectOptions: Locator;
    readonly sourceTable: Locator;
    readonly sourceRows: Locator;
    readonly destinationTable: Locator;
    readonly destinationRows: Locator;

    readonly transferButton: Locator;
    readonly historySection: Locator;
    readonly historyTable: Locator;
    readonly historyHeaders: Locator;
    readonly historyRows: Locator;

    constructor(page: Page) {
        super(page);
        this.menu = new Menu(page);
        this.matrixPage = new MatrixPage(page);
        this.numberValidator = new NumberValidator();
        this.orderPage = new OrderPage(page);

        this.container = page.locator('.transaction-content .personal-assets');
        this.title = this.container.locator('.text-title', { hasText: 'Chuyển cổ phiếu' });
        this.sourceSection = this.container.locator('.stock-internal-transfer .sit__left');
        this.destinationSection = this.container.locator('.stock-internal-transfer .sit__right');
        this.sourceSelectControl = this.sourceSection.locator('.filter-control-select__control');
        this.destinationSelectControl = this.destinationSection.locator('.filter-control-select__control');
        this.sourceSelectValue = this.sourceSection.locator('.filter-control-select__single-value');
        this.destinationSelectValue = this.destinationSection.locator('.filter-control-select__single-value');
        this.selectOptions = page.locator('.filter-control-select__option');

        this.sourceTable = this.sourceSection.locator('table.table');
        this.sourceRows = this.sourceTable.locator('tbody tr');
        this.destinationTable = this.destinationSection.locator('table.table');
        this.destinationRows = this.destinationTable.locator('tbody tr');

        this.transferButton = this.sourceSection.locator('.sit-footer button').last();
        this.historySection = this.container.locator('.stock-internal-transfer-history');

        this.historyTable = this.historySection.locator('table.table');
        this.historyHeaders = this.historyTable.locator('thead th');
        this.historyRows = this.historyTable.locator('tbody tr');
    }

    async navigateToTransferStock(): Promise<void> {
        await this.menu.openMenuHeader('Tiện ích');
        await this.menu.openSubMenu('Tiện ích', 'Chuyển cổ phiếu');
        await this.container.waitFor({ state: 'visible', timeout: 10000 });
        await this.title.waitFor({ state: 'visible', timeout: 10000 });
    }

    async getTitle(): Promise<string> {
        await this.title.waitFor({ state: 'visible', timeout: 10000 });
        const title = await this.title.textContent() || '';
        return title?.trim() || '';
    }

    async selectAccount(control: Locator, accountLabel: string): Promise<void> {
        await this.ensureVisible(control);
        await this.safeClick(control);
        const option = this.selectOptions.filter({ hasText: accountLabel }).first();
        await this.safeClick(option);
    }

    async selectSourceAccount(accountLabel: string): Promise<void> {
        await this.selectAccount(this.sourceSelectControl, accountLabel);
    }

    async selectDestinationAccount(accountLabel: string): Promise<void> {
        await this.selectAccount(this.destinationSelectControl, accountLabel);
    }

    async getSourceAccountValue(): Promise<string> {
        return (await this.sourceSelectValue.textContent())?.trim() || '';
    }

    async getDestinationAccountValue(): Promise<string> {
        return (await this.destinationSelectValue.textContent())?.trim() || '';
    }


    private async getHeaderSourceStat(section: Locator, label: string): Promise<string> {
        const container = section.locator('.sit-keyvalue').filter({ hasText: label });

        const value = await container.locator('span').nth(1).textContent();

        return value?.trim() || '';
    }

    async getSourceHoldingStats(): Promise<{ stockCount: string; totalQty: string }> {
        const stockCount = await this.getHeaderSourceStat(this.sourceSection, 'Mã CP nắm giữ');
        const totalQty = await this.getHeaderSourceStat(this.sourceSection, 'KL nắm giữ');
        return { stockCount, totalQty };
    }

    async getSourceRowCount(): Promise<number> {
        await this.sourceTable.waitFor({ state: 'visible' });
        return await this.sourceRows.count();
    }

    async getSourceRowData(rowIndex: number): Promise<TransferStockRow> {
        const row = this.sourceRows.nth(rowIndex);
        await row.waitFor({ state: 'visible' });
        const stockCode = await row.locator('td:nth-child(3)').textContent() || '';
        const holdingQty = await row.locator('td:nth-child(4)').textContent() || '';
        const maxQty = await row.locator('td:nth-child(5)').textContent() || '';
        return {
            stockCode: stockCode.trim(),
            holdingQty: NumberValidator.parseNumber(holdingQty.trim()),
            maxQty: NumberValidator.parseNumber(maxQty.trim()),
        };
    }

    async getDestinationRowCount(): Promise<number> {
        await this.destinationTable.waitFor({ state: 'visible' });
        return await this.destinationRows.count();
    }

    async getDestinationRowData(rowIndex: number): Promise<any> {
        const row = this.destinationRows.nth(rowIndex);
        await row.waitFor({ state: 'visible' });
        const stockCode = await row.locator('td:nth-child(2)').textContent() || '';
        const holdingQty = await row.locator('td:nth-child(3)').textContent() || '';
        return {
            stockCode: stockCode.trim(),
            holdingQty: holdingQty.trim(),
        }
    }


    async clickMaxButtonRow(rowIndex: number): Promise<void> {
        const row = this.sourceRows.nth(rowIndex);
        await this.ensureVisible(row);
        await this.safeClick(row.locator('.sit-input__overlay'));
    }

    async fillTransferQuantity(rowIndex: number, quantity: number | string): Promise<void> {
        const row = this.sourceRows.nth(rowIndex);
        const input = row.locator('input[placeholder="Nhập KL"]');
        await FormUtils.fillTextBox(input, quantity);
    }

    async submitTransferStock(): Promise<void> {
        await this.safeClick(this.transferButton);
    }

    async transferStock(rowIndex: number, quantity: number): Promise<void> {
        await this.fillTransferQuantity(rowIndex, quantity);
        await this.submitTransferStock();
        if (await this.matrixPage.isMatrixVisible()) {
            await this.matrixPage.enterMatrixValid();
            await this.page.waitForTimeout(3000);
            await this.orderPage.closeAllToastMessages();
            await this.submitTransferStock();
        }
    }

    async transferMaxStock(rowIndex: number): Promise<void> {
        await this.clickMaxButtonRow(rowIndex);
        await this.submitTransferStock();
        if (await this.matrixPage.isMatrixVisible()) {
            await this.matrixPage.enterMatrixValid();
            await this.page.waitForTimeout(3000);
            await this.orderPage.closeAllToastMessages();
            await this.submitTransferStock();
        }
    }

    async getHistoryTableHeaders(): Promise<string[]> {
        return TableUtils.getTableHeaders(this.historyHeaders);
    }

    async getHistoryRowCount(): Promise<number> {
        await this.historyTable.waitFor({ state: 'visible' });
        return await this.historyRows.count();
    }

    async getHistoryRowData(rowIndex: number): Promise<TransferStockHistoryRow> {
        const row = this.historyRows.nth(rowIndex);
        await row.waitFor({ state: 'visible' });
        const source = await row.locator('td:nth-child(1)').textContent() || '';
        const destination = await row.locator('td:nth-child(2)').textContent() || '';
        const stockCode = await row.locator('td:nth-child(3)').textContent() || '';
        const quantity = await row.locator('td:nth-child(4)').textContent() || '';
        const content = await row.locator('td:nth-child(5)').textContent() || '';
        const status = await row.locator('td:nth-child(6)').textContent() || '';
        const createdDate = await row.locator('td:nth-child(7)').textContent() || '';

        return {
            source: source.trim(),
            destination: destination.trim(),
            stockCode: stockCode.trim(),
            quantity: NumberValidator.parseNumber(quantity.trim()),
            content: content.trim(),
            status: status.trim(),
            createdDate: createdDate.trim(),
        };
    }
}

export default TransferStockPage;
