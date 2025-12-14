import { Page, Locator } from '@playwright/test';
import { expectElementText, expectElementContainsText, expectElementTextContains } from './assertions';

// Simple logger implementation
const logger = {
    error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error)
};

/**
 * Common UI interaction utilities for Playwright tests
 */

// Interface definitions
export interface ScrollOptions {
    direction: 'up' | 'down' | 'left' | 'right';
    amount?: number;
    timeout?: number;
}

export interface WaitOptions {
    timeout?: number;
    state?: 'visible' | 'hidden' | 'attached' | 'detached';
}

export interface RetryOptions {
    maxAttempts?: number;
    delay?: number;
    exponentialBackoff?: boolean;
}

export interface TableScrollResult {
    success: boolean;
    scrolled: boolean;
    endReached: boolean;
}

export interface HealthCheckOptions {
    checkVisibility?: boolean;
    checkInteractivity?: boolean;
    checkDataIntegrity?: boolean;
    timeout?: number;
}

export interface MessageVerification {
    title: string;
    description?: string;
}

/**
 * Scrolling utilities for tables and containers
 */
export class ScrollUtils {
    private static readonly DEFAULT_SCROLL_AMOUNT = 100;
    private static readonly DEFAULT_TIMEOUT = 1000;
    private static readonly MAX_SCROLL_ATTEMPTS = 50;

    /**
     * Scroll element in specified direction
     */
    static async scrollElement(
        page: Page,
        element: Locator,
        options: ScrollOptions
    ): Promise<void> {
        const { direction, amount = ScrollUtils.DEFAULT_SCROLL_AMOUNT } = options;

        await element.waitFor({ state: 'visible' });
        await element.hover();

        const scrollDeltas = {
            up: { deltaX: 0, deltaY: -amount },
            down: { deltaX: 0, deltaY: amount },
            left: { deltaX: -amount, deltaY: 0 },
            right: { deltaX: amount, deltaY: 0 }
        };

        const delta = scrollDeltas[direction];
        await page.mouse.wheel(delta.deltaX, delta.deltaY);
        await page.waitForTimeout(500);
    }

    /**
     * Scroll to top of element using keyboard shortcut
     */
    static async scrollToTop(page: Page, element: Locator): Promise<void> {
        await element.waitFor({ state: 'visible' });
        await element.hover();
        await page.keyboard.press('Home');
        await page.waitForTimeout(ScrollUtils.DEFAULT_TIMEOUT);
    }

    /**
     * Scroll to bottom of element using keyboard shortcut
     */
    static async scrollToBottom(page: Page, element: Locator): Promise<void> {
        await element.waitFor({ state: 'visible' });
        await element.hover();
        await page.keyboard.press('End');
        await page.waitForTimeout(ScrollUtils.DEFAULT_TIMEOUT);
    }

    /**
     * Check if element can be scrolled down
     */
    static async canScrollDown(element: Locator): Promise<boolean> {
        await element.waitFor({ state: 'visible' });

        const scrollInfo = await element.evaluate((el) => {
            return {
                scrollTop: el.scrollTop,
                scrollHeight: el.scrollHeight,
                clientHeight: el.clientHeight
            };
        });

        return scrollInfo.scrollTop < (scrollInfo.scrollHeight - scrollInfo.clientHeight - 10);
    }

    /**
     * Scroll down one page and check if scrolling occurred
     */
    static async scrollPageDown(page: Page, element: Locator): Promise<boolean> {
        await element.waitFor({ state: 'visible' });

        const beforeScroll = await element.evaluate((el) => el.scrollTop);
        await element.hover();
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(ScrollUtils.DEFAULT_TIMEOUT);

        const afterScroll = await element.evaluate((el) => el.scrollTop);
        return afterScroll > beforeScroll;
    }

    /**
     * Auto-scroll through entire element to load all data
     */
    static async loadAllData(page: Page, element: Locator): Promise<void> {
        await ScrollUtils.scrollToTop(page, element);

        let canScrollMore = true;
        let scrollAttempts = 0;

        while (canScrollMore && scrollAttempts < ScrollUtils.MAX_SCROLL_ATTEMPTS) {
            canScrollMore = await ScrollUtils.canScrollDown(element);

            if (canScrollMore) {
                const scrolled = await ScrollUtils.scrollPageDown(page, element);
                if (!scrolled) break;
                await page.waitForTimeout(500);
            }

            scrollAttempts++;
        }

        await ScrollUtils.scrollToTop(page, element);
    }
}

/**
 * Wait and retry utilities
 */
export class WaitUtils {
    private static readonly DEFAULT_TIMEOUT = 10000;
    private static readonly DEFAULT_RETRY_DELAY = 500;
    private static readonly DEFAULT_MAX_ATTEMPTS = 3;

    /**
     * Wait for element with custom options
     */
    static async waitForElement(
        element: Locator,
        options: WaitOptions = {}
    ): Promise<void> {
        const { timeout = WaitUtils.DEFAULT_TIMEOUT, state = 'visible' } = options;
        await element.waitFor({ state, timeout });
    }

    static async waitForAllElements(
        elements: Locator,
        options: WaitOptions = {}
    ): Promise<void> {
        const { timeout = WaitUtils.DEFAULT_TIMEOUT, state = 'visible' } = options;
        const count = await elements.count();

        for (let i = 0; i < count; i++) {
            await elements.nth(i).waitFor({ state, timeout });
        }
    }


    /**
     * Wait for condition with retry mechanism
     */
    static async waitForCondition(
        conditionFn: () => Promise<boolean>,
        options: RetryOptions & WaitOptions = {}
    ): Promise<boolean> {
        const {
            maxAttempts = WaitUtils.DEFAULT_MAX_ATTEMPTS,
            delay = WaitUtils.DEFAULT_RETRY_DELAY,
            exponentialBackoff = false,
            timeout = WaitUtils.DEFAULT_TIMEOUT
        } = options;

        const startTime = Date.now();

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                if (Date.now() - startTime > timeout) {
                    return false;
                }

                const result = await conditionFn();
                if (result) {
                    return true;
                }

                if (attempt < maxAttempts) {
                    const currentDelay = exponentialBackoff ? delay * Math.pow(2, attempt - 1) : delay;
                    await WaitUtils.delay(currentDelay);
                }
            } catch (error) {
                console.log(`Attempt ${attempt} failed:`, error);

                if (attempt < maxAttempts) {
                    const currentDelay = exponentialBackoff ? delay * Math.pow(2, attempt - 1) : delay;
                    await WaitUtils.delay(currentDelay);
                }
            }
        }

        return false;
    }

    /**
     * Wait for specific count of elements
     */
    static async waitForElementCount(
        elements: Locator,
        expectedCount: number,
        timeout: number = WaitUtils.DEFAULT_TIMEOUT
    ): Promise<boolean> {
        return WaitUtils.waitForCondition(
            async () => {
                const count = await elements.count();
                return count === expectedCount;
            },
            { timeout }
        );
    }

    /**
     * Utility delay function
     */
    static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Wait for page to be ready (all elements loaded)
     */
    static async waitForPageReady(page: Page, timeout: number = WaitUtils.DEFAULT_TIMEOUT): Promise<void> {
        await page.waitForLoadState('networkidle', { timeout });
        await page.waitForLoadState('domcontentloaded', { timeout });
    }
}

/**
 * Form interaction utilities
 */
export class FormUtils {
    private static readonly MESSAGE_TIMEOUT = 10000;
    /**
     * Fill form field with retry mechanism
     */
    static async fillField(
        field: Locator,
        value: string | number,
        options: RetryOptions = {}
    ): Promise<void> {
        const { maxAttempts = 3 } = options;
        const stringValue = String(value);

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await field.waitFor({ state: 'visible' });
                await field.clear();
                await field.fill(stringValue);

                // Verify the value was set correctly
                const inputValue = await field.inputValue();
                if (inputValue === stringValue) {
                    return;
                }

                // 🔄 Fallback 1: type từng ký tự
                await field.click();
                await field.pressSequentially(stringValue, { delay: 50 });

                if ((await field.inputValue()) === stringValue) {
                    return;
                }

                // 🔄 Fallback 2: set trực tiếp qua evaluate (React/Angular friendly)
                await field.evaluate((el, v) => {
                    (el as HTMLInputElement).value = v;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }, stringValue);

                if ((await field.inputValue()) === stringValue) {
                    return;
                }
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw new Error(
                        `Failed to fill field after ${maxAttempts} attempts: ${error}`
                    );
                }
                await WaitUtils.delay(500);
            }
        }
    }

    /**
     * Select option from dropdown
     */
    static async selectOption(
        page: Page,
        selectElement: Locator,
        dropdownSelector: Locator,
        optionText: string,
        options: RetryOptions = {}
    ): Promise<void> {
        const { maxAttempts = 3 } = options;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await selectElement.click();
                await dropdownSelector.waitFor({ state: 'visible' });
                await dropdownSelector
                    .filter({ hasText: optionText })
                    .click();
                await WaitUtils.delay(1000);
                return;
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw new Error(`Failed to select option after ${maxAttempts} attempts: ${error}`);
                }
                await WaitUtils.delay(500);
            }
        }
    }


    /**
     * Select a random value from a dropdown
     * @param page - Playwright Page instance
     * @param dropdownSelector - Selector for the dropdown element
     * @param optionsSelector - Selector for the dropdown options
     * @returns The text of the randomly selected option
     */
    static async selectRandomValueFromDropdown(page: Page, dropdownSelector: string, optionsSelector: string): Promise<string> {
        const dropdownLocator = page.locator(dropdownSelector);
        const optionsLocator = page.locator(optionsSelector);

        await dropdownLocator.waitFor({ state: 'visible' });
        await dropdownLocator.scrollIntoViewIfNeeded();
        await dropdownLocator.click();

        await page.locator(optionsSelector).waitFor({ state: 'visible' });

        const count = await optionsLocator.count();
        if (count === 0) throw new Error("Dropdown is empty!");

        const randomIndex = Math.floor(Math.random() * count);
        const randomOption = optionsLocator.nth(randomIndex);
        const randomValue = await randomOption.textContent();

        await page.waitForTimeout(500);
        await randomOption.click();
        await page.waitForTimeout(500);

        return randomValue?.trim() || "";
    }

    /**
     * Select a value from dropdown by index
     * @param page - Playwright Page instance
     * @param dropdownSelector - Selector for the dropdown element
     * @param optionsSelector - Selector for the dropdown options
     * @param index - Index of the option to select (0-based)
     * @returns The text of the selected option
     */
    static async selectValueFromDropdownByIndex(
        page: Page,
        dropdownSelector: string,
        optionsSelector: string,
        index: number
    ): Promise<string> {
        const dropdownLocator = page.locator(dropdownSelector);
        const optionsLocator = page.locator(optionsSelector);

        await dropdownLocator.waitFor({ state: 'visible' });
        await dropdownLocator.scrollIntoViewIfNeeded();
        await dropdownLocator.click();

        await page.locator(optionsSelector).waitFor({ state: 'visible' });

        const count = await optionsLocator.count();
        if (count === 0) throw new Error("Dropdown is empty!");
        if (index >= count)
            throw new Error(`Index out of range! Max index: ${count - 1}`);

        const selectedOption = optionsLocator.nth(index);
        const selectedValue = await selectedOption.textContent();

        await page.waitForTimeout(500);
        await selectedOption.click();

        return selectedValue?.trim() || "";
    }

    /**
     * Select a fixed value from dropdown
     * @param page - Playwright Page instance
     * @param dropdownSelector - Selector for the dropdown element
     * @param valueSelector - Selector for the specific value to select
     */
    static async selectFixedValueFromDropdown(page: Page, dropdownSelector: string, valueSelector: string): Promise<void> {
        const dropdownLocator = page.locator(dropdownSelector);
        const valueLocator = page.locator(valueSelector);

        await dropdownLocator.waitFor({ state: 'visible' });
        await dropdownLocator.scrollIntoViewIfNeeded();
        await dropdownLocator.click();

        await page.locator(valueSelector).waitFor({ state: 'visible' });

        await page.waitForTimeout(500);
        await valueLocator.click();
        await page.waitForTimeout(500);
    }

    /**
     * Select a value from dropdown by searching through options
     * @param page - Playwright Page instance
     * @param dropdownSelector - Selector for the dropdown element
     * @param valueDisplaySelector - Selector for the element showing current value
     * @param expectedValue - Value to select
     */
    static async selectValueFromDropdown(
        page: Page,
        dropdownSelector: string,
        valueDisplaySelector: string,
        expectedValue: string
    ): Promise<void> {
        const dropdownLocator = page.locator(dropdownSelector);
        const valueDisplayLocator = page.locator(valueDisplaySelector);

        await dropdownLocator.click();
        await page.waitForTimeout(500);

        let currentValue = await valueDisplayLocator.textContent() || "";
        let attempts = 0;
        const maxAttempts = 20; // Prevent infinite loops

        while (!currentValue.includes(expectedValue) && attempts < maxAttempts) {
            await dropdownLocator.press("ArrowDown");
            await dropdownLocator.press("Enter");
            await page.waitForTimeout(200);

            currentValue = await valueDisplayLocator.textContent() || "";
            attempts++;
        }

        if (!currentValue.includes(expectedValue)) {
            throw new Error(
                `Could not find value "${expectedValue}" in dropdown after ${maxAttempts} attempts`
            );
        }

        await valueDisplayLocator.click();
    }

    // Get all list value from dropdown
    static async getListValueFromDropdown(page: Page, dropdownSelector: string, optionsSelector: string): Promise<string[]> {
        const dropdownLocator = page.locator(dropdownSelector);
        const optionsLocator = page.locator(optionsSelector);

        await dropdownLocator.waitFor({ state: 'visible' });
        await dropdownLocator.scrollIntoViewIfNeeded();
        await dropdownLocator.click();

        await page.locator(optionsSelector).waitFor({ state: 'visible' });

        const count = await optionsLocator.count();
        if (count === 0) throw new Error("Dropdown is empty!");

        const listValue: string[] = [];
        for (let i = 0; i < count; i++) {
            const option = optionsLocator.nth(i);
            const value = await option.textContent();
            listValue.push(value?.trim() || "");
        }

        return listValue;
    }

    /**
     * Submit form with confirmation
     */
    static async submitForm(
        submitButton: Locator,
        confirmButton?: Locator,
        options: WaitOptions = {}
    ): Promise<void> {
        await submitButton.click();

        if (confirmButton) {
            await WaitUtils.waitForElement(confirmButton, options);
            await confirmButton.click();
        }
    }

    /**
     * Clear all form fields
     */
    static async clearForm(fields: Locator[]): Promise<void> {
        for (const field of fields) {
            try {
                await field.clear();
            } catch (error) {
                console.log(`Failed to clear field: ${error}`);
            }
        }
    }

    /**
     * Verify message with improved error handling and timeout
     */
    static async verifyArrayMessage(expectedTitle: string | string[], titleLocator: Locator, expectedDescription?: string | string[], descriptionLocator?: Locator, timeout?: number): Promise<void> {
        try {
            // Wait for at least one element to be visible
            await titleLocator.first().waitFor({
                state: 'visible',
                timeout: timeout ?? FormUtils.MESSAGE_TIMEOUT
            });
            await expectElementTextContains(titleLocator, expectedTitle);
            if (descriptionLocator && expectedDescription) {
                await expectElementTextContains(descriptionLocator, expectedDescription);
            }
        } catch (error) {
            console.log(`Message verification failed: ${error}`);
            throw new Error(`Message verification failed: ${error}`);
        }
    }

    static async verifyMessage(expectedTitle: string, titleLocator: Locator, expectedDescription?: string, descriptionLocator?: Locator, timeout?: number): Promise<void> {
        try {
            await titleLocator.waitFor({
                state: 'visible',
                timeout: timeout ?? FormUtils.MESSAGE_TIMEOUT
            });
            await expectElementText(titleLocator, expectedTitle);
            if (descriptionLocator && expectedDescription) {
                await expectElementContainsText(descriptionLocator, expectedDescription);
            }
        } catch (error) {
            console.log(`Message verification failed: ${error}`);
            throw new Error(`Message verification failed: ${error}`);
        }
    }

    /**
     * Get current message content
     */
    static async getCurrentMessage(titleLocator: Locator, descriptionLocator: Locator, timeout: number = FormUtils.MESSAGE_TIMEOUT): Promise<MessageVerification> {
        try {
            await titleLocator.waitFor({
                state: 'visible',
                timeout: timeout
            });

            const title = await titleLocator.textContent() || '';
            const description = await descriptionLocator.textContent() || '';

            return {
                title: title.trim(),
                description: description.trim()
            };
        } catch (error) {
            throw new Error(`Failed to get current message: ${error}`);
        }
    }

    /**
     * Wait for success message
     */
    static async waitForSuccessMessage(titleLocator: Locator, timeout: number = FormUtils.MESSAGE_TIMEOUT): Promise<boolean> {
        try {
            await titleLocator.waitFor({
                state: 'visible',
                timeout
            });

            const titleText = await titleLocator.textContent();

            // Common success message patterns
            const successPatterns = [
                'Thành công',
                'Đặt lệnh thành công',
                'Success',
                'Order placed successfully'
            ];

            return successPatterns.some(pattern =>
                titleText?.toLowerCase().includes(pattern.toLowerCase())
            );
        } catch (error) {
            console.log(`Success message not found: ${error}`);
            return false;
        }
    }

    /**
     * Wait for error message
     */
    static async waitForErrorMessage(titleLocator: Locator, timeout: number = FormUtils.MESSAGE_TIMEOUT): Promise<boolean> {
        try {
            await titleLocator.waitFor({
                state: 'visible',
                timeout
            });

            const titleText = await titleLocator.textContent();

            // Common error message patterns
            const errorPatterns = [
                'Order placed failed',
                'Error',
                'Failed',
                'Thất bại',
                'Đặt lệnh không thành công'
            ];

            return errorPatterns.some(pattern =>
                titleText?.toLowerCase().includes(pattern.toLowerCase())
            );
        } catch (error) {
            console.log(`Error message not found: ${error}`);
            return false;
        }
    }

    /**
     * Verify toggle state
     */
    static async verifyToggle(toggleElement: Locator, expectedState: 'ON' | 'OFF'): Promise<boolean> {
        await toggleElement.waitFor({ state: 'visible' });
        const isChecked = await toggleElement.isChecked();
        return isChecked === (expectedState === 'ON');
    }
}

/**
 * Table interaction utilities
 */
export class TableUtils {

    static async getTableHeaders(tableHeaders: Locator): Promise<string[]> {
        await tableHeaders.waitFor({ state: 'visible' });
        const headers = await tableHeaders.allTextContents();
        return headers.map((header: string) => header.trim());
    }

    /**
     * Get all table data with scrolling support
     */
    static async getAllTableData<T>(
        page: Page,                  // Trang Playwright
        tableRows: Locator,          // Locator của các dòng trong bảng
        scrollContainer: Locator,    // Locator của vùng chứa scrollable
        dataExtractor: (rowIndex: number) => Promise<T>, // Hàm trích xuất dữ liệu
        useScrolling: boolean = true // Có tự động scroll không?
    ): Promise<T[]> {
        if (useScrolling) {
            await ScrollUtils.loadAllData(page, scrollContainer);
        }

        const rowCount = await tableRows.count();
        const allData: T[] = [];

        for (let i = 0; i < rowCount; i++) {
            try {
                const rowData = await dataExtractor(i);
                allData.push(rowData);
            } catch (error) {
                console.log(`Failed to extract data from row ${i}: ${error}`);
            }
        }

        return allData;
    }

    /**
     * Find row by search criteria with scrolling
     */
    static async findRowWithScrolling<T>(
        page: Page,
        tableRows: Locator,
        scrollContainer: Locator,
        dataExtractor: (rowIndex: number) => Promise<T>,
        searchCriteria: (data: T) => boolean
    ): Promise<{ data: T; index: number } | null> {
        await ScrollUtils.scrollToTop(page, scrollContainer);

        let canScrollMore = true;
        let scrollAttempts = 0;

        while (canScrollMore && scrollAttempts < 50) {
            const rowCount = await tableRows.count();

            for (let i = 0; i < rowCount; i++) {
                try {
                    const rowData = await dataExtractor(i);
                    if (searchCriteria(rowData)) {
                        return { data: rowData, index: i };
                    }
                } catch (error) {
                    continue;
                }
            }

            canScrollMore = await ScrollUtils.canScrollDown(scrollContainer);
            if (canScrollMore) {
                const scrolled = await ScrollUtils.scrollPageDown(page, scrollContainer);
                if (!scrolled) break;
                await WaitUtils.delay(1000);
            }

            scrollAttempts++;
        }

        return null;
    }

    static async verifyNoDataMessage(locator: Locator): Promise<boolean> {
        const messageText = (await locator.textContent())?.trim() || '';

        const noDataMessages = [
            'Không có dữ liệu!',
            'No data found!',
        ];

        return noDataMessages.some(msg => messageText.includes(msg));
    }


    /**
     * Click table row with error handling
     */
    static async clickTableRow(
        tableRows: Locator,
        rowIndex: number,
        options: RetryOptions = {}
    ): Promise<void> {
        const { maxAttempts = 2 } = options;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const row = tableRows.nth(rowIndex);
                await row.waitFor({ state: 'visible' });
                await row.click();
                return;
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw new Error(`Failed to click row after ${maxAttempts} attempts: ${error}`);
                }
                await WaitUtils.delay(500);
            }
        }
    }
}

/**
 * Modal interaction utilities
 */
export class ModalUtils {
    /**
     * Wait for modal to appear and return modal element
     */
    static async waitForModal(
        page: Page,
        modalSelector: string,
        timeout: number = 10000
    ): Promise<Locator> {
        const modal = page.locator(modalSelector);
        await modal.waitFor({ state: 'visible', timeout });
        return modal;
    }

    /**
     * Close modal by clicking close button or escape key
     */
    static async closeModal(
        page: Page,
        modal: Locator,
        closeButtonSelector?: string
    ): Promise<void> {
        try {
            if (closeButtonSelector) {
                const closeButton = modal.locator(closeButtonSelector);
                await closeButton.click();
            } else {
                await page.keyboard.press('Escape');
            }
            await modal.waitFor({ state: 'hidden', timeout: 5000 });
        } catch (error) {
            throw new Error(`Failed to close modal: ${error}`);
        }
    }

    /**
     * Confirm modal action
     */
    static async confirmModal(
        modal: Locator,
        confirmButtonSelector: string = '.btn-confirm, .btn-primary'
    ): Promise<void> {
        const confirmButton = modal.locator(confirmButtonSelector);
        await confirmButton.click();
        await modal.waitFor({ state: 'hidden', timeout: 10000 });
    }

    /**
     * Cancel modal action
     */
    static async cancelModal(
        modal: Locator,
        cancelButtonSelector: string = '.btn-cancel, .btn-secondary'
    ): Promise<void> {
        const cancelButton = modal.locator(cancelButtonSelector);
        await cancelButton.click();
        await modal.waitFor({ state: 'hidden', timeout: 10000 });
    }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceUtils {
    /**
     * Measure execution time of a function
     */
    static async measureExecutionTime<T>(
        operation: () => Promise<T>
    ): Promise<{ result: T; duration: number }> {
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;

        return { result, duration };
    }

    /**
     * Monitor page load performance
     */
    static async measurePageLoadTime(page: Page): Promise<number> {
        const startTime = Date.now();
        await WaitUtils.waitForPageReady(page);
        return Date.now() - startTime;
    }

    /**
     * Measure element load time
     */
    static async measureElementLoadTime(element: Locator): Promise<number> {
        return PerformanceUtils.measureExecutionTime(async () => {
            await element.waitFor({ state: 'visible' });
        }).then(result => result.duration);
    }
}

// Export all utilities as a single object for convenience
export const UIUtils = {
    Scroll: ScrollUtils,
    Wait: WaitUtils,
    Form: FormUtils,
    Table: TableUtils,
    Modal: ModalUtils,
    Performance: PerformanceUtils
};

// Export common selectors
export const CommonSelectors = {
    CLOSE_BUTTON: '.btn-close, .close, .icon-close',
    CONFIRM_BUTTON: '.btn-confirm, .btn-primary, [data-testid="confirm"]',
    CANCEL_BUTTON: '.btn-cancel, .btn-secondary, [data-testid="cancel"]',
    LOADING_SPINNER: '.loading, .spinner, [data-testid="loading"]',
    ERROR_MESSAGE: '.error, .alert-error, [data-testid="error"]',
    SUCCESS_MESSAGE: '.success, .alert-success, [data-testid="success"]',
    SCROLL_TABLE: '.card-panel-body .scrollbar-container',
};
