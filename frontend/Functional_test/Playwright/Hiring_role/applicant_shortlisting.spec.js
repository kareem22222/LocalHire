import { expect, test } from '@playwright/test'
import { activateRoleCardControl } from '../support/helpers.js'

// Opens the applicants list of a role that actually has applicants. The card back
// is aria-hidden until the card flips, so the role is picked by the raw
// aria-label attribute rather than by role.
async function openApplicants(page) {
  await page.goto('/hiring/roles')
  await expect(page.getByRole('heading', { name: 'All open roles you are hiring for' })).toBeVisible()
  const card = page.locator('article.hiring-role-card')
    .filter({ hasNot: page.locator('[aria-label^="View 0 applicants"]') })
    .first()
  await expect(card).toBeVisible()
  await activateRoleCardControl(card, 'button[aria-label*="applicants for"]')
  await expect(page).toHaveURL(/\/hiring\/jobs\/[^/]+\/applicants$/)
  return page.url()
}

function labelCount(label) {
  return Number(label.match(/\d+/)[0])
}

// Opens a role that still has at least one applicant who is not shortlisted yet.
// Shortlisting is permanent, so earlier runs gradually use up a role's applicants.
async function openApplicantsWithOpenCandidates(page) {
  await page.goto('/hiring/roles')
  await expect(page.getByRole('heading', { name: 'All open roles you are hiring for' })).toBeVisible()
  const cards = page.locator('article.hiring-role-card')
  await expect(cards.first()).toBeVisible()

  const total = await cards.count()
  for (let index = 0; index < total; index += 1) {
    const card = cards.nth(index)
    const applicants = labelCount(await card.locator('button[aria-label*="applicants for"]').getAttribute('aria-label'))
    const shortlisted = labelCount(await card.locator('button[aria-label*="shortlisted for"]').getAttribute('aria-label'))
    if (applicants > shortlisted) {
      await activateRoleCardControl(card, 'button[aria-label*="applicants for"]')
      await expect(page).toHaveURL(/\/hiring\/jobs\/[^/]+\/applicants$/)
      return page.url()
    }
  }
  throw new Error('No role on the first page has an applicant left to shortlist.')
}

test('shortlists an applicant and keeps the status on the server', async ({ page }) => {
  const applicantsUrl = await openApplicantsWithOpenCandidates(page)
  const target = page.locator('article.candidate-card')
    .filter({ hasNot: page.locator('button:disabled') })
    .first()
  await expect(target).toBeVisible()
  const name = (await target.locator('h3').innerText()).trim()

  await target.getByRole('button', { name: 'Shortlist', exact: true }).click()

  // The page reloads the applicants from the API after the status change.
  const updated = page.locator('article.candidate-card').filter({ hasText: name }).first()
  await expect(updated.getByRole('button', { name: 'Shortlisted', exact: true })).toBeDisabled()

  await page.reload()
  await expect(page.locator('article.candidate-card').filter({ hasText: name }).first()
    .getByRole('button', { name: 'Shortlisted', exact: true })).toBeDisabled()

  // The same applicant now shows up in the shortlisted view of that role.
  await page.goto(applicantsUrl.replace('/applicants', '/shortlisted'))
  await expect(page.getByText(/shortlisted$/).first()).toBeVisible()
  await expect(page.locator('article.candidate-card').filter({ hasText: name }).first()).toBeVisible()
})

test('reports a failed shortlist without changing the row', async ({ page }) => {
  await openApplicantsWithOpenCandidates(page)
  await page.route('**/api/hiring/jobs/*/applications/*/shortlist', (route) => route.fulfill({
    status: 500,
    json: { message: 'Server error.' },
  }))

  const target = page.locator('article.candidate-card')
    .filter({ hasNot: page.locator('button:disabled') })
    .first()
  const name = (await target.locator('h3').innerText()).trim()
  await target.getByRole('button', { name: 'Shortlist', exact: true }).click()

  await expect(page.getByRole('alert')).toContainText('Could not shortlist this candidate. Please try again.')
  await expect(page.locator('article.candidate-card').filter({ hasText: name }).first()
    .getByRole('button', { name: 'Shortlist', exact: true })).toBeEnabled()
})

test('shows the applicants count and paginates long applicant lists', async ({ page }) => {
  await openApplicants(page)
  const cards = page.locator('article.candidate-card')
  await expect(cards.first()).toBeVisible()
  expect(await cards.count()).toBeLessThanOrEqual(10)
  await expect(page.getByText(/^\d+ applicants$/)).toBeVisible()
})

test('shows the empty state for a role with no applicants', async ({ page }) => {
  await page.route('**/api/hiring/jobs/*/applications', (route) => route.fulfill({ json: [] }))
  await page.goto('/hiring/jobs/00000000-0000-0000-0000-000000000000/applicants')
  await expect(page.getByText('Nothing here yet')).toBeVisible()
  await expect(page.getByText('No one has applied to this role yet.')).toBeVisible()
  await page.getByRole('button', { name: 'Back to dashboard' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('explains an empty shortlist for a role', async ({ page }) => {
  await page.route('**/api/hiring/jobs/*/applications', (route) => route.fulfill({ json: [] }))
  await page.goto('/hiring/jobs/00000000-0000-0000-0000-000000000000/shortlisted')
  await expect(page.getByText('No candidates shortlisted yet. Open the applicants list and shortlist the ones you like.')).toBeVisible()
})
