import { spawn } from 'child_process';
import path from 'path';


function runUiTests() {
    // Thư mục project root: PM2 start từ root, nên dùng process.cwd()
    const rootDir = process.cwd();
    const scriptPath = path.join(rootDir, 'run-tests.sh');

    const pm2Name = process.env.UI_TESTS_PM2_NAME || 'ui-tests-cron';

    console.log(`[cronJob] Bắt đầu chạy UI tests với script: ${scriptPath}`);

    const child = spawn(scriptPath, ['--ui-tests'], {
        cwd: rootDir,
        stdio: 'inherit',
        shell: process.platform === 'win32', // phòng trường hợp chạy trên Windows
    });

    child.on('exit', (code, signal) => {
        if (signal) {
            console.error(`[cronJob] UI tests bị dừng bởi signal: ${signal}`);
            process.exitCode = 1;
            return;
        }

        if (code === 0) {
            console.log('[cronJob] UI tests hoàn thành thành công.');
        } else {
            console.error(`[cronJob] UI tests thất bại với exit code: ${code}`);
        }

        process.exitCode = code ?? 1;
    });

    child.on('error', (err) => {
        console.error('[cronJob] Lỗi khi spawn run-tests.sh:', err);
        process.exitCode = 1;
    });
}

runUiTests();

