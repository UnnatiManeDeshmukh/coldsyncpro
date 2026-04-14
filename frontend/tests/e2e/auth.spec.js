import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:5173'

test.describe('Authentication', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto(BASE)
    await expect(page).toHaveTitle(/ColdSync/)
  })

  test('login page renders', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await expect(page.locator('input[type="text"], input[name="username"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('invalid login shows error', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.fill('input[type="text"], input[name="username"]', 'wronguser')
    await page.fill('input[type="password"]', 'wrongpass')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=/invalid|incorrect|error/i')).toBeVisible({ timeout: 5000 })
  })

  test('unauthenticated redirect to login', async ({ page }) => {
    await page.goto(`${BASE}/customer-dashboard`)
    await expect(page).toHaveURL(/\/login/)
  })

  test('admin route protected', async ({ page }) => {
    await page.goto(`${BASE}/admin-dashboard`)
    await expect(page).toHaveURL(/\/login/)
  })
})
