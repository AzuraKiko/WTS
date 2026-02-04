import { Page, Locator, FrameLocator } from '@playwright/test';
import BasePage from './BasePage';


export class ChartPage extends BasePage {
    chartLocator: Locator;
    dialogSearch: Locator;
    symbolSearchButton: Locator;
    symbolSearchValue: Locator;
    timeFrameButton: Locator;
    timeFrameValue: Locator;
    private readonly scope: Page | FrameLocator;
    constructor(page: Page, frame?: FrameLocator) {
        super(page);
        this.scope = frame ?? page;
        this.chartLocator = this.page.locator('iframe.chart');
        this.dialogSearch = this.scope.locator('div[data-name="symbol-search-items-dialog"]');
        this.symbolSearchButton = this.scope.locator('#header-toolbar-symbol-search');
        this.symbolSearchValue = this.symbolSearchButton.locator('.js-button-text');
        this.timeFrameButton = this.scope.locator('#header-toolbar-intervals button');
        this.timeFrameValue = this.timeFrameButton.locator('.value-gwXludjS');
    }

    async selectSymbol(symbol: string) {
        await this.safeClick(this.symbolSearchButton);
        await this.ensureVisible(this.dialogSearch);
        const searchInput = this.dialogSearch.locator('input[placeholder="Search"]');
        await this.safeFill(searchInput, symbol);
        await this.page.keyboard.press('Enter');
    }

    async getCurrentSymbol(): Promise<string> {
        try {
            await this.ensureVisible(this.symbolSearchButton, { timeout: 10000 });
            const symbolText = await this.symbolSearchValue.innerText();
            if (symbolText?.trim()) {
                return symbolText.trim();
            }
        } catch {
            // ignore and fallback to iframe attributes
        }

        const widgetOptions = await this.chartLocator.getAttribute('data-widget-options');
        const symbolFromWidget = this.getWidgetOption(widgetOptions, 'symbol');
        if (symbolFromWidget) {
            return symbolFromWidget;
        }

        const src = await this.chartLocator.getAttribute('src');
        return this.getWidgetOption(src, 'symbol') || '';
    }

    async selectTimeframe(tf: string) {
        await this.ensureVisible(this.timeFrameButton);
        await this.safeClick(this.timeFrameButton);
        const menuItemByValue = this.page.locator(`[data-role="menuitem"][data-value="${tf}"]`);
        if (await menuItemByValue.count()) {
            await this.safeClick(menuItemByValue.first());
            return;
        }

        const menuItemByText = this.page.locator('[data-role="menuitem"]', { hasText: tf });
        await this.safeClick(menuItemByText.first());
    }

    async waitForToolbarReady(timeout = 30000): Promise<boolean> {
        try {
            await this.ensureVisible(this.timeFrameButton, { timeout });
            return true;
        } catch {
            return false;
        }
    }

    async getTimeframeCurrent(defaultValue = 'D'): Promise<string> {
        try {
            await this.ensureVisible(this.timeFrameButton, { timeout: 30000 });
            const valueText = await this.timeFrameValue.innerText();
            if (valueText?.trim()) {
                return valueText.trim();
            }

            return (await this.timeFrameButton.innerText())?.trim() || defaultValue;
        } catch {
            const widgetOptions = await this.chartLocator.getAttribute('data-widget-options');
            const intervalFromWidget = this.getWidgetOption(widgetOptions, 'interval');
            if (intervalFromWidget) {
                return intervalFromWidget;
            }

            const src = await this.chartLocator.getAttribute('src');
            const intervalFromSrc = this.getWidgetOption(src, 'interval');
            return intervalFromSrc ? intervalFromSrc : defaultValue;
        }
    }

    private getWidgetOption(source: string | null, key: string): string | null {
        if (!source) {
            return null;
        }

        const match = source.match(new RegExp(`(?:^|[?&])${key}=([^&]+)`));
        if (!match?.[1]) {
            return null;
        }

        try {
            return decodeURIComponent(match[1]);
        } catch {
            return match[1];
        }
    }
}
