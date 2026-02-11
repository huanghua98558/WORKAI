import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 配置文件
 * 用于前端自动化测试
 */
export default defineConfig({
  // 测试目录
  testDir: './tests/e2e',

  // 测试文件匹配模式
  testMatch: '**/*.spec.ts',

  // 完全并行运行测试
  fullyParallel: true,

  // 失败时仅重试一次
  retries: 1,

  // 工作进程数
  workers: process.env.CI ? 2 : 4,

  // 测试报告配置
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list']
  ],

  use: {
    // 基础 URL
    baseURL: 'http://localhost:5000',

    // 跟踪配置（首次失败时记录）
    trace: 'on-first-retry',

    // 截图配置（仅失败时截图）
    screenshot: 'only-on-failure',

    // 视频配置（仅失败时录制）
    video: 'retain-on-failure',

    // 超时配置
    actionTimeout: 10000,
    navigationTimeout: 30000,

    // 忽略 HTTPS 错误（如果是本地开发）
    ignoreHTTPSErrors: true,
  },

  // 测试超时
  timeout: 60000,

  // 项目配置（不同浏览器）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // 开发服务器配置
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
