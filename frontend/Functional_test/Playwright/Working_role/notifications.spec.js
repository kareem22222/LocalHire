import { expect, test } from '@playwright/test'

test('opens and closes the worker notification center', async ({ page }) => {
  await page.goto('/')
  const bell = page.getByRole('button', { name: /Notifications, \d+ unread/ })
  await bell.click()
  const panel = page.getByRole('region', { name: 'Notifications' })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('tab', { name: /^unread\b/i })).toHaveAttribute('aria-selected', 'true')
  await page.locator('main').click({ position: { x: 1, y: 1 } })
  await expect(panel).toBeHidden()
})

test('filters the full worker notification history', async ({ page }) => {
  await page.goto('/notifications')
  await expect(page.getByRole('heading', { name: 'All notifications' })).toBeVisible()
  await page.getByRole('tab', { name: /^read\b/i }).click()
  await expect(page).toHaveURL(/\/notifications\?status=read$/)
  await page.getByRole('tab', { name: /^unread\b/i }).click()
  await expect(page).toHaveURL(/\/notifications\?status=unread$/)
})
