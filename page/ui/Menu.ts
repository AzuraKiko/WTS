import { Page, Locator } from '@playwright/test';
import BasePage from './BasePage';
import { expect } from '@playwright/test';

class Menu extends BasePage {
    private menuContainer: Locator;


    constructor(page: Page) {
        super(page);
        this.menuContainer = page.locator('.vertical-nav > .scrollbar-container');
    }

    /**
     * Menu Header
     */

    async getMenuHeaderLinkByName(menuName: string): Promise<Locator> {
        return this.page
            .locator('.app-header__nav .nav-link')
            .filter({ hasText: menuName });
    }

    async expectMenuHeaderActive(menuName: string): Promise<void> {
        const menuLink = await this.getMenuHeaderLinkByName(menuName);
        await expect(menuLink).toHaveClass(/active/);
    }

    async openMenuHeader(menuName: string): Promise<void> {
        const menuLink = await this.getMenuHeaderLinkByName(menuName);
        await this.safeClick(menuLink);
        await this.expectMenuHeaderActive(menuName);
        await this.page.waitForTimeout(3000);
    }

    /**
     * Menu Body
     */

    private getMenuSection(menuName: string): Locator {
        return this.menuContainer.locator('.categories').filter({
            has: this.page.locator('.categories-header', { hasText: menuName })
        });
    }

    private getMenuHeader(menuName: string): Locator {
        return this.getMenuSection(menuName).locator('.categories-header');
    }

    private getMenuBody(menuName: string): Locator {
        return this.getMenuSection(menuName).locator('.categories-body');
    }


    /**
     * Open a menu category if it is currently collapsed.
     */
    async openMenu(menuName: string): Promise<void> {
        const header = this.getMenuHeader(menuName);
        await this.ensureVisible(header);

        const isClosed = await header.locator('.icon.iUp2').evaluate((el) =>
            el.classList.contains('is--close')
        ).catch(() => false);

        if (isClosed) {
            await this.safeClick(header);
            await this.getMenuBody(menuName).waitFor({ state: 'visible' });
        }
    }

    /**
     * Open a submenu item under a given menu category.
     */
    async openSubMenu(menuName: string, subMenuName: string): Promise<void> {
        await this.openMenu(menuName);
        const subMenu = this.getMenuBody(menuName)
            .locator('.category.nav-item a', { hasText: subMenuName });

        await this.safeClick(subMenu);
    }

    async clickSubMenu(menuName: string, subMenuName: string): Promise<void> {
        const subMenu = this.getMenuBody(menuName)
            .locator('.category.nav-item a', { hasText: subMenuName });
        await this.safeClick(subMenu);
    }
}

export default Menu;
