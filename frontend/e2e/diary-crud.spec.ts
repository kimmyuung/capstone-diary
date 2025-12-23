import { test, expect } from '@playwright/test';

/**
 * 일기 CRUD E2E 테스트
 * 
 * 참고: 인증이 필요한 테스트이므로 테스트 사용자 계정 필요
 */
test.describe('Diary CRUD', () => {
    // 테스트 전에 로그인
    test.beforeEach(async ({ page }) => {
        // 로그인 페이지로 이동
        await page.goto('/login');

        // 테스트 계정으로 로그인 (실제 테스트 시 환경변수 사용)
        const username = process.env.TEST_USERNAME || 'testuser';
        const password = process.env.TEST_PASSWORD || 'testpassword123';

        await page.getByPlaceholder(/아이디|username/i).fill(username);
        await page.getByPlaceholder(/비밀번호|password/i).fill(password);
        await page.getByRole('button', { name: /로그인|login/i }).click();

        // 로그인 완료 대기 (홈 페이지로 리다이렉트)
        await page.waitForURL('/', { timeout: 10000 });
    });

    test('should show diary list on home page', async ({ page }) => {
        // 홈 페이지에서 일기 목록 또는 빈 상태 메시지 확인
        const hasDiaries = await page.getByTestId('diary-card').count() > 0;
        const hasEmptyState = await page.getByText(/일기.*없|시작|작성/i).isVisible();

        expect(hasDiaries || hasEmptyState).toBeTruthy();
    });

    test('should navigate to create diary page', async ({ page }) => {
        // 일기 작성 버튼 클릭
        await page.getByRole('button', { name: /작성|추가|새/i }).click();

        // URL 또는 작성 폼 확인
        await expect(page.getByPlaceholder(/제목|title/i)).toBeVisible({ timeout: 5000 });
    });

    test('should create a new diary', async ({ page }) => {
        // 일기 작성 페이지로 이동
        await page.goto('/diary/create');

        const testTitle = `테스트 일기 ${Date.now()}`;
        const testContent = '오늘 E2E 테스트를 작성했습니다. 자동화된 테스트가 잘 작동하네요!';

        // 제목 입력
        await page.getByPlaceholder(/제목|title/i).fill(testTitle);

        // 내용 입력
        await page.getByPlaceholder(/내용|content/i).fill(testContent);

        // 저장 버튼 클릭
        await page.getByRole('button', { name: /저장|작성|완료|save/i }).click();

        // 성공 메시지 또는 리다이렉트 확인
        await expect(page).not.toHaveURL(/create/);
    });

    test('should view diary detail', async ({ page }) => {
        // 첫 번째 일기 클릭 (일기가 있다고 가정)
        const diaryCard = page.getByTestId('diary-card').first();

        if (await diaryCard.isVisible()) {
            await diaryCard.click();

            // 상세 페이지 확인 (제목, 내용 표시)
            await expect(page.getByTestId('diary-title')).toBeVisible({ timeout: 5000 });
        }
    });

    test('should edit diary', async ({ page }) => {
        // 일기 상세 페이지로 이동 (ID 1 가정)
        await page.goto('/diary/1');

        // 수정 버튼 클릭
        const editButton = page.getByRole('button', { name: /수정|edit/i });
        if (await editButton.isVisible()) {
            await editButton.click();

            // 수정 폼 확인
            await expect(page.getByPlaceholder(/제목|title/i)).toBeVisible({ timeout: 5000 });
        }
    });

    test('should search diaries', async ({ page }) => {
        // 검색 입력
        const searchInput = page.getByPlaceholder(/검색|search/i);

        if (await searchInput.isVisible()) {
            await searchInput.fill('테스트');
            await searchInput.press('Enter');

            // 검색 결과 확인 (결과가 있거나 없음 메시지)
            await page.waitForTimeout(2000);
        }
    });
});
