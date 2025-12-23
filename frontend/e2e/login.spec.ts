import { test, expect } from '@playwright/test';

/**
 * 로그인 플로우 E2E 테스트
 */
test.describe('Login Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
    });

    test('should show login form', async ({ page }) => {
        // 로그인 폼 요소 확인
        await expect(page.getByPlaceholder(/아이디|username/i)).toBeVisible();
        await expect(page.getByPlaceholder(/비밀번호|password/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /로그인|login/i })).toBeVisible();
    });

    test('should show error on empty submission', async ({ page }) => {
        // 빈 폼 제출
        await page.getByRole('button', { name: /로그인|login/i }).click();

        // 에러 메시지 확인 (정확한 텍스트는 앱에 따라 다름)
        await expect(page.getByText(/입력|required|필수/i)).toBeVisible({ timeout: 5000 });
    });

    test('should show error on invalid credentials', async ({ page }) => {
        // 잘못된 자격 증명 입력
        await page.getByPlaceholder(/아이디|username/i).fill('wronguser');
        await page.getByPlaceholder(/비밀번호|password/i).fill('wrongpassword');
        await page.getByRole('button', { name: /로그인|login/i }).click();

        // 에러 메시지 확인
        await expect(page.getByText(/잘못|invalid|incorrect|틀린/i)).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to register page', async ({ page }) => {
        // 회원가입 링크 클릭
        await page.getByRole('link', { name: /회원가입|register|sign up/i }).click();

        // URL 확인
        await expect(page).toHaveURL(/register/);
    });

    test('should navigate to forgot password page', async ({ page }) => {
        // 비밀번호 찾기 링크 클릭
        await page.getByRole('link', { name: /비밀번호.*찾기|forgot.*password/i }).click();

        // URL 확인
        await expect(page).toHaveURL(/forgot-password/);
    });
});
