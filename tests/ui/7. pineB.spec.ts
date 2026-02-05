import { test, expect, type Locator } from '@playwright/test';
import LoginPage from '../../page/ui/LoginPage';
import Menu from '../../page/ui/Menu';
import { TEST_CONFIG } from '../utils/testConfig';
import { BondListApi } from '../../page/api/BondApis';
import { v4 as uuidv4 } from 'uuid';
import { NumberValidator } from '../../helpers/validationUtils';
import { InteractionUtils } from '../../helpers/uiUtils';


const tabLabels = ['Danh sách trái phiếu', 'Sổ lệnh', 'Danh mục', 'Minh họa dòng tiền'];
const filterLabels = ['Mã TP', 'Tổ chức phát hành', 'Nhà đầu tư', 'Tài sản đảm bảo', 'Loại trái phiếu', 'Lọc'];

const normalizeText = (value?: string | null): string => value?.trim() || '';
const getTextList = async (locator: Locator): Promise<string[]> =>
    locator
        .allTextContents()
        .then(texts => texts.map(text => text.trim()).filter(Boolean));

test.describe('PineB Tests', () => {
    let loginPage: LoginPage;
    let menu: Menu;
    let bondListApi: BondListApi;


    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        menu = new Menu(page);
        bondListApi = new BondListApi({ baseUrl: TEST_CONFIG.WEB_LOGIN_URL });

        await loginPage.gotoWeb(TEST_CONFIG.WEB_LOGIN_URL);
        if (await page.locator('.adv-modal__body').isVisible()) {
            const cancelButton = page.locator('.btn-icon.btn--cancel');
            await InteractionUtils.ensureVisible(cancelButton);
            await cancelButton.click();
            await page.waitForTimeout(3000);
        }
        await menu.openMenuHeader('Trái phiếu');
    });

    test('TC_001: Check data on PineB page', async ({ page }) => {
        const bondView: Locator = page.locator('.bond-content');
        const tabGroup: Locator = bondView.locator('.bond-header__left');
        const filterGroup: Locator = bondView.locator('.bond-layout__filters');

        await expect(bondView.getByText('Chính sách PineB', { exact: true })).toBeVisible();
        await expect(bondView.getByText('Kiến thức đầu tư Trái phiếu', { exact: true })).toBeVisible();
        await expect(bondView.getByText('Lợi suất ưu đãi theo NAV', { exact: true })).toBeVisible();

        const tabsText = await getTextList(tabGroup.locator('.card-panel-3__tab'));
        expect(tabsText).toEqual(tabLabels);

        const filtersText = await getTextList(
            filterGroup.locator('.bond-layout__filter label, .bond-layout__filter button')
        );
        expect(filtersText).toEqual(filterLabels);

        const bondList = await bondListApi.getBondProductList(uuidv4());
        expect(bondList.success).toBeTruthy();
        if (bondList.data.data.length === 0) {
            console.log('No data bond product');
            return;
        }
        const firstBond = bondList.data.data[0];
        const firstBondFromApi = {
            bondCode: normalizeText(firstBond.bondCode),
            issuerName: normalizeText(firstBond.issuerNm),
            interestRate: NumberValidator.parseNumber(firstBond.intRate),
            buyPrice: NumberValidator.parseNumber(firstBond.leg1Prc),
            availableQty: NumberValidator.parseNumber(firstBond.selRemain),
        };
        const bondItems: Locator = bondView.locator('div .new-bond-item');
        const firstBondItemUI = bondItems.first();
        const bondCode: Locator = firstBondItemUI.locator(
            '.new-bond-item__header > div > div > span:nth-child(1)'
        );
        const issuerNm: Locator = firstBondItemUI.locator(
            '.new-bond-item__header > div:nth-child(2) > span:nth-child(1)'
        );
        const buyButtons: Locator = bondItems.locator('.new-bond-item__row .btn--buy');
        expect(await buyButtons.count()).toBeGreaterThan(0);

        const getValueByText = async (section: Locator, text: string): Promise<string> => {
            const row = section.locator('.new-bond-item__row').filter({ hasText: text });
            const value = await row.locator('span').last().textContent();
            return normalizeText(value);
        };

        const [intRate, buyPrice, availQty] = await Promise.all([
            getValueByText(firstBondItemUI, 'Lợi suất'),
            getValueByText(firstBondItemUI, 'Giá mua'),
            getValueByText(firstBondItemUI, 'Khối lượng Khả dụng'),
        ]);
        const firstBondFromUi = {
            bondCode: normalizeText(await bondCode.textContent()),
            issuerName: normalizeText(await issuerNm.textContent()),
            interestRate: NumberValidator.parseNumber(intRate),
            buyPrice: NumberValidator.parseNumber(buyPrice),
            availableQty: NumberValidator.parseNumber(availQty),
        };

        Object.entries(firstBondFromUi).forEach(([key, value]) => {
            expect(value).toBe(firstBondFromApi[key as keyof typeof firstBondFromApi]);
        });

    });
});
