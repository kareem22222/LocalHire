import { expect, test } from '@playwright/test'
import { emptyStorage, openMenu, signIn } from '../support/helpers.js'

test.describe('worker authentication', () => {
  test.use({ storageState: emptyStorage })

  test('validates worker sign-in before advancing', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('I am').selectOption('LookingForWork')
    await dialog.getByLabel('Email address').fill('worker@invalid')
    await dialog.getByRole('button', { name: 'Continue' }).click()
    await expect(dialog.getByText('Enter a valid email address.')).toBeVisible()
    await expect(dialog.getByLabel('Password')).toHaveCount(0)
  })

  test('validates the registration identity and password steps', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Create one' }).click()
    await dialog.getByLabel('I am').selectOption('LookingForWork')
    await dialog.getByRole('button', { name: 'Continue' }).click()
    await dialog.getByRole('button', { name: 'Continue' }).click()
    await expect(dialog.getByText('Enter your full name.')).toBeVisible()
    await expect(dialog.getByText('Enter your email address.')).toBeVisible()
    await dialog.getByLabel('Full name').fill('Browser Worker')
    await dialog.getByLabel('Email address').fill('browser.worker@example.test')
    await dialog.getByRole('button', { name: 'Continue' }).click()
    await dialog.getByLabel('Password').fill('short')
    await dialog.getByRole('button', { name: 'Create account' }).click()
    await expect(dialog.getByText('Use at least 8 characters.')).toBeVisible()
  })

  test('signs in as a worker through the browser', async ({ page }) => {
    await signIn(page, 'Looking for work')
    await expect(page.getByRole('heading', { name: 'Roles for you' })).toBeVisible()
  })
})

test('signs out of a worker session', async ({ page }) => {
  await page.goto('/')
  await openMenu(page)
  await page.getByRole('button', { name: /Sign out/ }).click()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('localhire.accessToken'))).toBeNull()
})
