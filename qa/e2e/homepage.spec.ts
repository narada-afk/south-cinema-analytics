import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {

  test('loads with correct title and branding', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/SouthCineStats/i)
    // Brand name visible in header
    await expect(page.locator('text=SouthCine')).toBeVisible()
  })

  test('hero search bar is visible and focusable', async ({ page }) => {
    await page.goto('/')
    const searchInput = page.locator('input[type="text"], input[placeholder*="actor"], input[placeholder*="search"], input[placeholder*="Search"]').first()
    await expect(searchInput).toBeVisible()
    await searchInput.click()
    await expect(searchInput).toBeFocused()
  })

  test('insights carousel renders at least one card', async ({ page }) => {
    await page.goto('/')
    // Wait for the carousel section
    await expect(page.locator('text=Did you know').or(page.locator('text=DID YOU KNOW'))).toBeVisible({ timeout: 10_000 })
    // At least one insight card should be present
    const cards = page.locator('a[href*="/actors"], a[href*="/compare"]')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
  })

  test('no JavaScript errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const criticalErrors = errors.filter(e =>
      !e.includes('ResizeObserver') &&   // benign browser quirk
      !e.includes('Non-Error promise')   // benign async warning
    )
    expect(criticalErrors, `JS errors: ${criticalErrors.join(', ')}`).toHaveLength(0)
  })

  test('no failed API requests', async ({ page }) => {
    const failed: string[] = []
    page.on('response', res => {
      if (res.url().includes('localhost:8000') && res.status() >= 500) {
        failed.push(`${res.status()} ${res.url()}`)
      }
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(failed, `Failed API calls: ${failed.join(', ')}`).toHaveLength(0)
  })

})
