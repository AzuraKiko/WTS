// web/helpers/assertions.ts
// Common assertion functions for web automation testing

import { Page, Locator, expect, APIResponse } from '@playwright/test';

// ========== PAGE ASSERTIONS ==========

export async function expectTitleContains(page: Page, titlePart: string) {
  const title = await page.title();
  expect(title).toContain(titlePart);
}

export async function expectUrlMatches(page: Page, regex: RegExp) {
  const url = page.url();
  expect(url).toMatch(regex);
}

export async function expectPageLoaded(page: Page, timeout: number = 10000) {
  await page.waitForLoadState('networkidle', { timeout });
  await page.waitForLoadState('domcontentloaded', { timeout });
}

export async function expectUrlContains(page: Page, urlPart: string) {
  const url = page.url();
  expect(url).toContain(urlPart);
}

export async function expectPageTitle(page: Page, expectedTitle: string) {
  await expect(page).toHaveTitle(expectedTitle);
}

// ========== ELEMENT VISIBILITY ASSERTIONS ==========

export async function expectElementVisible(element: Locator, timeout: number = 10000) {
  await expect(element).toBeVisible({ timeout });
}

export async function expectElementHidden(element: Locator, timeout: number = 10000) {
  await expect(element).toBeHidden({ timeout });
}

export async function expectElementEnabled(element: Locator, timeout: number = 10000) {
  await expect(element).toBeEnabled({ timeout });
}

export async function expectElementDisabled(element: Locator, timeout: number = 10000) {
  await expect(element).toBeDisabled({ timeout });
}

export async function expectElementExists(element: Locator) {
  await expect(element).toBeAttached();
}

export async function expectElementNotExists(element: Locator) {
  await expect(element).not.toBeAttached();
}

export async function expectElementFocused(element: Locator) {
  await expect(element).toBeFocused();
}

// ========== TEXT AND CONTENT ASSERTIONS ==========

export async function expectElementText(element: Locator, expectedText: string, timeout: number = 10000) {
  await expect(element).toHaveText(expectedText, { timeout });
}

export async function expectElementContainsText(element: Locator, textPart: string, timeout: number = 10000) {
  await expect(element).toContainText(textPart, { timeout });
}

export async function expectElementTextContains(
  element: Locator,
  expectedText: string | string[],
  timeout: number = 10000
) {
  // Handle both single and multiple elements
  const count = await element.count();
  let texts: string[] = [];

  if (count === 0) {
    throw new Error('No elements found');
  } else if (count === 1) {
    const text = await element.textContent();
    texts = [text || ''];
  } else {
    texts = await element.allTextContents();
  }

  if (Array.isArray(expectedText)) {
    const found = texts.some(t => expectedText.some(item => t.includes(item)));
    expect(found).toBeTruthy();
  } else {
    const found = texts.some(t => t.includes(expectedText));
    expect(found).toBeTruthy();
  }
}


export async function expectInputValue(element: Locator, expectedValue: string, timeout: number = 10000) {
  await expect(element).toHaveValue(expectedValue, { timeout });
}

export async function expectElementAttribute(element: Locator, attribute: string, expectedValue: string) {
  await expect(element).toHaveAttribute(attribute, expectedValue);
}

export async function expectElementClass(element: Locator, className: string) {
  await expect(element).toHaveClass(new RegExp(className));
}

export async function expectElementNotContainsText(element: Locator, textPart: string) {
  await expect(element).not.toContainText(textPart);
}

// ========== COUNT ASSERTIONS ==========

export async function expectElementCount(elements: Locator, expectedCount: number, timeout: number = 10000) {
  await expect(elements).toHaveCount(expectedCount, { timeout });
}

export async function expectMinimumElementCount(elements: Locator, minCount: number, timeout: number = 10000) {
  await expect(async () => {
    const count = await elements.count();
    expect(count).toBeGreaterThanOrEqual(minCount);
  }).toPass({ timeout });
}

export async function expectMaximumElementCount(elements: Locator, maxCount: number, timeout: number = 10000) {
  await expect(async () => {
    const count = await elements.count();
    expect(count).toBeLessThanOrEqual(maxCount);
  }).toPass({ timeout });
}

// ========== API RESPONSE ASSERTIONS ==========

export async function expectResponseStatus(response: APIResponse, expectedStatus: number) {
  expect(response.status()).toBe(expectedStatus);
}

export async function expectResponseOK(response: APIResponse) {
  expect(response.ok()).toBeTruthy();
}

export async function expectResponseContainsHeader(response: APIResponse, headerName: string, expectedValue?: string) {
  const headers = response.headers();
  expect(headers).toHaveProperty(headerName.toLowerCase());

  if (expectedValue) {
    expect(headers[headerName.toLowerCase()]).toBe(expectedValue);
  }
}

export async function expectResponseJsonContains(response: APIResponse, expectedData: any) {
  const responseData = await response.json();
  expect(responseData).toMatchObject(expectedData);
}

export async function expectResponseJsonProperty(response: APIResponse, propertyPath: string, expectedValue: any) {
  const responseData = await response.json();
  const propertyValue = getNestedProperty(responseData, propertyPath);
  expect(propertyValue).toBe(expectedValue);
}

export async function expectResponse(response: APIResponse) {
  const responseData = await response.json();
  expect(responseData).toBeDefined();
}

// ========== DATA VALIDATION ASSERTIONS ==========

export async function expectNumberFormat(value: string, fieldName: string = 'Value') {
  // ex: 1,000,000.003
  // const numberRegex = /^-?(\d{1,3}(,\d{3})*(\.\d+)?|\d+(\.\d+)?)$/;
  // 2 digit after decimal point
  const numberRegex = /^-?(\d{1,3}(,\d{3})*(\.\d{2})?|\d+(\.\d{2})?)$/;
  expect(value, `${fieldName} should be in valid number format`).toMatch(numberRegex);
}

export async function expectPercentageFormat(value: string, fieldName: string = 'Percentage') {
  // const percentageRegex = /^-?(\d{1,3}(,\d{3})*(\.\d+)?|\d+(\.\d+)?)%$/;
  const percentageRegex = /^-?(\d{1,3}(,\d{3})*(\.\d{2})?|\d+(\.\d{2})?)%$/;
  expect(value, `${fieldName} should be in valid percentage format`).toMatch(percentageRegex);
}

export async function expectStockCodeFormat(stockCode: string) {
  // Updated to support stocks, warrants, ETFs with numbers and variable length (3-10 chars)
  const stockCodeRegex = /^[A-Z][A-Z0-9]{2,9}$/;
  expect(stockCode, 'Stock code should start with a letter followed by 2-9 letters/numbers').toMatch(stockCodeRegex);
}

export async function expectDateFormat(dateString: string, format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' = 'DD/MM/YYYY') {
  const formatRegex = {
    'DD/MM/YYYY': /^\d{2}\/\d{2}\/\d{4}$/,
    'MM/DD/YYYY': /^\d{2}\/\d{2}\/\d{4}$/,
    'YYYY-MM-DD': /^\d{4}-\d{2}-\d{2}$/
  };

  expect(dateString, `Date should be in ${format} format`).toMatch(formatRegex[format]);
}

export async function expectArrayNotEmpty(array: any[], arrayName: string = 'Array') {
  expect(array.length, `${arrayName} should not be empty`).toBeGreaterThan(0);
}

export async function expectObjectHasProperty(object: any, propertyName: string) {
  expect(object, `Object should have property: ${propertyName}`).toHaveProperty(propertyName);
}

export async function expectStringNotEmpty(value: string, fieldName: string = 'String') {
  expect(value, `${fieldName} should not be empty`).toBeTruthy();
  expect(value.trim().length, `${fieldName} should not be just whitespace`).toBeGreaterThan(0);
}

// ========== WAIT-BASED ASSERTIONS ==========

export async function expectEventually(
  assertionFn: () => Promise<void>,
  timeout: number = 30000,
  interval: number = 1000
) {
  await expect(assertionFn).toPass({
    timeout,
    intervals: [interval]
  });
}

export async function expectElementEventuallyVisible(element: Locator, timeout: number = 30000) {
  await expectEventually(async () => {
    await expectElementVisible(element, 1000);
  }, timeout);
}

export async function expectElementEventuallyHidden(element: Locator, timeout: number = 30000) {
  await expectEventually(async () => {
    await expectElementHidden(element, 1000);
  }, timeout);
}

export async function expectTextEventuallyChanges(
  element: Locator,
  initialText: string,
  timeout: number = 30000
) {
  await expectEventually(async () => {
    const currentText = await element.textContent();
    expect(currentText).not.toBe(initialText);
  }, timeout);
}

// ========== UTILITY FUNCTIONS ==========

function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

// ========== COMPOUND ASSERTIONS ==========

export async function expectTableRowData(
  row: Locator,
  expectedData: string[],
  cellSelector: string = 'td'
) {
  const cells = row.locator(cellSelector);
  await expectElementCount(cells, expectedData.length);

  for (let i = 0; i < expectedData.length; i++) {
    await expectElementContainsText(cells.nth(i), expectedData[i]);
  }
}


// ========== EXPORT ALL ASSERTIONS ==========

export const Assertions = {
  // Page assertions
  expectTitleContains,
  expectUrlMatches,
  expectPageLoaded,
  expectUrlContains,
  expectPageTitle,

  // Element visibility
  expectElementVisible,
  expectElementHidden,
  expectElementEnabled,
  expectElementDisabled,
  expectElementExists,
  expectElementNotExists,
  expectElementFocused,

  // Text and content
  expectElementText,
  expectElementContainsText,
  expectInputValue,
  expectElementAttribute,
  expectElementClass,
  expectElementNotContainsText,

  // Count assertions
  expectElementCount,
  expectMinimumElementCount,
  expectMaximumElementCount,

  // API assertions
  expectResponseStatus,
  expectResponseOK,
  expectResponseContainsHeader,
  expectResponseJsonContains,
  expectResponseJsonProperty,
  expectResponse,

  // Data validation
  expectNumberFormat,
  expectPercentageFormat,
  expectStockCodeFormat,
  expectDateFormat,
  expectArrayNotEmpty,
  expectObjectHasProperty,
  expectStringNotEmpty,

  // Wait-based assertions
  expectEventually,
  expectElementEventuallyVisible,
  expectElementEventuallyHidden,
  expectTextEventuallyChanges,

  // Compound assertions
  expectTableRowData,
}
