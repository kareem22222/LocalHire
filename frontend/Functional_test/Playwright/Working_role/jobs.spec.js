import { expect, test } from '../support/fixtures.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/work/jobs')
  await expect(page.getByRole('heading', { name: 'Roles for you' })).toBeVisible()
})

test('paginates all nearby jobs and keeps application state visible', async ({ page }) => {
  const jobs = page.locator('article.worker-job-row')
  await expect(jobs.first()).toBeVisible()
  expect(await jobs.count()).toBeLessThanOrEqual(6)
  await expect(jobs.first().getByRole('button', { name: /Apply now|Applied/ })).toBeVisible()
  const firstJobHref = await jobs.first().getByRole('link', { name: 'View details →' }).getAttribute('href')
  const secondPage = page.getByRole('button', { name: /^Page 2 of / })
  await expect(secondPage).toBeVisible()
  await secondPage.click()
  await expect(page).toHaveURL(/\/work\/jobs\?page=2$/)
  await expect(secondPage).toHaveAttribute('aria-current', 'page')
  await expect(jobs.first().getByRole('link', { name: 'View details →' })).not.toHaveAttribute('href', firstJobHref)
})

test('shows complete job details and a safe application state', async ({ page }) => {
  await page.locator('article.worker-job-row').first().getByRole('link', { name: 'View details →' }).click()
  await expect(page).toHaveURL(/\/work\/jobs\/[^/]+$/)
  await expect(page.getByRole('heading', { name: 'About this job' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Job details' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Requirements and benefits' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Apply now|Applied/ })).toBeVisible()
})

test('returns from job details to the dashboard', async ({ page }) => {
  await page.locator('article.worker-job-row').first().getByRole('link', { name: 'View details →' }).click()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Roles for you' })).toBeVisible()
})

test('handles an unavailable job and offers recovery', async ({ page }) => {
  await page.goto('/work/jobs/00000000-0000-0000-0000-000000000000')
  await expect(page.getByRole('heading', { name: 'Job unavailable' })).toBeVisible()
  await page.getByRole('button', { name: 'Back to jobs' }).click()
  await expect(page).toHaveURL(/\/$/)
})


test('shows an empty state when the search matches no role', async ({ page }) => {
  await page.goto('/work/jobs?search=zzzzzzzznosuchrole')
  await expect(page.getByText('No roles found')).toBeVisible()
  await expect(page.locator('article.worker-job-row')).toHaveCount(0)
})

test('paginates six roles per page and honours a deep-linked page', async ({ page }) => {
  // The real list is radius filtered, so its size varies; a fixed list makes the
  // pagination maths assertable.
  const jobs = Array.from({ length: 14 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    title: `Stub Role ${String(index + 1).padStart(2, '0')}`,
    description: 'Stubbed role used to assert pagination.',
    workplaceName: 'Playwright Store',
    cityArea: 'Indiranagar',
    state: 'Karnataka',
    pincode: '560038',
    employmentType: 'FullTime',
    salaryMin: 18000,
    salaryMax: 24000,
    salaryPeriod: 'Monthly',
    applicationCount: 0,
  }))
  await page.route('**/api/work/jobs/nearby*', (route) => route.fulfill({ json: jobs }))

  await page.goto('/work/jobs?page=3')
  const rows = page.locator('article.worker-job-row')
  await expect(rows).toHaveCount(2)
  await expect(page.getByText('14 results')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Page 3 of 3' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()

  await page.getByRole('button', { name: 'Previous' }).click()
  await expect(page).toHaveURL(/\/work\/jobs\?page=2$/)
  await expect(rows).toHaveCount(6)
  await expect(rows.first()).toContainText('Stub Role 07')
})

test('keeps the employment type filter in the request', async ({ page }) => {
  const requests = []
  await page.route('**/api/work/jobs/nearby*', (route) => {
    requests.push(route.request().url())
    return route.fallback()
  })
  await page.goto('/work/jobs?employmentType=PartTime')
  await expect(page.locator('article.worker-job-row').first().or(page.getByText('No roles found'))).toBeVisible()
  expect(requests.at(-1)).toContain('employmentType=PartTime')
})
