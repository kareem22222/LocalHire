import { expect, test } from '../support/fixtures.js'
import { chooseMenuItem } from '../support/helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Open roles you are hiring for' })).toBeVisible()
})

test('shows the hiring pipeline, quick actions, roles, and nearby talent', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Hiring pipeline' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quick actions' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Post new role' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review shortlists' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Talent near your business' })).toBeVisible()
  await expect(page.locator('article.hiring-role-card').first()).toBeVisible()
  await expect(page.locator('article.candidate-card').first()).toBeVisible()
})

test('searches and filters talent, then carries filters to all candidates', async ({ page }) => {
  const candidates = Array.from({ length: 12 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    name: `Bengaluru Candidate ${index + 1}`,
    role: 'Store Associate',
    area: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
  }))
  await page.route('**/api/hiring/candidates/nearby*', (route) => route.fulfill({ json: candidates }))
  const search = page.getByLabel('Search candidates by address or role')
  await search.fill('Bengaluru')
  const role = page.getByRole('combobox', { name: /Filter by role/i })
  await role.selectOption({ index: 1 })
  const selectedRole = await role.inputValue()
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByText(/results$/).first()).toBeVisible()
  await page.getByRole('button', { name: /Show more candidates/ }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe('Bengaluru')
  await expect.poll(() => new URL(page.url()).searchParams.get('role')).toBe(selectedRole)
  await expect(page.getByRole('heading', { name: new RegExp(selectedRole, 'i') })).toBeVisible()
})

test('opens post-job and shortlist quick actions', async ({ page }) => {
  await page.getByRole('button', { name: 'Post new role' }).click()
  await expect(page).toHaveURL(/\/PostNewJob$/)
  await expect(page.getByRole('heading', { name: 'Post a new job' })).toBeVisible()
  await page.goto('/')
  await page.getByRole('button', { name: 'Review shortlists' }).click()
  await expect(page).toHaveURL(/\/hiring\/shortlists$/)
})

test('uses every employer menu route', async ({ page }) => {
  for (const [item, path, heading] of [
    ['Open roles', '/hiring/roles', 'All open roles you are hiring for'],
    ['Talent', '/hiring/candidates', 'All talent near your business'],
    ['Shortlists', '/hiring/shortlists', 'Review your shortlists'],
    ['Dashboard', '/', 'Open roles you are hiring for'],
  ]) {
    await chooseMenuItem(page, item)
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}$`))
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
  }
})
