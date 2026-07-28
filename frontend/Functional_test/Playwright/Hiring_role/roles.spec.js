import { expect, test } from '@playwright/test'
import { activateRoleCardControl } from '../support/helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/hiring/roles')
  await expect(page.getByRole('heading', { name: 'All open roles you are hiring for' })).toBeVisible()
})

test('lists open roles and paginates without a reload', async ({ page }) => {
  const cards = page.locator('article.hiring-role-card')
  await expect(cards.first()).toBeVisible()
  await page.getByRole('button', { name: /^Page 2 of / }).click()
  await expect(page).toHaveURL(/\/hiring\/roles\?page=2$/)
  await expect(cards.first()).toBeVisible()
  await page.getByRole('button', { name: /Previous/ }).click()
  await expect(page).toHaveURL(/\/hiring\/roles$/)
})

test('opens a role detail from its keyboard-accessible card control', async ({ page }) => {
  const card = page.locator('article.hiring-role-card').first()
  const title = await card.getAttribute('aria-label')
  await activateRoleCardControl(card, 'button[aria-label^="View details for"]')
  await expect(page).toHaveURL(/\/jobs\/[^/]+$/)
  await expect(page.getByRole('heading', { name: 'Job details' })).toBeVisible()
  await expect(page.getByLabel('Title')).toHaveValue(title)
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0)
})

test('opens applicants from the role count', async ({ page }) => {
  const card = page.locator('article.hiring-role-card').first()
  await expect(card).toBeVisible()
  await activateRoleCardControl(card, 'button[aria-label*="applicants for"]')
  await expect(page).toHaveURL(/\/hiring\/jobs\/[^/]+\/applicants$/)
  await expect(page.getByText(/applicants$/).first()).toBeVisible()
})

test('opens shortlisted candidates from the role count', async ({ page }) => {
  const card = page.locator('article.hiring-role-card').first()
  await expect(card).toBeVisible()
  await activateRoleCardControl(card, 'button[aria-label*="shortlisted for"]')
  await expect(page).toHaveURL(/\/hiring\/jobs\/[^/]+\/shortlisted$/)
  await expect(page.getByText(/shortlisted$/).first()).toBeVisible()
})

test('returns to the dashboard', async ({ page }) => {
  await page.getByRole('button', { name: 'Back to dashboard' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Open roles you are hiring for' })).toBeVisible()
})
