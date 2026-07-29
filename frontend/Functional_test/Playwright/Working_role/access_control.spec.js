import { expect, test } from '../support/fixtures.js'
import { emptyStorage } from '../support/helpers.js'

test.describe('without a session', () => {
  test.use({ storageState: emptyStorage })

  test('deep links show the marketing page instead of worker data', async ({ page }) => {
    await page.goto('/work/applications')
    await expect(page.getByRole('heading', { name: /closer to home/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
    await expect(page.locator('.applied-card')).toHaveCount(0)
  })

  test('an unusable token is discarded and the visitor lands signed out', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('localhire.accessToken', 'not-a-real-token'))
    await page.goto('/work/jobs')
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('localhire.accessToken'))).toBeNull()
  })

  test('reports rejected worker sign-in credentials', async ({ page }) => {
    await page.route('**/api/auth/login', (route) => route.fulfill({ status: 401, json: { title: 'Unauthorized' } }))
    await page.goto('/')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('I am').selectOption('LookingForWork')
    await dialog.getByLabel('Email address').fill('demo@localhire.test')
    await dialog.getByRole('button', { name: 'Continue' }).click()
    await dialog.getByLabel('Password').fill('WrongPassword1!')
    await dialog.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(dialog.getByText('Invalid email, password, or role.')).toBeVisible()
  })
})

test('the employer job editor is not reachable for a worker', async ({ page }) => {
  await page.goto('/jobs/00000000-0000-0000-0000-000000000000')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Roles for you' })).toBeVisible()
})

test('the employer shortlists page shows no data for a worker', async ({ page }) => {
  await page.goto('/hiring/shortlists')
  await expect(page).toHaveURL(/\/hiring\/shortlists$/)
  await expect(page.getByRole('alert')).toContainText('We could not load your shortlists.')
  await expect(page.locator('article.hiring-role-card')).toHaveCount(0)
})

test('unknown worker routes fall back to the dashboard', async ({ page }) => {
  await page.goto('/work/this-route-does-not-exist')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Roles for you' })).toBeVisible()
})

test('signing out clears the worker session and protected pages stay closed', async ({ page }) => {
  await page.goto('/work/applications')
  await expect(page.getByRole('heading', { name: 'Applied jobs' })).toBeVisible()
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('button', { name: /Sign out/ }).click()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()

  await page.goto('/work/applications')
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await expect(page.locator('.applied-card')).toHaveCount(0)
})
