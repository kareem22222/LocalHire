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
  await page.locator('.applied-card').filter({ hasText: 'Warehouse Picker' }).first().click()
  await expect(page).toHaveURL(/\/work\/jobs\/[^/]+$/)
  await expect(page.getByRole('button', { name: 'Applied', exact: true })).toBeDisabled()
})

test('returns to the worker dashboard', async ({ page }) => {
  await page.getByRole('button', { name: /Back to jobs/ }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Roles for you' })).toBeVisible()
})
