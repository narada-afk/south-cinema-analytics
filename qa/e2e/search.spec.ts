import { test, expect } from '@playwright/test'

test.describe('Search Flow', () => {

  test('typing an actor name shows suggestions', async ({ page }) => {
    await page.goto('/')
    const searchInput = page.locator('input').first()
    await searchInput.click()
    await searchInput.fill('Rajini')
    // Suggestions dropdown should appear
    await expect(
      page.locator('text=Rajinikanth').first()
    ).toBeVisible({ timeout: 6_000 })
  })

  test('clicking a trending chip navigates to actor page', async ({ page }) => {
    await page.goto('/')
    // Trending chips (Rajinikanth, Chiranjeevi etc.) are always rendered
    const chip = page.locator('a[href*="/actors"]').first()
    await expect(chip).toBeVisible({ timeout: 8_000 })
    await chip.click()
    await page.waitForURL('**/actors/**', { timeout: 10_000 })
    expect(page.url()).toContain('/actors/')
  })

  test('searching and selecting Rajinikanth lands on actor page', async ({ page }) => {
    await page.goto('/')
    const searchInput = page.locator('input').first()
    await searchInput.click()
    await searchInput.fill('Rajinikanth')
    // The sort fix guarantees the exact match "Rajinikanth" is always the first suggestion.
    // We click the first [data-testid] row and assert it contains "Rajinikanth" to confirm correctness.
    const firstSuggestion = page.locator('[data-testid^="actor-suggestion-"]').first()
    await expect(firstSuggestion).toBeVisible({ timeout: 6_000 })
    await expect(firstSuggestion).toContainText('Rajinikanth')
    await firstSuggestion.click()
    await page.waitForURL('**/actors/**', { timeout: 10_000 })
    expect(page.url()).toContain('/actors/')
  })

})
