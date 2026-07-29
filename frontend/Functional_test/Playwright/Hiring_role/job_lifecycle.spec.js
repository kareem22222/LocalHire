import { expect, test } from '../support/fixtures.js'
import { activateRoleCardControl } from '../support/helpers.js'

// The job form resolves the state and area list from a public pincode service.
// Stubbing it keeps the create flow deterministic and independent of the network.
const PINCODE = '560038'
const PINCODE_LOOKUP = /https:\/\/api\.postalpincode\.in\/.*/

async function stubPincodeLookup(page) {
  await page.route(PINCODE_LOOKUP, (route) => route.fulfill({
    json: [{
      Status: 'Success',
      PostOffice: [{ Name: 'Indiranagar', Block: 'Bengaluru South', District: 'Bengaluru', State: 'Karnataka' }],
    }],
  }))
}

async function fillRequiredJobFields(page, title) {
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Description').fill('Created by the Playwright job lifecycle test.')
  await page.getByLabel('Workplace name').fill('Playwright Test Store')
  await page.getByLabel('Pincode').fill(PINCODE)
  // The pincode lookup fills state and area asynchronously; wait for it.
  await expect(page.getByLabel('State')).toHaveValue('Karnataka')
  await expect(page.getByLabel('City / Village / Area')).toHaveValue(/Indiranagar/)
}

test('creates a role, lists it, then edits and saves it', async ({ page }) => {
  await stubPincodeLookup(page)
  const title = `Playwright Role ${Date.now()}`

  await page.goto('/PostNewJob')
  await expect(page.getByRole('heading', { name: 'Post a new job' })).toBeVisible()
  await fillRequiredJobFields(page, title)
  await page.getByLabel('Employment type').selectOption('FullTime')
  await page.getByLabel('Number of openings').fill('2')
  await page.getByLabel('Salary (min)').fill('18000')
  await page.getByLabel('Salary (max)').fill('26000')
  await page.getByLabel('Pay period').selectOption('Monthly')
  await page.getByLabel('Required skills').fill('Billing, Customer service')
  await page.getByRole('button', { name: 'Post Job' }).click()

  // A successful post returns to the dashboard.
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Open roles you are hiring for' })).toBeVisible()

  // Newest roles are listed first, so the new one is on the first page.
  await page.goto('/hiring/roles')
  const card = page.locator('article.hiring-role-card').filter({ hasText: title }).first()
  await expect(card).toBeVisible()
  await expect(card).toContainText('Playwright Test Store')

  await activateRoleCardControl(card, 'button[aria-label^="View details for"]')
  await expect(page).toHaveURL(/\/jobs\/[^/]+$/)
  const jobUrl = page.url()
  await expect(page.getByLabel('Title')).toHaveValue(title)
  await expect(page.getByLabel('Number of openings')).toHaveValue('2')

  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page).toHaveURL(/\/jobs\/[^/]+\/edit$/)
  const updatedTitle = `${title} (updated)`
  await page.getByLabel('Title').fill(updatedTitle)
  await page.getByLabel('Number of openings').fill('4')
  await page.getByRole('button', { name: 'Save changes' }).click()

  // Saving returns to the read-only view on the same job.
  await expect(page).toHaveURL(jobUrl)
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0)

  // The change came from the server, not just local form state.
  await page.reload()
  await expect(page.getByLabel('Title')).toHaveValue(updatedTitle)
  await expect(page.getByLabel('Number of openings')).toHaveValue('4')
})

test('keeps the employer on the form when the server rejects the job', async ({ page }) => {
  await stubPincodeLookup(page)
  await page.route('**/api/hiring/jobs', (route) => (route.request().method() === 'POST'
    ? route.fulfill({
        status: 400,
        json: { errors: { Title: ['A job with this title already exists.'] } },
      })
    : route.fallback()))

  await page.goto('/PostNewJob')
  await fillRequiredJobFields(page, 'Server rejected role')
  await page.getByRole('button', { name: 'Post Job' }).click()

  await expect(page.getByText('A job with this title already exists.')).toBeVisible()
  await expect(page.getByText('Please fix the highlighted fields below.')).toBeVisible()
  await expect(page.getByLabel('Title')).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveURL(/\/PostNewJob$/)
  // The typed values survive the failure.
  await expect(page.getByLabel('Title')).toHaveValue('Server rejected role')
})
