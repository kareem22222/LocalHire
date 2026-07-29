import { expect, test } from '../support/fixtures.js'
import { emptyStorage } from '../support/helpers.js'

test.describe('without a session', () => {
  test.use({ storageState: emptyStorage })

  test('deep links show the marketing page instead of employer data', async ({ page }) => {
    await page.goto('/hiring/roles')
    await expect(page.getByRole('heading', { name: /closer to home/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
    await expect(page.locator('article.hiring-role-card')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toHaveCount(0)
  })

  test('an unusable token is discarded and the visitor lands signed out', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('localhire.accessToken', 'not-a-real-token'))
    await page.goto('/hiring/candidates')
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('localhire.accessToken'))).toBeNull()
  })

  test('reports rejected sign-in credentials', async ({ page }) => {
    await page.route('**/api/auth/login', (route) => route.fulfill({
      status: 401,
      json: { title: 'Unauthorized' },
    }))
    await page.goto('/')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('I am').selectOption('Hiring')
    await dialog.getByLabel('Email address').fill('demo@localhire.test')
    await dialog.getByRole('button', { name: 'Continue' }).click()
    await dialog.getByLabel('Password').fill('WrongPassword1!')
    await dialog.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(dialog.getByText('Invalid email, password, or role.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toHaveCount(0)
  })

  test('explains a rate-limited sign-in attempt', async ({ page }) => {
    await page.route('**/api/auth/login', (route) => route.fulfill({ status: 429, json: {} }))
    await page.goto('/')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('I am').selectOption('Hiring')
    await dialog.getByLabel('Email address').fill('demo@localhire.test')
    await dialog.getByRole('button', { name: 'Continue' }).click()
    await dialog.getByLabel('Password').fill('LocalHire1!')
    await dialog.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(dialog.getByText('Too many attempts. Please wait a moment and try again.')).toBeVisible()
  })

  test('explains that an employer account already exists', async ({ page }) => {
    await page.route('**/api/auth/register', (route) => route.fulfill({
      status: 409,
      json: { error: 'An account with this email and role already exists.' },
    }))
    await page.goto('/')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Create one' }).click()
    await dialog.getByLabel('I am').selectOption('Hiring')
    await dialog.getByRole('button', { name: 'Continue' }).click()
    await dialog.getByLabel('Full name').fill('Demo Employer')
    await dialog.getByLabel('Email address').fill('demo@localhire.test')
    await dialog.getByRole('button', { name: 'Continue' }).click()
    await dialog.getByLabel('Password').fill('LocalHire1!')
    await dialog.getByRole('button', { name: 'Create account' }).click()
    await expect(dialog.getByText('An account with this email and role already exists.')).toBeVisible()
  })
})

test('unknown employer routes fall back to the dashboard', async ({ page }) => {
  await page.goto('/hiring/this-route-does-not-exist')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Open roles you are hiring for' })).toBeVisible()
})

test('worker-only pages return no employer data', async ({ page }) => {
  await page.goto('/work/applications')
  await expect(page.getByRole('alert')).toContainText('Could not load your applications.')
  await expect(page.locator('.applied-card')).toHaveCount(0)
})
