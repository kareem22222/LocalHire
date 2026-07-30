import { expect, test } from '../support/fixtures.js'
import { activateRoleCardControl } from '../support/helpers.js'

test('shows only roles with shortlisted candidates and paginates them', async ({ page }) => {
  await page.goto('/hiring/shortlists')
  await expect(page.getByRole('heading', { name: 'Review your shortlists' })).toBeVisible()
  await expect(page.locator('article.hiring-role-card').first()).toBeVisible()
  await page.getByRole('button', { name: /^Page 2 of / }).click()
  await expect(page).toHaveURL(/\/hiring\/shortlists\?page=2$/)
})

test('opens the shortlisted candidates for a role', async ({ page }) => {
  await page.goto('/hiring/shortlists')
  const role = page.locator('article.hiring-role-card').first()
  await expect(role).toBeVisible()
  await activateRoleCardControl(role, 'button.hiring-role-card__link')
  await expect(page).toHaveURL(/\/hiring\/jobs\/[^/]+\/shortlisted$/)
  await expect(page.getByText(/shortlisted$/).first()).toBeVisible()
  const cards = page.locator('article.candidate-card')
  await expect(cards.first()).toBeVisible()
  await expect(cards.first().locator('.candidate-card__status')).toHaveText('Shortlisted')
  await expect(cards.first().locator('.candidate-actions button')).toHaveText(['Hire', 'Reject', 'Contact'])
})

test('opens candidate detail and contact information from applicants', async ({ page }) => {
  await page.goto('/hiring/roles')
  // Roles without applicants exist (a freshly posted one sorts first), so pick a
  // role that has some. The card back is aria-hidden until the card flips, hence
  // the attribute selector instead of a role selector.
  const role = page.locator('article.hiring-role-card')
    .filter({ hasNot: page.locator('[aria-label^="View 0 applicants"]') })
    .first()
  await expect(role).toBeVisible()
  await activateRoleCardControl(role, 'button[aria-label*="applicants for"]')
  const candidate = page.locator('article.candidate-card').first()
  await candidate.getByRole('button', { name: 'Contact' }).click()
  await expect(page).toHaveURL(/\/hiring\/candidates\/[^/?]+\?contact=1$/)
  await expect(page.getByRole('heading', { name: 'Contact' })).toBeVisible()
})
