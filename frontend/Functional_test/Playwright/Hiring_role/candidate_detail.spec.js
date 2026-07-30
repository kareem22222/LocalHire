import { expect, test, usesMockApi } from '../support/fixtures.js'

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

test('saves from the candidate detail page and keeps it after a reload', async ({ page }) => {
  await openFirstCandidate(page)
  const shortlist = page.getByRole('button', { name: 'Save candidate', exact: true })
  await expect(shortlist).toBeEnabled()
  await shortlist.click()
  await expect(page.getByRole('button', { name: 'Saved candidate', exact: true })).toBeDisabled()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Saved candidate', exact: true })).toBeDisabled()
})

test('reveals contact details on request and hides them by default', async ({ page }) => {
  await openFirstCandidate(page)
  await expect(page.getByRole('heading', { name: 'Contact' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Contact', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Contact' })).toBeVisible()
  await expect(page.getByRole('link', { name: /@/ })).toHaveAttribute('href', /^mailto:/)
})

test('downloads an applicants resume from candidate detail', async ({ page }) => {
  test.skip(!usesMockApi, 'Requires the mock API resume fixture.')
  await openFirstCandidate(page)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download resume', exact: true }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('candidate-resume.pdf')
})

test('explains that contact details are locked for a browsed-only candidate', async ({ page }) => {
  test.skip(!usesMockApi, 'Requires deterministic mock candidate data.')
  await page.goto('/hiring/candidates')
  const card = page.locator('article.candidate-card').nth(8)
  const name = (await card.locator('h3').innerText()).trim()
  await card.getByRole('button', { name: `View details for ${name}` }).click()
  await expect(page).toHaveURL(/\/hiring\/candidates\/[^/?]+$/)
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Contact', exact: true }).click()

  await expect(page.getByText('Contact details unlock once this candidate applies to one of your roles.')).toBeVisible()
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0)
})

test('does not unlock a candidate who applied to another employer', async ({ page }) => {
  test.skip(!usesMockApi, 'Requires mock API authentication.')
  const payload = Buffer.from(JSON.stringify({
    role: 'Hiring',
    userId: 'e0000000-0000-4000-8000-000000000002',
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  })).toString('base64url')
  await page.addInitScript((token) => {
    localStorage.setItem('localhire.accessToken', token)
  }, `mock.${payload}.localhire`)

  await openFirstCandidate(page)
  await page.getByRole('button', { name: 'Contact', exact: true }).click()

  await expect(page.getByText('Contact details unlock once this candidate applies to one of your roles.')).toBeVisible()
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0)
})

test('returns to the candidate list from the detail page', async ({ page }) => {
  await openFirstCandidate(page)
  await page.getByRole('button', { name: 'Back', exact: true }).press('Enter')
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
