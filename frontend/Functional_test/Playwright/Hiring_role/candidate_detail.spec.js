import { expect, test } from '@playwright/test'

async function openFirstCandidate(page) {
  await page.goto('/hiring/candidates')
  await expect(page.getByRole('heading', { name: 'All talent near your business' })).toBeVisible()
  const card = page.locator('article.candidate-card').first()
  const name = (await card.locator('h3').innerText()).trim()
  await card.getByRole('button', { name: `View details for ${name}` }).click()
  await expect(page).toHaveURL(/\/hiring\/candidates\/[^/?]+$/)
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  return name
}

test('shortlists from the candidate detail page and keeps it after a reload', async ({ page }) => {
  await openFirstCandidate(page)
  const shortlist = page.getByRole('button', { name: 'Shortlist', exact: true })
  await expect(shortlist).toBeEnabled()
  await shortlist.click()
  await expect(page.getByRole('button', { name: 'Shortlisted', exact: true })).toBeDisabled()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Shortlisted', exact: true })).toBeDisabled()
})

test('reveals contact details on request and hides them by default', async ({ page }) => {
  await openFirstCandidate(page)
  await expect(page.getByRole('heading', { name: 'Contact' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Contact', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Contact' })).toBeVisible()
  await expect(page.getByRole('link', { name: /@/ })).toHaveAttribute('href', /^mailto:/)
})

test('returns to the candidate list from the detail page', async ({ page }) => {
  await openFirstCandidate(page)
  // The floating Menu button overlaps the right edge of the header, so click the
  // left side of the Back button instead of its centre.
  await page.getByRole('button', { name: 'Back', exact: true }).click({ position: { x: 8, y: 8 } })
  await expect(page).toHaveURL(/\/hiring\/candidates$/)
  await expect(page.getByRole('heading', { name: 'All talent near your business' })).toBeVisible()
})

test('explains an unknown candidate instead of failing silently', async ({ page }) => {
  await page.goto('/hiring/candidates/00000000-0000-0000-0000-000000000000')
  await expect(page.getByRole('alert')).toContainText('We could not load this candidate.')
})

test('shows no talent found when a search matches nobody', async ({ page }) => {
  await page.goto('/hiring/candidates?search=zzzzzzzznobodyhere')
  await expect(page.getByText('No talent found')).toBeVisible()
  await expect(page.getByText('0 results')).toBeVisible()
})
