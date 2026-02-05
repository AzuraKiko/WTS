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
npx playwright install chrome firefox msedge
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

## 5. Chạy tests định kỳ bằng cron (PM2)

Nếu muốn tự động chạy bộ UI tests theo lịch, project đã chuẩn bị sẵn:

- Script: `helpers/cronJob.ts` (gọi `./run-tests.sh --ui-tests`)
- Cấu hình PM2: `ecosystem.config.js` (dùng `ts-node` để chạy file TS)

### 5.1. Cài PM2 (nếu chưa có)

```bash
npm install -g pm2
pm2 -v
```

Nếu không muốn cài global:

```bash
npm install pm2 --save-dev
npx pm2 -v
```

### 5.2. Cấu hình lịch chạy trong `ecosystem.config.js`

File `ecosystem.config.js` đã được cấu hình sẵn (ví dụ):

```js
module.exports = {
  apps: [
    {
      name: 'ui-tests-cron',
      script: 'helpers/cronJob.ts',
      interpreter: 'node',
      node_args: '-r ts-node/register',
      cron_restart: '21 23 5 2 *', // ví dụ: 23:21 ngày 05/02 hằng năm
      env: {
        UI_TESTS_PM2_NAME: 'ui-tests-cron',
      },
    },
  ],
};
```

- Thay giá trị `cron_restart` bằng cron expression đúng với lịch bạn muốn.
- `cronJob` sẽ gọi: `./run-tests.sh --ui-tests` tại thư mục root project.

### 5.3. Khởi động / cập nhật PM2

```bash
cd /Users/azurakiko/WTS   # hoặc cd tới root repo của bạn

npm install               # cài dependencies (ts-node, playwright, ...)
pm2 delete ui-tests-cron || true
pm2 start ecosystem.config.js
pm2 restart ui-tests-cron --update-env   # khi bạn đổi code hoặc env
```

### 5.4. Tham khảo nhanh cú pháp cron

```text
* * * * *
| | | | |
| | | | +--- Thứ trong tuần (0–7, 0/7 = CN, 1 = Thứ 2, …)
| | | +----- Tháng (1–12)
| | +------- Ngày trong tháng (1–31)
| +--------- Giờ (0–23)
+----------- Phút (0–59)
```

Một số ví dụ:

- 8h15 sáng mỗi ngày: `15 8 * * *`
- 8h15 sáng, chỉ Thứ 2 đến Thứ 6: `15 8 * * 1-5`
- 1h sáng mỗi ngày: `0 1 * * *`

Sau khi chỉnh `cron_restart`, chỉ cần:

```bash
pm2 restart ui-tests-cron --update-env
```

### 5.5. Một số lệnh PM2 hữu ích

```bash
pm2 list                     # xem danh sách process
pm2 logs ui-tests-cron       # xem log của cron job
pm2 stop ui-tests-cron       # dừng
pm2 delete ui-tests-cron     # xóa job
pm2 save                     # lưu cấu hình để reboot máy vẫn còn
pm2 restart ui-tests-cron --update-env   # reload pm2 sau khi đổi config/code
```

---

## 6. Xem báo cáo kết quả

Sau khi chạy xong, để xem báo cáo chi tiết:

```bash
npx playwright show-report
```

## 7. Lưu ý

- Thông tin tài khoản đăng nhập đang được hardcode trong file test. Hãy thay đổi cho phù hợp với môi trường của bạn.
- Không commit thông tin nhạy cảm lên repository công khai.

## 8. Tài liệu tham khảo

- [Tài liệu Playwright](https://playwright.dev/docs/intro)
