import { Page, Locator } from '@playwright/test';
import BasePage from './BasePage';
import Menu from './Menu';
import { parseByLabels, countLabelMatches } from '../../helpers/parser';
import { cropByLocator } from '../../helpers/crop';

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
    readonly overviewLocator: Locator;
    readonly viewAsset: Locator;


    constructor(page: Page) {
        super(page);
        this.menu = new Menu(page);
        this.viewAsset = this.page.locator('.personal-content');
        this.overviewLocator = this.page.locator('.section-overview');
    }

    async navigateToAssetSummary(): Promise<void> {
        await this.menu.openMenuHeader('Tài sản');
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
        await this.viewAsset.locator('.card-panel-2__tab').filter({ hasText: subAccountTab }).click();
    }

    async cropCardDataByText(text: string): Promise<Buffer> {
        return cropByLocator(this.page, this.viewAsset.locator('.card-panel-2.section-detail').filter({ hasText: text }), {
            output: `playwright/data/asset-card-${text}.png`,
            padding: 20
        });
    }

    async navigateToPortfolio(): Promise<void> {
        await this.menu.openMenuHeader('Tài sản');
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


}

export default AssetPage;
