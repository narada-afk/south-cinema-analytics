import { test, expect } from '@playwright/test'

test.describe('Actor Page', () => {

  test('Allu Arjun page loads with filmography', async ({ page }) => {
    await page.goto('/actors/allu-arjun')
    await page.waitForLoadState('networkidle')
    // Actor name should be visible in hero
    await expect(page.locator('text=Allu Arjun').first()).toBeVisible({ timeout: 10_000 })
    // Filmography section
    await expect(page.locator('text=Filmography').first()).toBeVisible({ timeout: 10_000 })
  })

  test('Actor page shows Directors section', async ({ page }) => {
    await page.goto('/actors/allu-arjun')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=Directors').first()).toBeVisible({ timeout: 10_000 })
  })

  test('Actor page shows Lead Actresses section', async ({ page }) => {
    await page.goto('/actors/allu-arjun')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=Lead Actress').first()).toBeVisible({ timeout: 10_000 })
  })

  test('Compare section shows only primary actors', async ({ page }) => {
    await page.goto('/actors/allu-arjun')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=Compare').first()).toBeVisible({ timeout: 10_000 })
    // Should NOT show known supporting actors in compare chips
    const nassar = page.locator('text=Nassar')
    await expect(nassar).not.toBeVisible()
  })

  test('invalid actor slug returns 404', async ({ page }) => {
    await page.goto('/actors/this-actor-does-not-exist-xyz')
    // Next.js notFound() renders our not-found.tsx (custom) or the built-in fallback.
    // Either way the user sees a 404 page — that's the real UX contract.
    // Custom page says "Page not found"; Next.js built-in says "This page could not be found."
    await expect(
      page.locator('text=Page not found').or(page.locator('text=This page could not be found'))
    ).toBeVisible({ timeout: 10_000 })
  })

  test('no JavaScript errors on actor page', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/actors/allu-arjun')
    await page.waitForLoadState('networkidle')
    const criticalErrors = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('Non-Error promise')
    )
    expect(criticalErrors, `JS errors: ${criticalErrors.join(', ')}`).toHaveLength(0)
  })

  test('no failed API calls on actor page', async ({ page }) => {
    const failed: string[] = []
    page.on('response', res => {
      if (res.url().includes('localhost:8000') && res.status() >= 500) {
        failed.push(`${res.status()} ${res.url()}`)
      }
    })
    await page.goto('/actors/allu-arjun')
    await page.waitForLoadState('networkidle')
    expect(failed, `Failed API calls: ${failed.join(', ')}`).toHaveLength(0)
  })

})
