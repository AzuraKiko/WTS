module.exports = {
  apps: [
    {
      name: 'ui-tests-cron',
      // Chạy trực tiếp file TypeScript bằng ts-node
      script: 'helpers/cronJob.ts',
      interpreter: 'node',
      node_args: '-r ts-node/register',

      /**
       * Cron expression:
       *  - VD: "15 8 6 2 *" = 8h15 ngày 06/02 hằng năm
       *  - Kết hợp với UI_TESTS_CRON_YEAR để giới hạn theo NĂM cụ thể.
       */
      cron_restart: '50 23 5 2 *', // 23:35 ngày 05/02 hằng năm

      env: {
        // Tên process để script tự pm2 delete sau khi chạy xong
        UI_TESTS_PM2_NAME: 'ui-tests-cron',
      },
    },
  ],
};

// # build trước (nếu dùng dist)
// npm run build

// # load ecosystem
// pm2 start ecosystem.config.js

// # kiểm tra
// pm2 list
// pm2 logs ui-tests-cron