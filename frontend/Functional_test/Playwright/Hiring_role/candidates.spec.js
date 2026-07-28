import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/hiring/candidates')
  await expect(page.getByRole('heading', { name: 'All talent near your business' })).toBeVisible()
})

test('lists at most ten candidates per page and paginates when needed', async ({ page }) => {
  const candidates = page.locator('article.candidate-card')
  await expect(candidates.first()).toBeVisible()
  expect(await candidates.count()).toBeLessThanOrEqual(10)
  const secondPage = page.getByRole('button', { name: /^Page 2 of / })
  if (await secondPage.isVisible()) {
    await secondPage.click()
    await expect(page).toHaveURL(/\/hiring\/candidates\?page=2$/)
    await expect(candidates.first()).toBeVisible()
  }
})

test('opens complete candidate details', async ({ page }) => {
  const details = page.locator('article.candidate-card').first().getByRole('button', { name: /View details for/ })
  await expect(details).toBeVisible()
  await details.click()
  await expect(page).toHaveURL(/\/hiring\/candidates\/[^/?]+$/)
  await expect(page.getByRole('heading', { name: 'Professional profile' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Work preferences' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Candidate details' })).toBeVisible()
})

test('shows contact details from the candidate card', async ({ page }) => {
  await page.locator('article.candidate-card').first().getByRole('button', { name: 'Contact' }).click()
  await expect(page).toHaveURL(/\/hiring\/candidates\/[^/?]+\?contact=1$/)
  await expect(page.getByRole('heading', { name: 'Contact' })).toBeVisible()
  await expect(page.getByRole('link', { name: /@/ })).toHaveAttribute('href', /^mailto:/)
})

test('shortlists a candidate in account-scoped browser state', async ({ page }) => {
  const card = page.locator('article.candidate-card').first()
  await card.getByRole('button', { name: 'Shortlist', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Shortlisted', exact: true })).toBeDisabled()
  await page.reload()
  await expect(page.locator('article.candidate-card').first().getByRole('button', { name: 'Shortlisted', exact: true })).toBeDisabled()
})
