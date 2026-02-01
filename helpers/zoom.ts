import { Page } from '@playwright/test';

export async function setPageZoom(page: Page, zoom: number): Promise<void> {
    await page.evaluate((zoomValue) => {
        const zoomPercent = `${Math.round(zoomValue * 100)}%`;
        document.documentElement.style.zoom = zoomPercent;
    }, zoom);
    await page.waitForTimeout(500);
}