import { expect, test } from '../support/fixtures.js'
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
    .filter({ has: page.getByRole('button', { name: 'Shortlist', exact: true }) })
    .first()
  await expect(target).toBeVisible()
  const name = (await target.locator('h3').innerText()).trim()

  await target.getByRole('button', { name: 'Shortlist', exact: true }).click()

  // The row updates immediately from the decision response.
  const updated = page.locator('article.candidate-card').filter({ hasText: name }).first()
  await expect(updated).toContainText('Shortlisted')
  await expect(updated.getByRole('button', { name: 'Hire', exact: true })).toBeVisible()
  await expect(updated.getByRole('button', { name: 'Reject', exact: true })).toBeVisible()

  await page.reload()
  const persisted = page.locator('article.candidate-card').filter({ hasText: name }).first()
  await expect(persisted).toContainText('Shortlisted')
  await expect(persisted.getByRole('button', { name: 'Hire', exact: true })).toBeVisible()

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
    .filter({ has: page.getByRole('button', { name: 'Shortlist', exact: true }) })
    .first()
  const name = (await target.locator('h3').innerText()).trim()
  await target.getByRole('button', { name: 'Shortlist', exact: true }).click()

  await expect(page.getByRole('alert')).toContainText('Could not shortlist this candidate. Please try again.')
  await expect(page.locator('article.candidate-card').filter({ hasText: name }).first()
    .getByRole('button', { name: 'Shortlist', exact: true })).toBeEnabled()
})

test('hires a shortlisted applicant and keeps the terminal status', async ({ page }) => {
  await openApplicants(page)
  const target = page.locator('article.candidate-card')
    .filter({ has: page.getByRole('button', { name: 'Hire', exact: true }) })
    .first()
  await expect(target).toBeVisible()
  const name = (await target.locator('h3').innerText()).trim()

  await target.getByRole('button', { name: 'Hire', exact: true }).click()

  const updated = page.locator('article.candidate-card').filter({ hasText: name }).first()
  await expect(updated).toContainText('Hired')
  await expect(updated.locator('.candidate-actions')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('article.candidate-card').filter({ hasText: name }).first())
    .toContainText('Hired')
})

test('confirms and persists rejecting an applied applicant', async ({ page }) => {
  await openApplicantsWithOpenCandidates(page)
  const target = page.locator('article.candidate-card')
    .filter({ has: page.getByRole('button', { name: 'Shortlist', exact: true }) })
    .first()
  await expect(target).toBeVisible()
  const name = (await target.locator('h3').innerText()).trim()
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('cannot be undone')
    await dialog.accept()
  })

  await target.getByRole('button', { name: 'Reject', exact: true }).click()

  const updated = page.locator('article.candidate-card').filter({ hasText: name }).first()
  await expect(updated).toContainText('Rejected')
  await expect(updated.locator('.candidate-actions')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('article.candidate-card').filter({ hasText: name }).first())
    .toContainText('Rejected')
})

test('shows the applicants count and paginates long applicant lists', async ({ page }) => {
  const applicants = Array.from({ length: 12 }, (_, index) => ({
    id: `b0000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    workerId: `d0000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    workerName: `Stub Applicant ${String(index + 1).padStart(2, '0')}`,
    role: 'Store Associate',
    area: 'Indiranagar',
    state: 'Karnataka',
    pincode: '560038',
    status: 'Applied',
    appliedAt: new Date(2026, 0, index + 1).toISOString(),
  }))
  await page.route('**/api/hiring/jobs/*/applications', (route) => route.fulfill({ json: applicants }))
  await openApplicants(page)
  const cards = page.locator('article.candidate-card')
  await expect(cards).toHaveCount(10)
  await expect(page.getByText('12 applicants')).toBeVisible()
  const secondPage = page.getByRole('button', { name: 'Page 2 of 2' })
  await secondPage.click()
  await expect(secondPage).toHaveAttribute('aria-current', 'page')
  await expect(cards).toHaveCount(2)
  await expect(cards.first()).toContainText('Stub Applicant 11')
  await expect(page.getByText('12 applicants')).toBeVisible()
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
