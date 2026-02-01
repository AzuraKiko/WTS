import { Page, Locator } from '@playwright/test';
import BasePage from './BasePage';
import { FormUtils, TableUtils } from '../../helpers/uiUtils';
import Menu from './Menu';
import MatrixPage from './MatrixPage';
import { NumberValidator } from '../../helpers/validationUtils';
import OrderPage from './OrderPage';

interface TransferCashAccountInfo {
    balance: string;
    withdrawable: string;
}

export interface TransferCashHistoryRow {
    source: string;
    destination: string;
    amount: number;
    fee: number;
    content: string;
    createdDate: string;
    status: string;
}

class TransferCashPage extends BasePage {
    readonly menu: Menu;
    readonly matrixPage: MatrixPage;
    readonly numberValidator: NumberValidator;
    readonly orderPage: OrderPage;
    readonly container: Locator;
    readonly title: Locator;
    readonly sourceAccountSection: Locator;
    readonly destinationAccountSection: Locator;
    readonly sourceSelectControl: Locator;
    readonly destinationSelectControl: Locator;
    readonly sourceSelectValue: Locator;
    readonly destinationSelectValue: Locator;
    readonly selectOptions: Locator;
    readonly transferContentInput: Locator;
    readonly transferAmountInput: Locator;
    readonly transferButton: Locator;
    readonly historySection: Locator;
    readonly historyTable: Locator;
    readonly historyHeaders: Locator;
    readonly historyRows: Locator;

    constructor(page: Page) {
        super(page);
        this.menu = new Menu(page);
        this.matrixPage = new MatrixPage(page);
        this.orderPage = new OrderPage(page);
        this.numberValidator = new NumberValidator();
        this.container = page.locator('.personal-assets');
        this.title = this.container.locator('.text-title', { hasText: 'Chuyển tiền tiểu khoản' });
        this.sourceAccountSection = this.container.locator('.cash-transfer-account .account-detail').nth(0);
        this.destinationAccountSection = this.container.locator('.cash-transfer-account .account-detail').nth(1);
        this.sourceSelectControl = this.sourceAccountSection.locator('.filter-control-select__control');
        this.destinationSelectControl = this.destinationAccountSection.locator('.filter-control-select__control');
        this.sourceSelectValue = this.sourceAccountSection.locator('.filter-control-select__single-value');
        this.destinationSelectValue = this.destinationAccountSection.locator('.filter-control-select__single-value');
        this.selectOptions = this.container.locator('.filter-control-select__option');
        this.transferContentInput = this.container.locator('textarea[name="content"]');
        this.transferAmountInput = this.container.locator('input[name="amount"]');
        this.transferButton = this.container.locator('.transfer-amount-button button');
        this.historySection = this.container.locator('.cashTransfer-history');
        this.historyTable = this.historySection.locator('table.table');
        this.historyHeaders = this.historyTable.locator('thead th');
        this.historyRows = this.historyTable.locator('tbody tr');
    }

    async navigateToTransferCash(): Promise<void> {
        await this.menu.openMenuHeader('Tiện ích');
        await this.menu.openSubMenu('Tiện ích', 'Chuyển tiền giữa các tiểu khoản');
        await this.container.waitFor({ state: 'visible', timeout: 10000 });
        await this.title.waitFor({ state: 'visible', timeout: 10000 });
    }

    async getTitle(): Promise<string> {
        await this.title.waitFor({ state: 'visible', timeout: 10000 });
        const title = await this.title.textContent() || '';
        return title?.trim() || '';
    }

    async getAccountValue(section: Locator, label: string): Promise<string> {
        const row = section.locator('.row', { hasText: label });
        await row.waitFor({ state: 'visible' });
        const value = await row.locator('span').nth(1).textContent();
        return value?.trim() || '';
    }

    async selectAccount(control: Locator, accountLabel: string): Promise<void> {
        await control.scrollIntoViewIfNeeded();
        await control.click();
        const option = this.selectOptions.filter({ hasText: accountLabel }).first();
        await option.waitFor({ state: 'visible', timeout: 10000 });
        await option.click();
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

    async getSourceAccountInfo(): Promise<TransferCashAccountInfo> {
        const balance = await this.getAccountValue(this.sourceAccountSection, 'Số dư');
        const withdrawable = await this.getAccountValue(this.sourceAccountSection, 'Số tiền có thể rút');
        return { balance, withdrawable };
    }

    async getDestinationAccountInfo(): Promise<TransferCashAccountInfo> {
        const balance = await this.getAccountValue(this.destinationAccountSection, 'Số dư');
        const withdrawable = await this.getAccountValue(this.destinationAccountSection, 'Số tiền có thể rút');
        return { balance, withdrawable };
    }

    async getTransferContent(): Promise<string> {
        const content = await this.transferContentInput.textContent() || '';
        return content?.trim() || '';
    }

    async fillTransferAmount(amount: number | string): Promise<void> {
        await FormUtils.fillTextBox(this.transferAmountInput, amount);
    }


    async submitTransfer(): Promise<void> {
        await this.transferButton.click();
    }

    async transferCash(amount: number): Promise<void> {
        await this.fillTransferAmount(amount);
        await this.submitTransfer();
        if (await this.matrixPage.isMatrixVisible()) {
            await this.matrixPage.enterMatrixValid();
            await this.page.waitForTimeout(3000);
            await this.orderPage.closeAllToastMessages();
            await this.submitTransfer();
        }
    }

    async getHistoryTableHeaders(): Promise<string[]> {
        return TableUtils.getTableHeaders(this.historyHeaders);
    }

    async getHistoryRowCount(): Promise<number> {
        await this.historyTable.waitFor({ state: 'visible' });
        return await this.historyRows.count();
    }

    async getHistoryRowData(rowIndex: number): Promise<TransferCashHistoryRow> {
        const row = this.historyRows.nth(rowIndex);
        await row.waitFor({ state: 'visible' });
        const source = await row.locator('td:nth-child(1)').textContent() || '';
        const destination = await row.locator('td:nth-child(2)').textContent() || '';
        const amount = await row.locator('td:nth-child(3)').textContent() || '';
        const fee = await row.locator('td:nth-child(4)').textContent() || '';
        const content = await row.locator('td:nth-child(5)').textContent() || '';
        const createdDate = await row.locator('td:nth-child(6)').textContent() || '';
        const status = await row.locator('td:nth-child(7)').textContent() || '';

        return {
            source: source.trim(),
            destination: destination.trim(),
            amount: NumberValidator.parseNumber(amount.trim()),
            fee: NumberValidator.parseNumber(fee.trim()),
            content: content.trim(),
            createdDate: createdDate.trim(),
            status: status.trim(),
        };
    }
}

export default TransferCashPage;
