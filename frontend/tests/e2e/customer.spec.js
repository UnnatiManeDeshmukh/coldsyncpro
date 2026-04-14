import { test, expect } from '@playwright/test'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const CUSTOMER_USER = process.env.TEST_CUSTOMER_USER || 'testcustomer'
const CUSTOMER_PASS = process.env.TEST_CUSTOMER_PASS || 'testpass123'

// Helper: login as customer
async function loginAsCustomer(page) {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="text"], input[name="username"]', CUSTOMER_USER)
  await page.fill('input[type="password"]', CUSTOMER_PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(/customer-dashboard|login/, { timeout: 8000 })
}

test.describe('Customer flows', () => {
  test('customer dashboard loads after login', async ({ page }) => {
    await loginAsCustomer(page)
    const url = page.url()
    if (url.includes('login')) {
      test.skip(true, 'Test credentials not configured — set TEST_CUSTOMER_USER/PASS env vars')
    }
    await expect(page.locator('text=/ColdSync/i')).toBeVisible()
  })

  test('shop catalog page loads', async ({ page }) => {
    await loginAsCustomer(page)
    if (page.url().includes('login')) test.skip(true, 'No test credentials')
    await page.goto(`${BASE}/catalog`)
    await expect(page.locator('text=/All Products|Shop/i')).toBeVisible({ timeout: 8000 })
  })

  test('pay now page renders UPI section', async ({ page }) => {
    await loginAsCustomer(page)
    if (page.url().includes('login')) test.skip(true, 'No test credentials')
    await page.goto(`${BASE}/pay-now`)
    await expect(page.locator('text=/UPI|Scan|Pay/i')).toBeVisible({ timeout: 8000 })
  })
})
