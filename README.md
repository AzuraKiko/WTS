# Hướng dẫn Automation Test với Playwright

Thư mục này chứa các kịch bản kiểm thử tự động cho webtrading Pinetree sử dụng Playwright.

## 1. Cài đặt môi trường

**Yêu cầu:**
- Node.js >= 16.x
- npm hoặc yarn

**Cài đặt dependencies:**
```bash
npm install
```
hoặc
```bash
yarn install
```

**Cài đặt trình duyệt cho Playwright:**
```bash
npx playwright install
```

## 2. Cấu trúc thư mục

- `tests/webtrading.spec.ts`: Chứa các test case tự động hóa cho webtrading.

## 3. Chạy test

**Chạy toàn bộ test:**
```bash
npx playwright test
```

**Chạy một file test cụ thể:**
```bash
npx playwright test tests/webtrading.spec.ts
```

**Chạy test với giao diện trình duyệt (headed):**
```bash
npx playwright test --headed
```

## 4. Ghi lại và sinh mã test tự động với Playwright Codegen

Playwright hỗ trợ ghi lại thao tác trên trình duyệt và sinh mã test tự động bằng lệnh:
```bash
npx playwright codegen https://trade.pinetree.vn
```

- Sau khi chạy lệnh trên, một cửa sổ trình duyệt sẽ mở ra. Bạn thao tác thủ công trên web, Playwright sẽ tự động sinh mã test tương ứng.
- Có thể copy mã này vào file test để chỉnh sửa và sử dụng lại.

## 5. Xem báo cáo kết quả

Sau khi chạy xong, để xem báo cáo chi tiết:
```bash
npx playwright show-report
```

## 6. Lưu ý

- Thông tin tài khoản đăng nhập đang được hardcode trong file test. Hãy thay đổi cho phù hợp với môi trường của bạn.
- Không commit thông tin nhạy cảm lên repository công khai.

## 7. Tài liệu tham khảo

- [Tài liệu Playwright](https://playwright.dev/docs/intro) 