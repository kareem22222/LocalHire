import { expect, test } from '../support/fixtures.js'
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

test('downloads the stored resume from the worker profile', async ({ page }) => {
  await openProfile(page)
  await expect(page.getByText('demo-worker-resume.pdf')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('demo-worker-resume.pdf')
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

test('saves a worker profile change and keeps it after a reload', async ({ page }) => {
  await openProfile(page)
  const address = `Playwright Street ${Date.now()}`
  await page.getByRole('button', { name: 'Edit profile' }).click()
  await page.getByLabel('Address line').fill(address)
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(page.getByRole('button', { name: 'Edit profile' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByText(address)).toBeVisible()

  await page.reload()
  await expect(page.getByText(address)).toBeVisible()
})

test('rejects a resume that is not a PDF, DOC, or DOCX', async ({ page }) => {
  await openProfile(page)
  await page.setInputFiles('#profile-resume', {
    name: 'resume.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a real resume'),
  })
  await expect(page.getByRole('alert')).toContainText('Resume must be a PDF, DOC, or DOCX file no larger than 5 MB.')
  await expect(page.getByText('Upload failed')).toBeVisible()
})

test('rejects an empty resume file', async ({ page }) => {
  await openProfile(page)
  await page.setInputFiles('#profile-resume', {
    name: 'resume.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.alloc(0),
  })
  await expect(page.getByRole('alert')).toContainText('Resume must be a PDF, DOC, or DOCX file no larger than 5 MB.')
})

test('returns to the worker dashboard from profile', async ({ page }) => {
  await openProfile(page)
  await page.getByRole('link', { name: 'LocalHire home' }).click()
  await expect(page.getByRole('heading', { name: 'Roles for you' })).toBeVisible()
})
