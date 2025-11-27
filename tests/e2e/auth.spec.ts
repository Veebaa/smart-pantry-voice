import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the landing page', async ({ page }) => {
    await expect(page.getByText('Sage')).toBeVisible();
    await expect(page.getByText('Your AI-Powered Kitchen Assistant')).toBeVisible();
  });

  test('should display sign in form', async ({ page }) => {
    await expect(page.getByTestId('input-email')).toBeVisible();
    await expect(page.getByTestId('input-password')).toBeVisible();
    await expect(page.getByTestId('button-signin')).toBeVisible();
  });

  test('should switch to sign up form', async ({ page }) => {
    await page.getByText('Create an account').click();
    
    await expect(page.getByTestId('button-signup')).toBeVisible();
    await expect(page.getByTestId('input-confirm-password')).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    await page.getByTestId('button-signin').click();
    
    await expect(page.getByText(/required|invalid/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.getByTestId('input-email').fill('invalid-email');
    await page.getByTestId('input-password').fill('Password123');
    await page.getByTestId('button-signin').click();
    
    await expect(page.getByText(/invalid|email/i)).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to auth section when clicking Get Started', async ({ page }) => {
    await page.getByTestId('button-get-started-header').click();
    
    await expect(page.getByText('Ready to Get Started?')).toBeInViewport();
  });
});

test.describe('Sign Up Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByText('Create an account').click();
  });

  test('should validate password requirements', async ({ page }) => {
    await page.getByTestId('input-email').fill('newuser@example.com');
    await page.getByTestId('input-password').fill('weak');
    await page.getByTestId('input-confirm-password').fill('weak');
    await page.getByTestId('button-signup').click();
    
    await expect(page.getByText(/password|8 characters|uppercase|lowercase|number/i)).toBeVisible({ timeout: 5000 });
  });

  test('should validate password confirmation matches', async ({ page }) => {
    await page.getByTestId('input-email').fill('newuser@example.com');
    await page.getByTestId('input-password').fill('ValidPass123');
    await page.getByTestId('input-confirm-password').fill('DifferentPass123');
    await page.getByTestId('button-signup').click();
    
    await expect(page.getByText(/match|don't match/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Theme Toggle', () => {
  test('should toggle between light and dark mode', async ({ page }) => {
    await page.goto('/');
    
    const themeToggle = page.getByRole('button', { name: /toggle theme/i });
    await expect(themeToggle).toBeVisible();
    
    const htmlElement = page.locator('html');
    const initialClass = await htmlElement.getAttribute('class');
    
    await themeToggle.click();
    
    const newClass = await htmlElement.getAttribute('class');
    expect(newClass).not.toBe(initialClass);
  });
});
