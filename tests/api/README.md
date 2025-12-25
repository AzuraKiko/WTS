# LoginApi Tests

This directory contains comprehensive tests for the LoginApi class functionality.

## Test Files

- `login.spec.ts` - Main test file for LoginApi class
- `login3.spec.ts` - Existing integration test with order flow

## Test Coverage

The `login.spec.ts` file includes tests for:

### 1. LoginApi Method Tests

- ✅ Successful login with valid credentials
- ✅ Login without fcmToken
- ✅ Error handling for empty username/password
- ✅ Error handling for invalid credentials
- ✅ Network error handling
- ✅ Timeout scenarios

### 2. GenerateAuth Method Tests

- ✅ Successful authentication generation
- ✅ Error handling for empty parameters
- ✅ Invalid session handling

### 3. GetToken Method Tests

- ✅ Successful token retrieval
- ✅ Error handling for empty parameters

### 4. Integration Tests

- ✅ Full login flow (login → generateAuth → getToken)
- ✅ Session expiration scenarios
- ✅ Concurrent request handling

### 5. Edge Cases

- ✅ Very long input handling
- ✅ Special characters in credentials
- ✅ Null/undefined value handling

### 6. Performance Tests

- ✅ Rapid successive requests

## Running Tests

### Basic Commands

```bash
# Run all LoginApi tests
npx playwright test tests/api/login.spec.ts

# Run with browser UI
npx playwright test tests/api/login.spec.ts --headed

# Run in debug mode
npx playwright test tests/api/login.spec.ts --debug

# Generate HTML report
npx playwright test tests/api/login.spec.ts --reporter=html
```

### Using Test Runner Script

```bash
# Show available options
node run-login-tests.js --help

# Run all test configurations
node run-login-tests.js --all
```

### Running Specific Test Groups

```bash
# Run only login method tests
npx playwright test tests/api/login.spec.ts -g "loginApi method"
npm run test:prod:chrome tests/api/login.spec.ts -g "loginApi method"

# Run only generateAuth method
npx playwright test tests/api/login.spec.ts -g "generateAuth method"
npm run test:prod:chrome tests/api/login.spec.ts -g "generateAuth method"

# Run only error handling tests
npx playwright test tests/api/login.spec.ts -g "getToken method"
npm run test:prod:chrome tests/api/login.spec.ts -g "getToken method"

npx playwright test tests/api/login.spec.ts --workers=1 --project=Chrome
npm run test:prod:chrome tests/api/login.spec.ts --workers=1
npm run test:uat:chrome tests/api/login.spec.ts --workers=1

(workers=1 to run in serial, test cases chạy theo đúng thứ tự)

# Chạy test với giao diện hiển thị
npx playwright test tests/api/maket_data.spec.ts --headed

# Chạy test ở chế độ headless (mặc định)
npx playwright test tests/api/maket_data.spec.ts

# Nếu không có lỗi
$ npx tsc --noEmit tests/api/maket_data.spec.ts
# (không có output - nghĩa là OK)

# Nếu có lỗi
$ npx tsc --noEmit tests/api/maket_data.spec.ts
tests/api/maket_data.spec.ts:15:5 - error TS2304: Cannot find name 'apiHelper'

npx tsc tests/api/maket_data.spec.ts: Compile và tạo file .js
npx tsc --noEmit tests/api/maket_data.spec.ts: Chỉ kiểm tra lỗi
npx playwright test tests/api/maket_data.spec.ts: Chạy test thực tế


npx playwright test tests/api/order.spec.ts --grep "should handle order with invalid token"
npm run test:prod:chrome tests/api/order.spec.ts --grep "should handle order with invalid token"


```

## Environment Configuration

Tests use environment variables from `.env` file:

```bash
# Required environment variables
NODE_ENV=PROD  # or DEV, TEST
PROD_WEB_LOGIN_URL=https://your-api-base-url.com
```

## Test Structure

```typescript
test.describe("LoginApi Tests", () => {
  // Setup
  test.beforeEach(async () => {
    // Initialize LoginApi instance
  });

  // Test groups
  test.describe("loginApi method", () => {
    // Login-specific tests
  });

  test.describe("generateAuth method", () => {
    // Auth generation tests
  });

  test.describe("getToken method", () => {
    // Token retrieval tests
  });

  test.describe("Integration Tests", () => {
    // End-to-end flow tests
  });
});
```

## Expected Test Results

### Successful Tests

- ✅ Login with valid credentials returns session and CIF
- ✅ GenerateAuth creates authentication successfully
- ✅ GetToken retrieves token successfully
- ✅ Full integration flow works end-to-end

### Error Handling Tests

- ✅ Invalid credentials return error response
- ✅ Empty parameters throw appropriate errors
- ✅ Network errors are handled gracefully
- ✅ Timeout scenarios are handled properly

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**

   ```
   Error: Cannot read property 'WS_BASE_URL' of undefined
   ```

   Solution: Ensure `.env` file exists with proper configuration

2. **Network Connectivity Issues**

   ```
   Error: connect ECONNREFUSED
   ```

   Solution: Check if the API server is running and accessible

3. **Authentication Failures**
   ```
   Error: Invalid credentials
   ```
   Solution: Verify test credentials in the test file

### Debug Mode

Run tests in debug mode to step through execution:

```bash
npx playwright test tests/api/login.spec.ts --debug
```

### Verbose Logging

Enable verbose logging to see detailed API requests/responses:

```bash
DEBUG=playwright:* npx playwright test tests/api/login.spec.ts
```

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Add proper error handling
3. Include both positive and negative test cases
4. Add descriptive test names
5. Update this README if adding new test categories

## Dependencies

- Playwright Test
- Axios (via ApiHelper)
- dotenv
- crypto
- uuid

npm install qs
npm run test:uat:chrome tests/api/getTotalAssetAll.spec.ts
