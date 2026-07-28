import { expect, test } from '@playwright/test'
import { chooseMenuItem } from '../support/helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Roles for you' })).toBeVisible()
})

test('shows profile strength, quick actions, and a short role list', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Profile strength' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quick actions' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Applied jobs' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Update profile' })).toBeVisible()
  const jobs = page.locator('article.worker-job-row')
  await expect(jobs.first()).toBeVisible()
  expect(await jobs.count()).toBeLessThanOrEqual(6)
})

test('searches and filters nearby roles', async ({ page }) => {
  await page.getByLabel('Search jobs by role or location').fill('Store')
  await page.getByLabel('Employment type').selectOption('FullTime')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByText(/results$/).first()).toBeVisible()
  for (const row of await page.locator('article.worker-job-row').all()) {
    // Every row has to match the typed term and the employment-type filter.
    await expect(row.locator('.worker-job-row__main')).toContainText(/Store/i)
    await expect(row.locator('.worker-job-row__tags')).toContainText('Full-time')
  }
})

test('opens job details from the clickable job row', async ({ page }) => {
  const job = page.locator('article.worker-job-row').first()
  await job.getByRole('link', { name: /^View .* at / }).click()
  await expect(page).toHaveURL(/\/work\/jobs\/[^/]+$/)
  await expect(page.getByRole('heading', { name: 'About this job' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Job details' })).toBeVisible()
})

test('opens applications, profile, all jobs, and menu routes', async ({ page }) => {
  await page.getByRole('button', { name: 'Applied jobs' }).click()
  await expect(page).toHaveURL(/\/work\/applications$/)
  await page.goto('/')
  await page.getByRole('button', { name: 'Update profile' }).click()
  await expect(page.getByRole('heading', { name: 'Professional details' })).toBeVisible()
  await chooseMenuItem(page, 'Dashboard')
  await expect(page.getByRole('heading', { name: 'Roles for you' })).toBeVisible()
  const more = page.getByRole('button', { name: /Show more roles/ })
  await more.click()
  await expect(page).toHaveURL(/\/work\/jobs/)
  await chooseMenuItem(page, 'Applications')
  await expect(page).toHaveURL(/\/work\/applications$/)
  await chooseMenuItem(page, 'Dashboard')
  await expect(page).toHaveURL(/\/$/)
})

test('blocks a worker from employer-only data and job creation', async ({ page }) => {
  await page.goto('/PostNewJob')
  await expect(page).toHaveURL(/\/$/)

  await page.goto('/hiring/roles')
  await expect(page.getByRole('heading', { name: 'All open roles you are hiring for' })).toBeVisible()
  await expect(page.locator('article.hiring-role-card')).toHaveCount(0)
})
