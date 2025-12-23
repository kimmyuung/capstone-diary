import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 테스트 설정
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './e2e',

    // 병렬 실행
    fullyParallel: true,

    // CI에서 retry
    retries: process.env.CI ? 2 : 0,

    // 워커 수 제한
    workers: process.env.CI ? 1 : undefined,

    // 리포터
    reporter: 'html',

    // 전역 설정
    use: {
        // 기본 URL
        baseURL: 'http://localhost:19006',  // Expo Web

        // 추적 기록
        trace: 'on-first-retry',

        // 스크린샷
        screenshot: 'only-on-failure',

        // 비디오 녹화
        video: 'on-first-retry',
    },

    // 브라우저 설정
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] },
        },
    ],

    // 개발 서버 자동 시작
    webServer: {
        command: 'npm run web',
        url: 'http://localhost:19006',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
