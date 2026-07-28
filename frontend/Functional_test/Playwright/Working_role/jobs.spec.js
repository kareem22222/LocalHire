import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/work/jobs')
  await expect(page.getByRole('heading', { name: 'Roles for you' })).toBeVisible()
})

test('paginates all nearby jobs and keeps application state visible', async ({ page }) => {
  const jobs = page.locator('article.worker-job-row')
  await expect(jobs.first()).toBeVisible()
  expect(await jobs.count()).toBeLessThanOrEqual(6)
  await expect(jobs.first().getByRole('button', { name: /Apply now|Applied/ })).toBeVisible()
  await page.getByRole('button', { name: /^Page 2 of / }).click()
  await expect(page).toHaveURL(/\/work\/jobs\?page=2$/)
  await expect(jobs.first()).toBeVisible()
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
