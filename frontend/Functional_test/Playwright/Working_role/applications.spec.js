import { expect, test } from '../support/fixtures.js'

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
  const firstApplicationHref = await applications.first().getAttribute('href')
  const secondPage = page.getByRole('button', { name: /^Page 2 of / })
  await expect(secondPage).toBeVisible()
  await secondPage.click()
  await expect(page).toHaveURL(/\/work\/applications\?page=2$/)
  await expect(secondPage).toHaveAttribute('aria-current', 'page')
  await expect(applications.first()).not.toHaveAttribute('href', firstApplicationHref)
})

test('opens an applied job and preserves the applied state', async ({ page }) => {
  const cards = page.locator('.applied-card')
  await expect(cards.first()).toBeVisible()

  for (let index = 0; index < await cards.count(); index += 1) {
    const card = cards.nth(index)
    const title = (await card.locator('.applied-card__identity h2').textContent()).trim()
    await card.click()
    await expect(page).toHaveURL(/\/work\/jobs\/[^/]+$/)

    const heading = page.getByRole('heading', { name: title })
    const unavailable = page.getByRole('heading', { name: 'Job unavailable' })
    await expect(heading.or(unavailable)).toBeVisible()

    if (await unavailable.isVisible()) {
      await page.goBack()
      await expect(cards.first()).toBeVisible()
      continue
    }

    await expect(page.getByRole('button', { name: 'Applied', exact: true })).toBeDisabled()
    return
  }

  throw new Error('No available applied job found on the current page')
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

  // The list renders a skeleton first, so wait for real cards before enumerating.
  await expect(page.locator('.applied-card').first()).toBeVisible()
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
  const counts = await page.evaluate(async () => {
    const token = localStorage.getItem('localhire.accessToken')
    const response = await fetch('/api/work/applications', { headers: { Authorization: 'Bearer ' + token } })
    const applications = await response.json()
    return {
      shortlisted: applications.filter((item) => item.status === 'Shortlisted').length,
      hired: applications.filter((item) => item.status === 'Hired').length,
    }
  })
  const metric = (label) => totals.locator('div').filter({ hasText: label }).locator('strong')
  await expect(metric('Shortlisted')).toHaveText(String(counts.shortlisted))
  await expect(metric('Hired')).toHaveText(String(counts.hired))
})
