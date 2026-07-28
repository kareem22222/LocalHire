import { expect, test } from '@playwright/test'

test('opens the notification center and switches status tabs', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Notifications, \d+ unread/ }).click()
  const panel = page.getByRole('region', { name: 'Notifications' })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('tab', { name: /^unread\b/i })).toHaveAttribute('aria-selected', 'true')
  await panel.getByRole('tab', { name: /^read\b/i }).click()
  await expect(panel.getByRole('tab', { name: /^read\b/i })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
})

test('shows the full notification page for both status filters', async ({ page }) => {
  await page.goto('/notifications')
  await expect(page.getByRole('heading', { name: 'All notifications' })).toBeVisible()
  await expect(page.getByRole('tab', { name: /^unread\b/i })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: /^read\b/i }).click()
  await expect(page).toHaveURL(/\/notifications\?status=read$/)
  await expect(page.getByRole('tab', { name: /^read\b/i })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('button', { name: 'Back to dashboard' }).click()
  await expect(page).toHaveURL(/\/$/)
})
