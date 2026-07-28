import { expect, test } from '@playwright/test'
import { openMenu } from '../support/helpers.js'

async function openProfile(page) {
  await page.goto('/')
  await openMenu(page)
  await page.locator('#menu-panel').getByRole('button', { name: /Demo Employer/ }).click()
  await expect(page.getByRole('heading', { name: 'Demo Employer' })).toBeVisible()
}

test('shows the employer profile without worker-only sections', async ({ page }) => {
  await openProfile(page)
  await expect(page.getByText('Hiring locally on LocalHire')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Personal information' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Location' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Professional details' })).toHaveCount(0)
})

test('validates profile edits and preserves the draft until cancelled', async ({ page }) => {
  await openProfile(page)
  await page.getByRole('button', { name: 'Edit profile' }).click()
  await page.getByLabel('Full name').fill('')
  await page.getByLabel('Pincode').fill('123')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Full name is required.')
  await expect(page.getByRole('alert')).toContainText('Pincode must contain exactly 6 digits.')
  await expect(page.getByLabel('Pincode')).toHaveValue('123')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('button', { name: 'Edit profile' })).toBeVisible()
})

test('returns from the profile to the hiring dashboard', async ({ page }) => {
  await openProfile(page)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Open roles you are hiring for' })).toBeVisible()
})
