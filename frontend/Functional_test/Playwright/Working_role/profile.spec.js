import { expect, test } from '@playwright/test'
import { openMenu } from '../support/helpers.js'

async function openProfile(page) {
  await page.goto('/')
  await openMenu(page)
  await page.locator('#menu-panel').getByRole('button', { name: /Demo Worker/ }).click()
  await expect(page.getByRole('heading', { name: 'Demo Worker' })).toBeVisible()
}

test('shows every worker profile section and optional resume control', async ({ page }) => {
  await openProfile(page)
  for (const heading of [
    'Personal information',
    'Professional details',
    'Work preferences',
    'Work history',
    'Education and training',
    'Skills and languages',
    'Licences and certificates',
    'Location',
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  }
  await expect(page.getByText(/Resume \(optional/)).toBeVisible()
})

test('reports multiple worker profile validation errors together', async ({ page }) => {
  await openProfile(page)
  await page.getByRole('button', { name: 'Edit profile' }).click()
  await page.getByLabel('Full name').fill('')
  await page.getByLabel('Experience in years *').fill('61')
  await page.getByLabel('Pincode').fill('123')
  await page.getByLabel('Expected salary from').fill('50000')
  await page.getByLabel('Expected salary up to').fill('10000')
  await page.getByLabel('Maximum travel distance (km)').fill('501')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  const errors = page.getByRole('alert')
  await expect(errors).toContainText('Full name is required.')
  await expect(errors).toContainText('Experience must be between 0 and 60 years.')
  await expect(errors).toContainText('Pincode must contain exactly 6 digits.')
  await expect(errors).toContainText('Maximum expected salary cannot be less than minimum expected salary.')
  await expect(errors).toContainText('Travel distance must be between 1 and 500 km.')
})

test('adds and removes structured work-history fields without saving', async ({ page }) => {
  await openProfile(page)
  await page.getByRole('button', { name: 'Edit profile' }).click()
  const add = page.getByRole('button', { name: '+ Add work experience' })
  const removeButtons = page.getByRole('button', { name: /Remove work history/ })
  const before = await removeButtons.count()
  await add.click()
  await expect(removeButtons).toHaveCount(before + 1)
  await removeButtons.last().click()
  await expect(removeButtons).toHaveCount(before)
  await page.getByRole('button', { name: 'Cancel' }).click()
})

test('returns to the worker dashboard from profile', async ({ page }) => {
  await openProfile(page)
  await page.getByRole('link', { name: 'LocalHire home' }).click()
  await expect(page.getByRole('heading', { name: 'Roles for you' })).toBeVisible()
})
