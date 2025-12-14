import { test, expect, Page } from '@playwright/test';

// Constants
const URL = 'https://trade.pinetree.vn/#/home/bang-gia/vn30';
const LOGIN_CREDENTIALS = {
  username: 'Tuepd1',
  password: 'Test@123'
};

const MATRIX = {
  A: ['I', '1', 'Q', 'M', '1', '2', 'F'],
  B: ['0', '9', 'R', 'U', 'G', '4', 'M'],
  C: ['9', 'I', '3', 'Q', '5', '8', 'X'],
  D: ['0', 'U', '5', 'O', 'Y', '6', '3'],
  E: ['D', 'M', 'I', 'I', '7', 'K', '5'],
  F: ['6', '3', 'K', '4', 'V', '7', 'C'],
  G: ['U', '8', '6', 'B', '2', '0', '8']
};

const STOCK_CODES = ['MBG', 'TTH', 'ITQ', 'HDA', 'NSH', 'VHE', 'CET', 'KSD'];

// Selectors
const SELECTORS = {
  loginButton: 'button:has-text("Đăng nhập")',
  usernameInput: '[placeholder="Tên đăng nhập"]',
  passwordInput: '[placeholder="Mật khẩu"]',
  buttonSubmit: '[class="btn btn-submit"]',
  closeDialog: 'span.btn-icon.btn--light > span.icon.iClose',
  orderButton: 'text=Đặt lệnh',
  confirmButton: 'button:has-text("Xác nhận")',
  stockCodeInput: '[placeholder="Mã CK"]',
  quantityInput: '[placeholder="KL x1"]',
  orderBook: 'text=Sổ lệnh',
  cancelOrder: 'td:nth-child(14) > div > span:nth-child(2) > .icon',
  assetsTab: 'text=Tài sản',
  logoutButton: 'text=Thoát'
};

// Helper functions
async function login(page: Page) {
  await page.goto(URL);
  await page.click(SELECTORS.loginButton);
  await page.fill(SELECTORS.usernameInput, LOGIN_CREDENTIALS.username);
  await page.fill(SELECTORS.passwordInput, LOGIN_CREDENTIALS.password);
  await page.click(SELECTORS.buttonSubmit);
  await page.waitForTimeout(10000);

  // Handle 2FA dialog if present
  const dialogSpan = page.locator(SELECTORS.closeDialog);
  if (await dialogSpan.isVisible()) {
    await dialogSpan.click();
  }
}

function getMatrixCode(coord: string) {
  const row = coord[0];
  const col = parseInt(coord[1]) - 1;
  return MATRIX[row as keyof typeof MATRIX][col];
}

async function handleMatrixOTP(page: Page) {
  const coords = await page.locator('p.fw-500').allTextContents();
  const values = coords.map((coord: string) => getMatrixCode(coord.trim()));

  for (let i = 0; i < values.length; i++) {
    await page.locator(`input[name="inputEl${i + 1}"]`).fill(values[i]);
  }

  await page.click(SELECTORS.confirmButton);
}

test.describe('Web Trading daily test', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Place and cancel order', async ({ page }) => {
    await page.click(SELECTORS.orderButton);
    await handleMatrixOTP(page);

    // Place order
    const randomCode = STOCK_CODES[Math.floor(Math.random() * STOCK_CODES.length)];
    await page.fill(SELECTORS.stockCodeInput, randomCode);

    const target = page.locator('span.cursor-pointer.f');
    await expect(target).toHaveCount(1);
    await target.scrollIntoViewIfNeeded();
    await expect(target).toBeVisible();
    await target.dblclick();

    await page.fill(SELECTORS.quantityInput, '1');
    await page.click(SELECTORS.orderButton);
    await page.click(SELECTORS.confirmButton);

    // Handle error message or cancel order
    const messageError = page.locator('#root div').filter({
      hasText: 'Đặt lệnh không thành côngError: Hệ thống sẽ nhận lệnh cho ngày giao dịch tiếp'
    }).nth(2);

    if (await messageError.isVisible()) {
      console.log('Order placement failed:', await messageError.textContent());
    } else {
      await page.click(SELECTORS.orderBook);
      await page.locator(SELECTORS.cancelOrder).first().click();
      await page.click(SELECTORS.confirmButton);
    }
  });

  test('View assets information', async ({ page }) => {
    // Verify market info
    await expect(page.getByRole('cell', { name: 'ACB' }).locator('div')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'BID' }).locator('div')).toBeVisible();

    // Verify market indices
    await expect(page.getByText('VNI')).toBeVisible();
    await expect(page.locator('span').filter({ hasText: 'HNX' })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: 'UPCOM' })).toBeVisible();

    // Check assets
    await page.click(SELECTORS.assetsTab);
    await page.click('text=N00139071 - Thường');
    await page.click('text=P00000003 - PineFolio');
    await page.locator('span:nth-child(2) > .icon').click();

    // View stock chart
    await page.locator('span').filter({ hasText: 'HNX' }).click();
    await page.getByRole('dialog').locator('span').nth(3).click();

    // Logout
    await page.click('text=Tuepd1');
    await page.click(SELECTORS.logoutButton);
  });
});