import { Page, Locator } from '@playwright/test';
import BasePage from './BasePage';
import Menu from './Menu';
import { parseByLabels, countLabelMatches } from '../../helpers/parser';
import { cropByLocator } from '../../helpers/crop';
import MatrixPage from './MatrixPage';
import { FormUtils } from '../../helpers/uiUtils';
import { WaitUtils } from '../../helpers/uiUtils';

/* =========================
 * Labels (Domain)
 * ========================= */

export const ASSET_LABELS: Record<string, string[]> = {
    totalAsset: ['Tổng tài sản'],
    netAsset: ['Tài sản ròng'],
    withdrawable: ['Tiền được rút'],
    advanceAvail: ['Tiền có thể ứng'],
    mgDebt: ['Tổng dư nợ margin']
};


export type AssetData = ReturnType<typeof parseAsset>;

/* =========================
 * Parser
 * ========================= */

export function parseAsset(texts: string[]): Record<string, string> {
    return parseByLabels(texts, ASSET_LABELS);
}

export function countAssetLabelMatches(texts: string[]): number {
    return countLabelMatches(texts, ASSET_LABELS);
}


/* =========================
 * Page Object
 * ========================= */

class AssetPage extends BasePage {
    readonly menu: Menu;
    readonly matrixPage: MatrixPage;
    readonly overviewLocator: Locator;
    readonly viewAsset: Locator;
    readonly withdrawalButton: Locator;
    readonly withdrawalModal: Locator;
    readonly selectControlSubAccount: Locator;
    readonly selectValue: Locator;
    readonly selectOptions: Locator;
    readonly amountInput: Locator;
    readonly withdrawalModalConfirm: Locator;



    constructor(page: Page) {
        super(page);
        this.menu = new Menu(page);
        this.matrixPage = new MatrixPage(page);
        this.viewAsset = this.page.locator('.personal-content');
        this.overviewLocator = this.page.locator('.section-overview');
        this.withdrawalButton = this.page.locator('.refresh + span');
        this.withdrawalModal = this.page.locator('.modal-content', { hasText: 'Rút tiền' });

        this.selectControlSubAccount = this.withdrawalModal.locator('.filter-control-select__control').first();
        this.selectValue = this.withdrawalModal.locator('.filter-control-select__single-value').first();
        this.selectOptions = this.withdrawalModal.locator('.filter-control-select__option');
        this.amountInput = this.withdrawalModal.locator('input[placeholder="Nhập số tiền"]');
        this.withdrawalModalConfirm = this.withdrawalModal.locator('.modal-form-confirm');
    }

    async navigateToAssetSummary(): Promise<void> {
        await this.menu.clickSubMenu('Tài sản', 'Tổng quan');
        await this.page.waitForTimeout(3000);
    }

    async cropAssetSummary(): Promise<Buffer> {
        return cropByLocator(this.page, this.overviewLocator, {
            output: 'playwright/data/asset-overview.png',
            padding: 20
        });
    }

    async getListSubAccountTabs(): Promise<string[]> {
        return await this.viewAsset.locator('.card-panel-2__tab').allTextContents().then(texts => texts.map(text => text.trim()));
    }

    async getTabActive(): Promise<string | null> {
        const tabActive = await this.viewAsset.locator('.card-panel-2__tab.active').first().textContent();
        return tabActive?.trim() || null;
    }

    async clickSubAccountTab(subAccountTab: string): Promise<void> {
        const tab = this.viewAsset
            .locator('.card-panel-2__tab')
            .filter({ hasText: subAccountTab })
            .first();
        await this.ensureVisible(tab);

        try {
            await tab.click({ timeout: 10000 });
            return;
        } catch {
            // fallback to avoid overlay intercept in headless
            await tab.click({ force: true });
        }

        const isActive = await tab.evaluate((el) =>
            el.classList.contains('active') || el.getAttribute('aria-selected') === 'true'
        );
        if (isActive) return;

        await tab.evaluate((el) => (el as HTMLElement).click());
    }

    async cropCardDataByText(text: string): Promise<Buffer> {
        return cropByLocator(this.page, this.viewAsset.locator('.card-panel-2.section-detail').filter({ hasText: text }), {
            output: `playwright/data/asset-card-${text}.png`,
            padding: 20
        });
    }

    async getOverviewData(): Promise<{
        totalAsset: string;
        netAsset: string;
        withdrawable: string;
        advanceAvail: string;
        mgDebt: string;
    }> {
        const getValueByLabel = async (label: RegExp) => {
            const metric = this.overviewLocator
                .locator('.overview-metric')
                .filter({ hasText: label })
                .first();
            const value = await metric.locator('.overview-metric__value').textContent();
            return value?.trim() || '';
        };
        const [totalAsset, netAsset, withdrawable, advanceAvail, mgDebt] = await Promise.all([
            getValueByLabel(/Tổng\s*tài\s*sản/),
            getValueByLabel(/Tài\s*sản\s*ròng/),
            getValueByLabel(/Tiền\s*được\s*rút/),
            getValueByLabel(/Tiền\s*có\s*thể\s*ứng/),
            getValueByLabel(/Tổng\s*dư\s*nợ\s*margin/),
        ]);
        return { totalAsset, netAsset, withdrawable, advanceAvail, mgDebt };
    }

    async navigateToPortfolio(): Promise<void> {
        await this.menu.clickSubMenu('Tài sản', 'Danh mục');
        await this.page.waitForTimeout(3000);
    }

    async getTableByText(text: string): Promise<{
        tableLocator: Locator;
        tableHeaders: Locator;
        tableRows: Locator;
        tableScrollContainer: Locator;
    }> {
        const sectionLocator = this.viewAsset.locator('.section').filter({ hasText: text });
        const tableLocator = sectionLocator.locator('table').first();
        return {
            tableLocator: tableLocator,
            tableHeaders: tableLocator.locator('thead tr th'),
            tableRows: tableLocator.locator('tbody tr'),
            tableScrollContainer: sectionLocator.locator('.scrollbar-container'),
        };
    }

    async getPortfolioTotalData(text: string): Promise<{
        initialValue: string;
        marketValue: string;
        profitLoss: string;
        profitLossPercent: string;
    }> {
        const sectionLocator = this.viewAsset.locator('.section').filter({ hasText: text });
        const tableLocator = sectionLocator.locator('table').first();
        const totalRow = tableLocator.locator('thead tr').last();
        return {
            initialValue: await totalRow.locator('td').nth(0).textContent() || '',
            marketValue: await totalRow.locator('td').nth(1).textContent() || '',
            profitLoss: await totalRow.locator('td').nth(2).textContent() || '',
            profitLossPercent: await totalRow.locator('td').nth(3).textContent() || '',
        };
    }

    async navigateToInvestmentPerformance(): Promise<void> {
        await this.menu.clickSubMenu('Tài sản', 'Hiệu suất đầu tư');
        await this.page.waitForTimeout(3000);
    }

    async getListPerformanceTabs(): Promise<string[]> {
        return await this.viewAsset.locator('.performance-header__tab').allTextContents().then(texts => texts.map(text => text.trim()));
    }

    async clickPerformanceTab(tab: string): Promise<void> {
        await this.safeClick(this.viewAsset.locator('.performance-header__tab').filter({ hasText: tab }));
    }

    async selectCalendarChart(): Promise<void> {
        const calendarBtn = this.viewAsset.locator('div:has(> .icon.iCalendar2)'); // find the first div that has the icon.iCalendar2 class
        await this.safeClick(calendarBtn);
        await this.page.waitForTimeout(3000);
    }

    async selectLineChart(): Promise<void> {
        const lineBtn = this.viewAsset.locator('div:has(> .icon.iChart3 )'); // find the first div that has the icon.iChart3 class
        await this.safeClick(lineBtn);
        await this.page.waitForTimeout(3000);
    }

    async openWithdrawalMoneyModal(): Promise<void> {
        await this.safeClick(this.withdrawalButton);
        if (await this.matrixPage.isMatrixVisible()) {
            await this.matrixPage.enterMatrixValid();
            await this.page.waitForTimeout(3000);
            await this.safeClick(this.withdrawalButton);
        }
        await this.withdrawalModal.waitFor({ state: 'visible' });
    }

    async selectAccount(accountLabel: string): Promise<void> {
        await this.safeClick(this.selectControlSubAccount);
        const option = this.selectOptions.filter({ hasText: accountLabel });
        await this.safeClick(option);
    }

    async getSelectValue(): Promise<string> {
        return (await this.selectValue.textContent())?.trim() || '';
    }

    async getValueByText(text: string): Promise<string> {
        const bodyLeft = this.withdrawalModal.locator('.body-left');
        const row = bodyLeft.locator('.input-container').filter({ hasText: text });
        const value = await row.locator('span').textContent();
        return value?.trim() || '';
    }

    async fillAmount(amount: string): Promise<void> {
        await FormUtils.fillTextBox(this.amountInput, amount);
    }

    async submitWithdrawal(): Promise<void> {
        await this.safeClick(this.withdrawalModal.locator('.input-container button').filter({ hasText: 'Rút tiền' }));
    }

    async clickConfirmWithdrawal(): Promise<void> {
        await this.safeClick(this.withdrawalModalConfirm.locator('.input-container button').filter({ hasText: 'Xác nhận' }));
    }

    async verifyOTP(): Promise<void> {
        const authenSection = this.withdrawalModal.locator('.authen-section');
        await authenSection.waitFor({ state: 'visible', timeout: 30000 });
        const currentMethodActive = (await authenSection.locator('.authen-type-switch.active').textContent())?.trim() || '';
        if (currentMethodActive === 'Ma trận') {
            await this.matrixPage.enterMatrixConfirm(authenSection);
        } else {
            await this.safeClick(authenSection.locator('.authen-type-switch').filter({ hasText: 'Ma trận' }));
            await this.matrixPage.enterMatrixConfirm(authenSection);
        }
        await this.page.waitForTimeout(30000);
    }

    async withdrawalMoney(amount: number): Promise<void> {
        await this.fillAmount(amount.toString());
        await this.submitWithdrawal();

        await this.withdrawalModalConfirm.waitFor({ state: 'visible', timeout: 3000 });
        await this.verifyOTP();
        await this.clickConfirmWithdrawal();
    }

}
export default AssetPage;
