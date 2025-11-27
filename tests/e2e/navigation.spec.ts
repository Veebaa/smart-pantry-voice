import { test, expect } from '@playwright/test';

test.describe('Landing Page Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have sticky header visible when scrolling', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 500));
    
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
    await expect(header).toHaveCSS('position', 'sticky');
  });

  test('should display all feature cards', async ({ page }) => {
    await expect(page.getByText('Voice Control')).toBeVisible();
    await expect(page.getByText('Smart Meal Ideas')).toBeVisible();
    await expect(page.getByText('Auto Shopping Lists')).toBeVisible();
  });

  test('should display How It Works steps', async ({ page }) => {
    await expect(page.getByText('How It Works')).toBeVisible();
    await expect(page.getByText('Speak Naturally')).toBeVisible();
    await expect(page.getByText('Get Personalised Suggestions')).toBeVisible();
    await expect(page.getByText('Shop Smarter')).toBeVisible();
  });

  test('should have voice-enabled badge', async ({ page }) => {
    await expect(page.getByText('Voice-enabled')).toBeVisible();
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display properly on mobile', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('Sage')).toBeVisible();
    await expect(page.getByTestId('button-get-started-header')).toBeVisible();
    await expect(page.getByTestId('input-email')).toBeVisible();
  });

  test('should have readable feature cards on mobile', async ({ page }) => {
    await page.goto('/');
    
    const voiceControl = page.getByText('Voice Control');
    await expect(voiceControl).toBeVisible();
  });
});
