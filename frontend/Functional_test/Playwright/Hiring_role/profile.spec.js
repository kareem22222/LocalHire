import { expect, test } from '../support/fixtures.js'
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
  const originalName = await page.getByLabel('Full name').inputValue()
  const originalPincode = await page.getByLabel('Pincode').inputValue()
  await page.getByLabel('Full name').fill('')
  await page.getByLabel('Pincode').fill('123')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Full name is required.')
  await expect(page.getByRole('alert')).toContainText('Pincode must contain exactly 6 digits.')
  await expect(page.getByLabel('Pincode')).toHaveValue('123')
  await page.getByLabel('Full name').fill('Unsaved Employer')
  await page.getByLabel('Pincode').fill('560001')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('button', { name: 'Edit profile' })).toBeVisible()
  await page.getByRole('button', { name: 'Edit profile' }).click()
  await expect(page.getByLabel('Full name')).toHaveValue(originalName)
  await expect(page.getByLabel('Pincode')).toHaveValue(originalPincode)
})

test('saves an employer profile change and keeps it after a reload', async ({ page }) => {
  await openProfile(page)
  const address = `Playwright Lane ${Date.now()}`
  await page.getByRole('button', { name: 'Edit profile' }).click()
  await page.getByLabel('Address line').fill(address)
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  // A successful save returns the page to its read-only state.
  await expect(page.getByRole('button', { name: 'Edit profile' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByText(address)).toBeVisible()

  // The value came back from the server, not just the local form.
  await page.reload()
  await expect(page.getByText(address)).toBeVisible()
})

test('keeps the draft and reports the failure when a profile save is rejected', async ({ page }) => {
  await openProfile(page)
  await page.getByRole('button', { name: 'Edit profile' }).click()
  await page.route('**/api/me/profile', (route) => (route.request().method() === 'PUT'
    ? route.fulfill({
        status: 400,
        json: { errors: { Name: ['Name is already taken.'] } },
      })
    : route.fallback()))
  await page.getByLabel('Full name').fill('Rejected Name')
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(page.getByRole('alert')).toContainText('Name is already taken.')
  await expect(page.getByLabel('Full name')).toHaveValue('Rejected Name')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('heading', { name: 'Demo Employer' })).toBeVisible()
})

test('returns from the profile to the hiring dashboard', async ({ page }) => {
  await openProfile(page)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Open roles you are hiring for' })).toBeVisible()
})
