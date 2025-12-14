// Screenshot, logs, etc
// chức năng attachScreenshot, attachText, attachFile

import { Page, test } from '@playwright/test';
import fs from 'fs';

// export const allure = new Allure();

export async function attachScreenshot(page: Page, name = 'screenshot') {
  const screenshot = await page.screenshot();
  test.info().attach(name, { body: screenshot, contentType: 'image/png' });
}

export function attachText(name: string, content: string) {
  test.info().attach(name, {
    body: Buffer.from(content, 'utf-8'),
    contentType: 'text/plain',
  });
}

export function attachFile(name: string, filePath: string) {
  const content = fs.readFileSync(filePath);
  test.info().attach(name, {
    body: content,
    contentType: 'application/octet-stream',
  });
}
