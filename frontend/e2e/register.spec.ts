import { test, expect } from '@playwright/test';

/**
 * 회원가입 플로우 E2E 테스트
 */
test.describe('Register Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/register');
    });

    test('should show registration form', async ({ page }) => {
        // 회원가입 폼 요소 확인
        await expect(page.getByPlaceholder(/아이디|username/i)).toBeVisible();
        await expect(page.getByPlaceholder(/이메일|email/i)).toBeVisible();
        await expect(page.getByPlaceholder(/비밀번호|password/i).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /가입|register|sign up/i })).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
        // 잘못된 이메일 형식 입력
        await page.getByPlaceholder(/이메일|email/i).fill('invalid-email');
        await page.getByRole('button', { name: /가입|register|sign up/i }).click();

        // 이메일 형식 에러 메시지
        await expect(page.getByText(/이메일.*형식|valid.*email|invalid.*email/i)).toBeVisible({ timeout: 5000 });
    });

    test('should validate password match', async ({ page }) => {
        // 비밀번호 불일치 입력
        const passwordFields = page.getByPlaceholder(/비밀번호/i);
        await passwordFields.nth(0).fill('password123');
        await passwordFields.nth(1).fill('differentpassword');
        await page.getByRole('button', { name: /가입|register|sign up/i }).click();

        // 비밀번호 불일치 에러
        await expect(page.getByText(/일치|match/i)).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to login page', async ({ page }) => {
        // 로그인 링크 클릭
        await page.getByRole('link', { name: /로그인|login|sign in/i }).click();

        // URL 확인
        await expect(page).toHaveURL(/login/);
    });
});
