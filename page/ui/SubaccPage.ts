import { Page, Locator } from '@playwright/test';
import { InteractionUtils } from '../../helpers/uiUtils';

class SelectSubacc {
    page: Page;
    dropdownSubacc: Locator;
    listSubacc: Locator;
    normalSubacc: Locator;
    marginSubacc: Locator;
    futureSubacc: Locator;
    folioSubacc: Locator;

    constructor(page: Page) {
        this.page = page;
        this.dropdownSubacc = page.locator('[class*="user-select__control"]');
        this.listSubacc = page.locator('.user-select__menu-list');
        this.normalSubacc = this.listSubacc.locator('.user-select__option').filter({ hasText: 'Thường' });
        this.marginSubacc = this.listSubacc.locator('.user-select__option').filter({ hasText: 'Margin' });
        this.futureSubacc = this.listSubacc.locator('.user-select__option').filter({ hasText: 'Phái sinh' });
        this.folioSubacc = this.listSubacc.locator('.user-select__option').filter({ hasText: 'PineFolio' });
    }

    async openDropdownSubacc() {
        await InteractionUtils.ensureVisible(this.dropdownSubacc);
        await this.dropdownSubacc.click();
        await this.listSubacc.waitFor({ state: 'visible', timeout: 10000 });
        await this.page.waitForTimeout(1000);
    }

    async selectNormalSubacc() {
        await this.openDropdownSubacc();
        await InteractionUtils.ensureVisible(this.normalSubacc);
        await this.normalSubacc.click();
    }

    async selectMarginSubacc() {
        await this.openDropdownSubacc();
        await InteractionUtils.ensureVisible(this.marginSubacc);
        await this.marginSubacc.click();
        const dropText = await this.dropdownSubacc.textContent();
        console.log('dropText', dropText);
        if (!dropText?.includes('Margin')) throw new Error('Margin not selected!');
    }

    async selectFutureSubacc() {
        await this.openDropdownSubacc();
        await InteractionUtils.ensureVisible(this.futureSubacc);
        await this.futureSubacc.click();
    }

    async selectFolioSubacc() {
        await this.openDropdownSubacc();
        await InteractionUtils.ensureVisible(this.folioSubacc);
        await this.folioSubacc.click();
    }
}

export default SelectSubacc;