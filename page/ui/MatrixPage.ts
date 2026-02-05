import { Page, Locator, expect } from '@playwright/test';
import BasePage from './BasePage';
import { getMatrixCodes, isValidCoordinate } from '../api/Matrix';

class MatrixPage extends BasePage {
    // Matrix 2FA
    matrixGen: Locator;
    matrixInput: Locator;
    confirmButton: Locator;
    change2FA: Locator;
    refreshMatrix: Locator;
    popup2FA: Locator;

    // Messages
    errorMessage: Locator;
    constructor(page: Page) {
        super(page);

        // Matrix 2FA
        this.matrixGen = page.locator('p.fw-500');
        this.matrixInput = page.locator('.text-center.text-otp');
        this.confirmButton = page.getByRole('button', { name: 'Xác nhận' });
        this.change2FA = page.locator('.btn.btn--primary2.fw-500');
        this.refreshMatrix = page.locator('.text-refresh.cursor-pointer');
        this.popup2FA = page.locator('.mb-0.text-title');

        // Messages
        this.errorMessage = page.locator('.d.mx-auto.text-error');
    }

    async isMatrixVisible(): Promise<boolean> {
        return await this.refreshMatrix.isVisible({ timeout: 30000 });
    }

    /**
     * Enter matrix codes for 2FA
     */
    async enterMatrixValid(): Promise<void> {
        await this.refreshMatrix.waitFor({ state: 'visible', timeout: 30000 });
        const validCoords = await this.getValidMatrixCoords(this.matrixGen);
        const matrixValues: string[] = getMatrixCodes(validCoords.slice(0, 3));

        // Use for...of loop instead of forEach for proper async handling
        for (let index = 0; index < matrixValues.length; index++) {
            await this.matrixInput.nth(index).fill(matrixValues[index]);
        }

        await this.safeClick(this.confirmButton);
    }



    async enterMatrixInvalid(): Promise<void> {
        await this.refreshMatrix.waitFor({ state: 'visible', timeout: 30000 });

        for (let index = 0; index < 3; index++) {
            await this.matrixInput.nth(index).fill('123');
        }

        await this.safeClick(this.confirmButton);
        const errorMessage = await this.errorMessage.textContent();
        expect(errorMessage).toBe('Error: Bạn đã nhập sai mã OTP.');
    }

    /**
     * Refresh matrix when needed
     */
    async refreshMatrixCodes(): Promise<void> {
        await this.safeClick(this.refreshMatrix);

        // Wait for element to be disabled first
        await expect(this.matrixGen).toBeDisabled({ timeout: 5000 });

        // Wait for element to be enabled again after ~10 seconds
        await expect(this.matrixGen).toBeEnabled({ timeout: 15000 });
    }

    /**
     * Verify 2FA method change popup
     */
    async verifyChange2FAPopup(): Promise<boolean> {
        await this.safeClick(this.change2FA);
        await expect(this.popup2FA).toBeVisible();
        const text = await this.popup2FA.textContent();
        return text?.trim() === "Chọn Phương Thức Xác Thực";
    }

    async enterMatrixConfirm(section: Locator): Promise<void> {
        const matrix = section.locator('.matrix-section');
        const refresh = section.locator('.resend-section');
        const input = section.locator('.matrix-section input');


        await refresh.waitFor({ state: 'visible', timeout: 30000 });
        const validCoords = await this.getValidMatrixCoords(matrix);
        const matrixValues: string[] = getMatrixCodes(validCoords.slice(0, 3));

        // Use for...of loop instead of forEach for proper async handling
        for (let index = 0; index < matrixValues.length; index++) {
            await input.nth(index).fill(matrixValues[index]);
        }
    }

    /**
     * Matrix text đôi khi load chậm, cần retry trước khi throw lỗi.
     */
    private async getValidMatrixCoords(container: Locator): Promise<string[]> {
        const maxAttempts = 5;
        const delayMs = 1000;
        let lastCoords: string[] = [];

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const coords: string[] = await container.allTextContents();
            lastCoords = coords;
            const validCoords: string[] = coords
                .map((coord: string) => coord.trim())
                .filter((coord: string) => isValidCoordinate(coord));

            if (validCoords.length >= 3) {
                return validCoords;
            }

            // Lần cuối thì không cần chờ nữa
            if (attempt < maxAttempts) {
                console.log(`Matrix coords not ready (attempt ${attempt}/${maxAttempts}). Current valid: ${validCoords.length}, all coords: ${coords.join(', ')}`);
                await this.page.waitForTimeout(delayMs);
            }
        }

        throw new Error(
            `Expected at least 3 valid matrix coordinates after ${maxAttempts} attempts, but got ${lastCoords.length
            }. Coordinates: ${lastCoords.join(', ')}`
        );
    }

}

export default MatrixPage;