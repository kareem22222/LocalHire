import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/work/applications')
  await expect(page.getByRole('heading', { name: 'Applied jobs' })).toBeVisible()
})

test('summarizes application totals and status history', async ({ page }) => {
  const totals = page.getByRole('region', { name: 'Application totals' })
  await expect(totals).toBeVisible()
  await expect(totals).toContainText('Total applications')
  await expect(totals).toContainText('Shortlisted')
  await expect(totals).toContainText('Hired')
  await expect(page.getByRole('heading', { name: 'Your journey so far' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Your application timeline' })).toBeVisible()
})

test('paginates application history', async ({ page }) => {
  const applications = page.locator('.applied-card')
  await expect(applications.first()).toBeVisible()
  await page.getByRole('button', { name: /^Page 2 of / }).click()
  await expect(page).toHaveURL(/\/work\/applications\?page=2$/)
  await expect(applications.first()).toBeVisible()
})

test('opens an applied job and preserves the applied state', async ({ page }) => {
  // Any tracked application will do; the first page of the list changes as new
  // applications are added, so no specific job title is assumed.
  const card = page.locator('.applied-card').first()
  const title = (await card.locator('.applied-card__identity h2').textContent()).trim()
  await card.click()
  await expect(page).toHaveURL(/\/work\/jobs\/[^/]+$/)
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Applied', exact: true })).toBeDisabled()
})

test('returns to the worker dashboard', async ({ page }) => {
  await page.getByRole('button', { name: /Back to jobs/ }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Roles for you' })).toBeVisible()
})


test('shows a status, milestone, and summary for every application', async ({ page }) => {
  const summaries = {
    Applied: 'Application sent. The employer has not reviewed it yet.',
    Shortlisted: 'You were shortlisted. The employer may contact you next.',
    Rejected: 'The employer did not select you for this role.',
    Hired: 'You were selected for this role.',
  }
  const milestones = {
    Applied: 'Waiting for review',
    Shortlisted: 'Shortlist reached',
    Rejected: 'Application closed',
    Hired: 'Offer reached',
  }

  const cards = await page.locator('.applied-card').all()
  expect(cards.length).toBeGreaterThan(0)
  for (const card of cards) {
    // The chip is uppercased in CSS, so read the source text, not innerText.
    const status = (await card.locator('.applied-card__status').textContent()).trim()
    expect(Object.keys(summaries)).toContain(status)
    await expect(card).toContainText(summaries[status])
    await expect(card.locator('.applied-card__milestones')).toContainText(milestones[status])
    await expect(card).toHaveAttribute('href', /\/work\/jobs\/[0-9a-f-]+$/)
  }
})

test('counts shortlisted and hired applications in the totals', async ({ page }) => {
  const totals = page.getByRole('region', { name: 'Application totals' })
  await expect(totals).toBeVisible()

  // "N roles tracked" is rendered directly, so it is the reliable source.
  const tracked = await page.getByText(/^\d+ roles? tracked$/).innerText()
  const total = Number(tracked.split(' ')[0])
  expect(total).toBeGreaterThan(0)

  // The metric animates up to the same number.
  await expect(totals.locator('div').first().locator('strong')).toHaveText(String(total))
})
