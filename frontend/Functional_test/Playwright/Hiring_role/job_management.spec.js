import { expect, test } from '@playwright/test'

test('validates every required job field in the browser', async ({ page }) => {
  await page.goto('/PostNewJob')
  await page.getByRole('button', { name: 'Post Job' }).click()
  for (const message of [
    'Title is required.',
    'Description is required.',
    'Workplace name is required.',
    'City / area is required.',
    'Enter a valid 6-digit pincode.',
  ]) {
    await expect(page.getByText(message, { exact: true })).toBeVisible()
  }
  await expect(page.getByLabel('Title')).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveURL(/\/PostNewJob$/)
})

test('validates salary, experience, and openings ranges', async ({ page }) => {
  await page.goto('/PostNewJob')
  await page.getByLabel('Salary (min)').fill('50000')
  await page.getByLabel('Salary (max)').fill('10000')
  await page.getByLabel('Experience (min yrs)').fill('5')
  await page.getByLabel('Experience (max yrs)').fill('2')
  await page.getByLabel('Number of openings').fill('0')
  await page.getByRole('button', { name: 'Post Job' }).click()
  await expect(page.getByText('Maximum salary must be greater than or equal to minimum salary.')).toBeVisible()
  await expect(page.getByText('Select a pay period when you enter a salary.')).toBeVisible()
  await expect(page.getByText('Maximum experience must be greater than or equal to minimum experience.')).toBeVisible()
  await expect(page.getByText('Openings must be between 1 and 10,000.')).toBeVisible()
})

test('edits a role, blocks invalid data, and cancels without saving', async ({ page }) => {
  await page.goto('/hiring/roles')
  const card = page.locator('article.hiring-role-card').first()
  const title = await card.getAttribute('aria-label')
  await card.hover()
  await card.getByRole('button', { name: `View details for ${title}` }).click()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page).toHaveURL(/\/jobs\/[^/]+\/edit$/)
  await page.getByLabel('Title').fill('')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Title is required.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page).toHaveURL(/\/jobs\/[^/]+$/)
  await expect(page.getByRole('heading', { name: 'Job details' })).toBeVisible()
  await expect(page.getByLabel('Title')).toHaveValue(title)
})

test('backs out of job creation without changing data', async ({ page }) => {
  await page.goto('/PostNewJob')
  await page.getByLabel('Title').fill('Unsaved browser test role')
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
})
