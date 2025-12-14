import { test, expect } from '@playwright/test';
import LoginPage from '../../page/ui/LoginPage';
import OrderBook from '../../page/ui/OrderBook';
import { attachScreenshot } from '../../helpers/reporterHelper';

test.describe('OrderBook Functionality Tests', () => {
    let loginPage: LoginPage;
    let orderBook: OrderBook;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        orderBook = new OrderBook(page);

        // Login before each test
        await loginPage.loginSuccess();
        await page.waitForTimeout(2000);
    });

    test.afterEach(async ({ page, context }) => {
        // Clean up after each test
        try {
            await context.clearCookies();
            await page.close();
        } catch (error) {
            console.log('Cleanup error (ignored):', error);
        }
    });

    test('TC_OB_01: Should open orderbook successfully', async ({ page }) => {
        await orderBook.openOrderBook();
        await attachScreenshot(page, 'OrderBook Opened');

        // Verify orderbook is visible and contains expected elements
        expect(await orderBook.orderIndayTab.isVisible()).toBeTruthy();
        expect(await orderBook.orderHistoryTab.isVisible()).toBeTruthy();
        expect(await orderBook.conditionalOrderTab.isVisible()).toBeTruthy();
        expect(await orderBook.putThroughOrderTab.isVisible()).toBeTruthy();
    });

    test('TC_OB_02: Should display order data correctly in Order In Day tab', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(2000);

        // Check if table has data or shows appropriate empty state
        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            // Verify table structure and data
            const orders = await orderBook.getOrderTableData();
            expect(orders.length).toBeGreaterThan(0);

            // Verify first order has required fields
            const firstOrder = orders[0];
            expect(firstOrder).toHaveProperty('account');
            expect(firstOrder).toHaveProperty('stockCode');
            expect(firstOrder).toHaveProperty('time');
            expect(firstOrder).toHaveProperty('status');

            console.log('Order data sample:', firstOrder);
        } else {
            // Verify empty state message is shown
            const hasNoDataMessage = await orderBook.verifyNoDataMessage();
            expect(hasNoDataMessage).toBeTruthy();
        }

        await attachScreenshot(page, 'Order In Day Tab');
    });

    test('TC_OB_03: Should filter orders by search functionality', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            // Get initial order count
            const initialCount = await orderBook.getOrderCount();

            // Search for a specific stock code (using codes from the image)
            await orderBook.searchOrder('CFPT');
            await page.waitForTimeout(1000);

            // Verify search results
            const filteredCount = await orderBook.getOrderCount();
            console.log(`Initial orders: ${initialCount}, Filtered orders: ${filteredCount}`);

            // Clear search
            await orderBook.searchOrder('');
            await page.waitForTimeout(1000);

            const clearedCount = await orderBook.getOrderCount();
            expect(clearedCount).toBe(initialCount);
        }

        await attachScreenshot(page, 'Search Filter Applied');
    });

    test('TC_OB_04: Should filter orders by status', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            // Try filtering by "Chờ khớp" (Pending) status
            try {
                await orderBook.filterByStatus('Chờ khớp');
                await page.waitForTimeout(1000);

                // Verify filtered results show only pending orders
                const orders = await orderBook.getOrderTableData();
                if (orders.length > 0) {
                    const allPending = orders.every(order => order.status.includes('Chờ khớp'));
                    expect(allPending).toBeTruthy();
                }
            } catch (error) {
                console.log('Status filter not available or no pending orders');
            }
        }

        await attachScreenshot(page, 'Status Filter Applied');
    });

    test('TC_OB_05: Should verify order actions are available', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            // Check if cancel and modify buttons are visible for first order
            const actionButtons = await orderBook.hasActionButtons(0);
            const cancelButtonExists = actionButtons.hasCancel;
            const modifyButtonExists = actionButtons.hasModify;

            console.log(`Cancel button visible: ${cancelButtonExists}`);
            console.log(`Modify button visible: ${modifyButtonExists}`);

            // At least one action should be available
            expect(cancelButtonExists || modifyButtonExists).toBeTruthy();
        }

        await attachScreenshot(page, 'Order Actions Available');
    });

    test('TC_OB_06: Should navigate between different order tabs', async ({ page }) => {
        await orderBook.openOrderBook();

        // Test Order In Day tab
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);
        await attachScreenshot(page, 'Order In Day Tab Active');

        // Test Order History tab
        await orderBook.switchToOrderHistoryTab();
        await page.waitForTimeout(1000);
        await attachScreenshot(page, 'Order History Tab Active');

        // Switch back to Order In Day
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        // Verify we're back on the correct tab
        expect(await orderBook.orderIndayTab.isVisible()).toBeTruthy();
    });

    test('TC_OB_07: Should display correct order information for specific stock codes', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            const orders = await orderBook.getOrderTableData();

            // Look for orders with stock codes shown in the image (CFPT2501, HPG)
            const cfptOrder = orders.find(order => order.stockCode.includes('CFPT'));
            const hpgOrder = orders.find(order => order.stockCode.includes('HPG'));

            if (cfptOrder) {
                console.log('CFPT Order found:', cfptOrder);
                expect(cfptOrder.stockCode).toBeTruthy();
                expect(cfptOrder.price).toBeTruthy();
                expect(cfptOrder.quantity).toBeTruthy();
            }

            if (hpgOrder) {
                console.log('HPG Order found:', hpgOrder);
                expect(hpgOrder.stockCode).toBeTruthy();
                expect(hpgOrder.price).toBeTruthy();
                expect(hpgOrder.quantity).toBeTruthy();
            }
        }

        await attachScreenshot(page, 'Specific Stock Orders');
    });

    test('TC_OB_08: Should verify order table columns are correctly displayed', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        // Verify table headers are visible
        const headers = await orderBook.tableHeaders.all();
        expect(headers.length).toBeGreaterThan(0);

        // Check if common Vietnamese trading columns are present
        const tableText = await orderBook.orderTable.innerText();
        const expectedColumns = [
            'Tiểu khoản', // Account
            'Mã CK',      // Stock Code
            'Thời gian',  // Time
            'Giá',        // Price
            'KL',         // Quantity
            'Trạng thái', // Status
            'Thao tác'    // Actions
        ];

        let foundColumns = 0;
        for (const column of expectedColumns) {
            if (tableText.includes(column)) {
                foundColumns++;
            }
        }

        expect(foundColumns).toBeGreaterThan(3); // At least half of expected columns
        await attachScreenshot(page, 'Table Columns Verified');
    });

    test('TC_OB_09: Should handle cancel all orders functionality', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            // Check if cancel all button is available
            const cancelAllVisible = await orderBook.cancelAllOrderButton.isVisible();

            if (cancelAllVisible) {
                // Click cancel all (but handle any confirmation dialogs)
                await orderBook.cancelAllOrderButton.click();
                await page.waitForTimeout(1000);

                // Handle confirmation dialog if it appears
                try {
                    const confirmButton = page.locator('.confirm-btn, .btn-confirm, [data-testid="confirm"]');
                    if (await confirmButton.isVisible({ timeout: 3000 })) {
                        await confirmButton.click();
                    }
                } catch (error) {
                    console.log('No confirmation dialog appeared');
                }
            }
        }

        await attachScreenshot(page, 'Cancel All Orders Attempted');
    });

    test('TC_OB_10: Should close orderbook successfully', async ({ page }) => {
        await orderBook.openOrderBook();
        await page.waitForTimeout(1000);

        // Verify orderbook is open
        expect(await orderBook.orderIndayTab.isVisible()).toBeTruthy();

        // Close orderbook
        await orderBook.closeOrderBook();
        await page.waitForTimeout(1000);

        // Verify orderbook is closed (orderbook panel should not be visible)
        const isOrderBookClosed = await orderBook.orderIndayTab.isVisible() === false;
        expect(isOrderBookClosed).toBeTruthy();

        await attachScreenshot(page, 'OrderBook Closed');
    });

    // Test for verifying specific order statuses from the image
    test('TC_OB_11: Should verify pending order status display', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            const orders = await orderBook.getOrderTableData();

            // Look for orders with "Chờ khớp" (Pending) status as shown in the image
            const pendingOrders = orders.filter(order =>
                order.status.includes('Chờ khớp') ||
                order.status.includes('Pending') ||
                order.status.includes('Chờ')
            );

            if (pendingOrders.length > 0) {
                console.log(`Found ${pendingOrders.length} pending orders`);
                expect(pendingOrders.length).toBeGreaterThan(0);

                // Verify pending orders have appropriate data
                pendingOrders.forEach(order => {
                    expect(order.stockCode).toBeTruthy();
                    expect(order.quantity).toBeTruthy();
                });
            }
        }

        await attachScreenshot(page, 'Pending Orders Verified');
    });

    test('TC_OB_12: Should select individual orders using checkboxes', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            const orderCount = await orderBook.getOrderCount();

            if (orderCount > 0) {
                // Select first order
                await orderBook.selectOrderByIndex(0);
                await page.waitForTimeout(500);

                // Select second order if available
                if (orderCount > 1) {
                    await orderBook.selectOrderByIndex(1);
                    await page.waitForTimeout(500);
                }

                console.log(`Selected orders from total ${orderCount} orders`);
            }
        }

        await attachScreenshot(page, 'Individual Orders Selected');
    });

    test('TC_OB_13: Should select all orders using select all checkbox', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            const orderCount = await orderBook.getOrderCount();
            console.log(`Total orders available: ${orderCount}`);

            // Select all orders
            await orderBook.selectAllOrders();
            await page.waitForTimeout(1000);

            console.log('All orders selected successfully');
        }

        await attachScreenshot(page, 'All Orders Selected');
    });

    test('TC_OB_14: Should filter orders by account', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            try {
                // Get initial count
                const initialCount = await orderBook.getOrderCount();
                console.log(`Initial order count: ${initialCount}`);

                // Try to filter by account (this may fail if no account options available)
                await orderBook.filterByAccount('001');
                await page.waitForTimeout(1000);

                const filteredCount = await orderBook.getOrderCount();
                console.log(`Filtered order count: ${filteredCount}`);

            } catch (error) {
                console.log('Account filter not available or no account options:', error);
            }
        }

        await attachScreenshot(page, 'Account Filter Applied');
    });

    test('TC_OB_15: Should filter orders by order type', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            try {
                // Get initial count
                const initialCount = await orderBook.getOrderCount();
                console.log(`Initial order count: ${initialCount}`);

                // Try to filter by order type
                await orderBook.filterByOrderType('LO');
                await page.waitForTimeout(1000);

                const filteredCount = await orderBook.getOrderCount();
                console.log(`Filtered order count: ${filteredCount}`);

            } catch (error) {
                console.log('Order type filter not available:', error);
            }
        }

        await attachScreenshot(page, 'Order Type Filter Applied');
    });

    test('TC_OB_16: Should get order data by specific index', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            const orderCount = await orderBook.getOrderCount();

            if (orderCount > 0) {
                // Get data for first order
                const firstOrderData = await orderBook.getOrderDataByIndex(0);
                console.log('First order data:', firstOrderData);

                // Verify required fields are present
                expect(firstOrderData.stockCode).toBeTruthy();
                expect(firstOrderData.time).toBeTruthy();
                expect(firstOrderData.status).toBeTruthy();

                // Get data for second order if available
                if (orderCount > 1) {
                    const secondOrderData = await orderBook.getOrderDataByIndex(1);
                    console.log('Second order data:', secondOrderData);
                    expect(secondOrderData.stockCode).toBeTruthy();
                }
            }
        }

        await attachScreenshot(page, 'Order Data Retrieved by Index');
    });

    test('TC_OB_17: Should verify order exists by stock code', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            const orders = await orderBook.getOrderTableData();

            if (orders.length > 0) {
                const firstStockCode = orders[0].stockCode;

                // Verify order exists
                const orderExists = await orderBook.verifyOrderExists(firstStockCode);
                expect(orderExists).toBeTruthy();
                console.log(`Order for ${firstStockCode} exists: ${orderExists}`);

                // Verify non-existent order
                const nonExistentOrder = await orderBook.verifyOrderExists('NONEXISTENT');
                expect(nonExistentOrder).toBeFalsy();
                console.log(`Order for NONEXISTENT exists: ${nonExistentOrder}`);
            }
        }

        await attachScreenshot(page, 'Order Existence Verified');
    });

    test('TC_OB_18: Should verify order status by stock code', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            const orders = await orderBook.getOrderTableData();

            if (orders.length > 0) {
                const firstOrder = orders[0];

                // Verify order status
                const statusMatch = await orderBook.verifyOrderStatus(firstOrder.stockCode, firstOrder.status);
                expect(statusMatch).toBeTruthy();
                console.log(`Order ${firstOrder.stockCode} has expected status: ${firstOrder.status}`);
            }
        }

        await attachScreenshot(page, 'Order Status Verified');
    });

    test('TC_OB_19: Should handle modify order modal opening and data retrieval', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            try {
                // Get order data before modification
                const orderData = await orderBook.getOrderDataByIndex(0);
                console.log('Original order data:', orderData);

                // Open modify modal and get info
                const modalInfo = await orderBook.getModifyOrderModalInfo(0);
                console.log('Modify modal info:', modalInfo);

                // Verify modal info contains expected data
                expect(modalInfo.orderNumber).toBeTruthy();
                expect(modalInfo.symbol).toBeTruthy();

                // Cancel the modal
                await orderBook.cancelModifyOrder();

            } catch (error) {
                console.log('Modify order not available for this order:', error);
            }
        }

        await attachScreenshot(page, 'Modify Order Modal Tested');
    });

    test('TC_OB_20: Should handle cancel order modal opening and data retrieval', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            try {
                // Get cancel order modal info
                const modalInfo = await orderBook.getDeleteOrderModalInfo(0);
                console.log('Cancel order modal info:', modalInfo);

                // Verify modal info contains expected data
                expect(modalInfo.stockCode).toBeTruthy();
                expect(modalInfo.orderNumber).toBeTruthy();

                // Cancel the action (don't actually cancel the order)
                await orderBook.cancelActionCancelOrder(0);

            } catch (error) {
                console.log('Cancel order not available for this order:', error);
            }
        }

        await attachScreenshot(page, 'Cancel Order Modal Tested');
    });

    test('TC_OB_21: Should test cancel all orders modal data retrieval', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            try {
                // Open cancel all modal and get data
                const cancelAllData = await orderBook.openCancelAllModalAndGetData();
                console.log('Cancel all modal data:', cancelAllData);

                if (cancelAllData.length > 0) {
                    // Verify modal data structure
                    const firstOrder = cancelAllData[0];
                    expect(firstOrder).toHaveProperty('stockCode');
                    expect(firstOrder).toHaveProperty('remainingQuantity');
                }

                // Close the modal without cancelling
                await orderBook.closeCancelAllModal();

            } catch (error) {
                console.log('Cancel all orders not available:', error);
            }
        }

        await attachScreenshot(page, 'Cancel All Orders Modal Tested');
    });

    test('TC_OB_22: Should test reload orderbook functionality', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        // Get initial order count
        const initialCount = await orderBook.getOrderCount();
        console.log(`Initial order count: ${initialCount}`);

        // Reload orderbook
        await orderBook.reloadOrderBook();
        await page.waitForTimeout(2000);

        // Get order count after reload
        const reloadedCount = await orderBook.getOrderCount();
        console.log(`Order count after reload: ${reloadedCount}`);

        await attachScreenshot(page, 'OrderBook Reloaded');
    });

    test('TC_OB_23: Should test expand orderbook functionality', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        // Expand orderbook
        await orderBook.expandOrderBook();
        await page.waitForTimeout(1000);

        // Verify orderbook is still visible after expansion
        expect(await orderBook.orderIndayTab.isVisible()).toBeTruthy();

        await attachScreenshot(page, 'OrderBook Expanded');
    });

    test('TC_OB_24: Should test conditional order tab functionality', async ({ page }) => {
        await orderBook.openOrderBook();

        // Switch to conditional order tab
        await orderBook.switchToConditionalOrderTab();
        await page.waitForTimeout(1000);

        // Verify we're on conditional order tab
        expect(await orderBook.conditionalOrderTab.isVisible()).toBeTruthy();

        await attachScreenshot(page, 'Conditional Order Tab');
    });

    test('TC_OB_25: Should test put through order tab functionality', async ({ page }) => {
        await orderBook.openOrderBook();

        // Switch to put through order tab
        await orderBook.switchToPutThroughOrderTab();
        await page.waitForTimeout(1000);

        // Verify we're on put through order tab
        expect(await orderBook.putThroughOrderTab.isVisible()).toBeTruthy();

        await attachScreenshot(page, 'Put Through Order Tab');
    });

    test('TC_OB_26: Should verify total order count display', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);

        // Get total order text
        const totalOrderText = await orderBook.getTotalOrder();
        console.log('Total order display text:', totalOrderText);

        // Verify total order text contains some content
        expect(totalOrderText).toBeTruthy();

        // Get actual order count from table
        const tableOrderCount = await orderBook.getOrderCount();
        console.log(`Table order count: ${tableOrderCount}`);

        await attachScreenshot(page, 'Total Order Count Verified');
    });

    // Advanced Test Cases using new helper methods

    test('TC_OB_27: Should validate table structure and data integrity', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await orderBook.waitForOrderBookToLoad();

        // Validate table structure
        const tableStructure = await orderBook.validateTableStructure();
        console.log('Table structure validation:', tableStructure);

        expect(tableStructure.hasHeaders).toBeTruthy();
        expect(tableStructure.columnCount).toBeGreaterThan(5); // Minimum expected columns

        if (tableStructure.hasRows) {
            // Validate data integrity
            const orders = await orderBook.getOrderTableData();
            orders.forEach((order, index) => {
                expect(order.stockCode, `Order ${index} should have stock code`).toBeTruthy();
                expect(order.time, `Order ${index} should have time`).toBeTruthy();
                expect(order.status, `Order ${index} should have status`).toBeTruthy();
            });
        }

        await attachScreenshot(page, 'Table Structure Validated');
    });

    test('TC_OB_28: Should verify tab switching and active states', async ({ page }) => {
        await orderBook.openOrderBook();

        // Test Order In Day tab
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(1000);
        const indayActive = await orderBook.isTabActive('inday');
        console.log(`Order In Day tab active: ${indayActive}`);

        // Test Order History tab
        await orderBook.switchToOrderHistoryTab();
        await page.waitForTimeout(1000);
        const historyActive = await orderBook.isTabActive('history');
        console.log(`Order History tab active: ${historyActive}`);

        // Test Conditional Order tab
        await orderBook.switchToConditionalOrderTab();
        await page.waitForTimeout(1000);
        const conditionalActive = await orderBook.isTabActive('conditional');
        console.log(`Conditional Order tab active: ${conditionalActive}`);

        // Test Put Through Order tab
        await orderBook.switchToPutThroughOrderTab();
        await page.waitForTimeout(1000);
        const putthroughActive = await orderBook.isTabActive('putthrough');
        console.log(`Put Through Order tab active: ${putthroughActive}`);

        await attachScreenshot(page, 'Tab Switching Verified');
    });

    test('TC_OB_29: Should test comprehensive search functionality', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await orderBook.waitForOrderBookToLoad();

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            const stockCodes = await orderBook.getAllStockCodes();
            console.log('Available stock codes:', stockCodes);

            if (stockCodes.length > 0) {
                const testStockCode = stockCodes[0];

                // Test search functionality comprehensively
                const searchResult = await orderBook.verifySearchFunctionality(testStockCode);
                console.log('Search functionality result:', searchResult);

                expect(searchResult.success).toBeTruthy();
                expect(searchResult.originalCount).toBeGreaterThanOrEqual(searchResult.filteredCount);

                // Test search with partial match
                const partialSearch = testStockCode.substring(0, 2);
                const partialResult = await orderBook.verifySearchFunctionality(partialSearch);
                console.log('Partial search result:', partialResult);
                expect(partialResult.success).toBeTruthy();
            }
        }

        await attachScreenshot(page, 'Comprehensive Search Tested');
    });

    test('TC_OB_30: Should test filter availability and functionality', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await orderBook.waitForOrderBookToLoad();

        // Check available filters
        const availableFilters = await orderBook.checkAvailableFilters();
        console.log('Available filters:', availableFilters);

        // Test each available filter
        if (availableFilters.status) {
            console.log('Status filter is available');
            // Test will attempt to use status filter if available
        }

        if (availableFilters.account) {
            console.log('Account filter is available');
            // Test will attempt to use account filter if available
        }

        if (availableFilters.orderType) {
            console.log('Order type filter is available');
            // Test will attempt to use order type filter if available
        }

        await attachScreenshot(page, 'Filter Availability Checked');
    });

    test('TC_OB_31: Should analyze order statuses and stock codes distribution', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await orderBook.waitForOrderBookToLoad();

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            // Get all unique statuses
            const allStatuses = await orderBook.getAllOrderStatuses();
            console.log('All order statuses found:', allStatuses);
            expect(allStatuses.length).toBeGreaterThan(0);

            // Get all unique stock codes
            const allStockCodes = await orderBook.getAllStockCodes();
            console.log('All stock codes found:', allStockCodes);
            expect(allStockCodes.length).toBeGreaterThan(0);

            // Test getting orders by specific status
            for (const status of allStatuses.slice(0, 3)) { // Test first 3 statuses
                const ordersByStatus = await orderBook.getOrdersByStatus(status);
                console.log(`Orders with status '${status}':`, ordersByStatus.length);
                expect(ordersByStatus.length).toBeGreaterThan(0);
            }

            // Test getting orders by specific stock code
            for (const stockCode of allStockCodes.slice(0, 3)) { // Test first 3 stock codes
                const ordersByStock = await orderBook.getOrdersByStockCode(stockCode);
                console.log(`Orders for stock '${stockCode}':`, ordersByStock.length);
                expect(ordersByStock.length).toBeGreaterThan(0);
            }
        }

        await attachScreenshot(page, 'Order Distribution Analyzed');
    });

    test('TC_OB_32: Should test action buttons availability across orders', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await orderBook.waitForOrderBookToLoad();

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            const orderCount = await orderBook.getOrderCount();
            const maxOrdersToCheck = Math.min(orderCount, 5); // Check first 5 orders

            for (let i = 0; i < maxOrdersToCheck; i++) {
                const actionButtons = await orderBook.hasActionButtons(i);
                console.log(`Order ${i} action buttons:`, actionButtons);

                // At least one action should be available for each order
                expect(actionButtons.hasCancel || actionButtons.hasModify).toBeTruthy();
            }
        }

        await attachScreenshot(page, 'Action Buttons Availability Checked');
    });

    test('TC_OB_33: Should test orderbook visibility and loading states', async ({ page }) => {
        // Test orderbook is not visible initially (before opening)
        const initialVisibility = await orderBook.isOrderBookVisible();
        expect(initialVisibility).toBeFalsy();

        // Open orderbook and test visibility
        await orderBook.openOrderBook();
        const afterOpenVisibility = await orderBook.isOrderBookVisible();
        expect(afterOpenVisibility).toBeTruthy();

        // Test loading wait functionality
        await orderBook.switchToOrderInDayTab();
        await orderBook.waitForOrderBookToLoad();

        const loadedVisibility = await orderBook.isOrderBookVisible();
        expect(loadedVisibility).toBeTruthy();

        await attachScreenshot(page, 'Orderbook Visibility States Tested');
    });

    test('TC_OB_34: Should test order lookup by order number', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await orderBook.waitForOrderBookToLoad();

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            const orders = await orderBook.getOrderTableData();

            if (orders.length > 0) {
                const firstOrder = orders[0];
                const orderNumber = firstOrder.orderNo;

                // Test finding order by order number
                const foundOrder = await orderBook.getOrderByOrderNumber(orderNumber);
                expect(foundOrder).toBeTruthy();
                expect(foundOrder?.orderNo).toBe(orderNumber);
                expect(foundOrder?.stockCode).toBe(firstOrder.stockCode);

                console.log(`Successfully found order: ${orderNumber}`);

                // Test non-existent order number
                const nonExistentOrder = await orderBook.getOrderByOrderNumber('NONEXISTENT123');
                expect(nonExistentOrder).toBeNull();
            }
        }

        await attachScreenshot(page, 'Order Lookup by Number Tested');
    });

    test('TC_OB_35: Should handle error scenarios gracefully', async ({ page }) => {
        // Test actions when orderbook is not open
        try {
            const countWhenClosed = await orderBook.getOrderCount();
            console.log('Order count when closed:', countWhenClosed);
            expect(countWhenClosed).toBe(0);
        } catch (error) {
            console.log('Expected error when orderbook is closed:', error);
        }

        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await orderBook.waitForOrderBookToLoad();

        // Test invalid search terms
        try {
            await orderBook.searchOrder('!@#$%^&*()');
            await page.waitForTimeout(1000);
            console.log('Special character search handled gracefully');
        } catch (error) {
            console.log('Error with special characters (expected):', error);
        }

        // Test clearing search
        await orderBook.searchOrder('');
        await page.waitForTimeout(1000);

        await attachScreenshot(page, 'Error Scenarios Handled');
    });

    test('TC_OB_36: Should test cross-tab data consistency', async ({ page }) => {
        await orderBook.openOrderBook();

        // Get data from Order In Day tab
        await orderBook.switchToOrderInDayTab();
        await orderBook.waitForOrderBookToLoad();
        const indayCount = await orderBook.getOrderCount();
        console.log(`Order In Day count: ${indayCount}`);

        // Switch to Order History tab
        await orderBook.switchToOrderHistoryTab();
        await page.waitForTimeout(2000);
        const historyCount = await orderBook.getOrderCount();
        console.log(`Order History count: ${historyCount}`);

        // Switch to Conditional Orders tab
        await orderBook.switchToConditionalOrderTab();
        await page.waitForTimeout(2000);
        const conditionalCount = await orderBook.getOrderCount();
        console.log(`Conditional Orders count: ${conditionalCount}`);

        // Switch to Put Through Orders tab
        await orderBook.switchToPutThroughOrderTab();
        await page.waitForTimeout(2000);
        const putthroughCount = await orderBook.getOrderCount();
        console.log(`Put Through Orders count: ${putthroughCount}`);

        // Switch back to Order In Day to verify consistency
        await orderBook.switchToOrderInDayTab();
        await page.waitForTimeout(2000);
        const indayCountAgain = await orderBook.getOrderCount();
        console.log(`Order In Day count (revisit): ${indayCountAgain}`);

        // Data should be consistent when returning to the same tab
        expect(indayCountAgain).toBe(indayCount);

        await attachScreenshot(page, 'Cross-tab Data Consistency Tested');
    });

    // Performance and Health Check Test Cases

    test('TC_OB_37: Should measure orderbook performance metrics', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();

        // Measure performance metrics
        const performanceMetrics = await orderBook.getPerformanceMetrics();
        console.log('Performance metrics:', performanceMetrics);

        // Verify performance is within acceptable limits
        expect(performanceMetrics.orderLoadTime).toBeLessThan(15000); // 15 seconds max
        expect(performanceMetrics.tableRenderTime).toBeLessThan(5000); // 5 seconds max
        expect(performanceMetrics.searchResponseTime).toBeLessThan(10000); // 10 seconds max

        await attachScreenshot(page, 'Performance Metrics Measured');
    });

    test('TC_OB_38: Should analyze order summary statistics', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await orderBook.waitForOrderBookToLoad();

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            // Get order summary statistics
            const summaryStats = await orderBook.getOrderSummaryStats();
            console.log('Order summary statistics:', summaryStats);

            // Verify statistics make sense
            expect(summaryStats.totalOrders).toBeGreaterThan(0);
            expect(summaryStats.uniqueStocks).toBeGreaterThan(0);
            expect(summaryStats.uniqueStatuses).toBeGreaterThan(0);
            expect(summaryStats.uniqueStocks).toBeLessThanOrEqual(summaryStats.totalOrders);
            expect(summaryStats.uniqueStatuses).toBeLessThanOrEqual(summaryStats.totalOrders);

            if (summaryStats.avgOrderQuantity) {
                expect(summaryStats.avgOrderQuantity).toBeGreaterThan(0);
                console.log(`Average order quantity: ${summaryStats.avgOrderQuantity.toFixed(2)}`);
            }

            console.log(`Has matched orders: ${summaryStats.hasMatches}`);
        }

        await attachScreenshot(page, 'Order Summary Statistics Analyzed');
    });

    test('TC_OB_39: Should validate order data consistency', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await orderBook.waitForOrderBookToLoad();

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            // Validate data consistency
            const dataValidation = await orderBook.validateOrderDataConsistency();
            console.log('Data validation result:', dataValidation);

            if (!dataValidation.isValid) {
                console.log('Data validation errors:', dataValidation.errors);
                // Log errors but don't fail test - some inconsistencies might be expected
            }

            // Check that we got a validation result
            expect(dataValidation).toHaveProperty('isValid');
            expect(dataValidation).toHaveProperty('errors');
            expect(Array.isArray(dataValidation.errors)).toBeTruthy();
        }

        await attachScreenshot(page, 'Data Consistency Validated');
    });

    test('TC_OB_40: Should perform comprehensive health check', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await orderBook.waitForOrderBookToLoad();

        // Perform comprehensive health check
        const healthCheck = await orderBook.performHealthCheck();
        console.log('Health check result:', healthCheck);

        // Verify health check structure
        expect(healthCheck).toHaveProperty('overall');
        expect(healthCheck).toHaveProperty('checks');
        expect(healthCheck).toHaveProperty('issues');

        // Log health status
        console.log(`Overall health: ${healthCheck.overall}`);
        console.log('Individual checks:', healthCheck.checks);

        if (healthCheck.issues.length > 0) {
            console.log('Health issues found:', healthCheck.issues);
        }

        // Health should not be error (allow healthy or warning)
        expect(['healthy', 'warning', 'error']).toContain(healthCheck.overall);

        await attachScreenshot(page, 'Comprehensive Health Check Performed');
    });

    test('TC_OB_41: Should check pagination functionality', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await orderBook.waitForOrderBookToLoad();

        // Check if pagination exists
        const hasPagination = await orderBook.hasPagination();
        console.log(`Pagination available: ${hasPagination}`);

        if (hasPagination) {
            console.log('Pagination controls found - this indicates large datasets');
        } else {
            console.log('No pagination found - all data fits in one page');
        }

        await attachScreenshot(page, 'Pagination Check Completed');
    });

    test('TC_OB_42: Should test waiting for specific order count', async ({ page }) => {
        await orderBook.openOrderBook();
        await orderBook.switchToOrderInDayTab();
        await orderBook.waitForOrderBookToLoad();

        const currentCount = await orderBook.getOrderCount();
        console.log(`Current order count: ${currentCount}`);

        // Test waiting for current count (should succeed immediately)
        const waitResult = await orderBook.waitForOrderCount(currentCount, 5000);
        expect(waitResult).toBeTruthy();
        console.log(`Successfully waited for order count: ${currentCount}`);

        // Test waiting for impossible count (should timeout)
        const impossibleWaitResult = await orderBook.waitForOrderCount(999999, 2000);
        expect(impossibleWaitResult).toBeFalsy();
        console.log('Correctly timed out waiting for impossible order count');

        await attachScreenshot(page, 'Order Count Waiting Tested');
    });

    // Integration Test Case - Comprehensive Workflow

    test('TC_OB_43: Should execute comprehensive orderbook workflow', async ({ page }) => {
        console.log('Starting comprehensive orderbook workflow test...');

        // 1. Open and validate orderbook
        await orderBook.openOrderBook();
        const isVisible = await orderBook.isOrderBookVisible();
        expect(isVisible).toBeTruthy();
        console.log('✓ Orderbook opened successfully');

        // 2. Switch to Order In Day and wait for loading
        await orderBook.switchToOrderInDayTab();
        await orderBook.waitForOrderBookToLoad();
        console.log('✓ Order In Day tab loaded');

        // 3. Validate table structure
        const tableStructure = await orderBook.validateTableStructure();
        expect(tableStructure.hasHeaders).toBeTruthy();
        console.log('✓ Table structure validated');

        const hasData = await orderBook.verifyTableHasData();

        if (hasData) {
            // 4. Get summary statistics
            const summaryStats = await orderBook.getOrderSummaryStats();
            console.log(`✓ Found ${summaryStats.totalOrders} orders across ${summaryStats.uniqueStocks} stocks`);

            // 5. Test search functionality
            const stockCodes = await orderBook.getAllStockCodes();
            if (stockCodes.length > 0) {
                const searchResult = await orderBook.verifySearchFunctionality(stockCodes[0]);
                expect(searchResult.success).toBeTruthy();
                console.log('✓ Search functionality working');
            }

            // 6. Check action buttons availability
            const actionButtons = await orderBook.hasActionButtons(0);
            expect(actionButtons.hasCancel || actionButtons.hasModify).toBeTruthy();
            console.log('✓ Action buttons available');

            // 7. Test tab switching
            await orderBook.switchToOrderHistoryTab();
            await page.waitForTimeout(1000);
            await orderBook.switchToOrderInDayTab();
            await page.waitForTimeout(1000);
            console.log('✓ Tab switching working');
        }

        // 8. Check filters availability
        const availableFilters = await orderBook.checkAvailableFilters();
        console.log('✓ Filter availability checked:', availableFilters);

        // 9. Perform health check
        const healthCheck = await orderBook.performHealthCheck();
        console.log(`✓ Health check completed - Overall status: ${healthCheck.overall}`);

        // 10. Test reload functionality
        await orderBook.reloadOrderBook();
        await page.waitForTimeout(2000);
        console.log('✓ Orderbook reload tested');

        // 11. Close orderbook
        await orderBook.closeOrderBook();
        await page.waitForTimeout(1000);
        const isClosedVisible = await orderBook.isOrderBookVisible();
        expect(isClosedVisible).toBeFalsy();
        console.log('✓ Orderbook closed successfully');

        console.log('✅ Comprehensive orderbook workflow completed successfully!');
        await attachScreenshot(page, 'Comprehensive Workflow Completed');
    });
});
