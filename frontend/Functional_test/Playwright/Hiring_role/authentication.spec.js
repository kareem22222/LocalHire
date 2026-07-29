import { expect, test } from '../support/fixtures.js'
import { emptyStorage, openMenu, signIn } from '../support/helpers.js'

test.describe('hiring authentication', () => {
  test.use({ storageState: emptyStorage })

  test('opens, closes, and traps the sign-in dialog', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toHaveAccessibleName('Welcome back')
    const focusable = dialog.locator('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]')
    await focusable.last().focus()
    await page.keyboard.press('Tab')
    await expect(dialog.locator(':focus')).toHaveCount(1)
    await focusable.first().focus()
    await page.keyboard.press('Shift+Tab')
    await expect(dialog.locator(':focus')).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('validates each sign-in step before sending a request', async ({ page }) => {
    let signInRequests = 0
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/auth/login') signInRequests += 1
    })
    await page.goto('/')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('I am').selectOption('')
    await dialog.getByRole('button', { name: 'Continue' }).click()
    await expect(dialog.getByText('Choose how you will use LocalHire.')).toBeVisible()
    await expect(dialog.getByText('Enter your email address.')).toBeVisible()
    expect(signInRequests).toBe(0)
    await dialog.getByLabel('I am').selectOption('Hiring')
    await dialog.getByLabel('Email address').fill('not-an-email')
    await dialog.getByRole('button', { name: 'Continue' }).click()
    await expect(dialog.getByText('Enter a valid email address.')).toBeVisible()
    expect(signInRequests).toBe(0)
    await dialog.getByLabel('Email address').fill('demo@localhire.test')
    await dialog.getByRole('button', { name: 'Continue' }).click()
    await dialog.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(dialog.getByText('Enter your password.')).toBeVisible()
    expect(signInRequests).toBe(0)
  })

  test('switches between sign-in and the three-step registration flow', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Create one' }).click()
    await expect(dialog).toHaveAccessibleName('Create your account')
    await expect(dialog.getByText('Step 1 of 3')).toBeVisible()
    await dialog.getByLabel('I am').selectOption('Hiring')
    await dialog.getByRole('button', { name: 'Continue' }).click()
    await expect(dialog.getByLabel('Full name')).toBeVisible()
    await dialog.getByRole('button', { name: 'Previous' }).click()
    await expect(dialog.getByLabel('I am')).toHaveValue('Hiring')
  })

  test('signs in as an employer through the browser', async ({ page }) => {
    await signIn(page, 'Hiring')
    await expect(page.getByRole('heading', { name: 'Open roles you are hiring for' })).toBeVisible()
  })
})

test('signs out and removes the browser session', async ({ page }) => {
  await page.goto('/')
  await openMenu(page)
  await page.getByRole('button', { name: /Sign out/ }).click()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('localhire.accessToken'))).toBeNull()
})
