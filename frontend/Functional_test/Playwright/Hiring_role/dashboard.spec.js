import { expect, test } from '@playwright/test'
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
  const search = page.getByLabel('Search candidates by address or role')
  await search.fill('Bengaluru')
  await page.getByRole('combobox', { name: /Filter by role/i }).selectOption({ index: 1 })
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByText(/results$/).first()).toBeVisible()
  const more = page.getByRole('button', { name: /Show more candidates/ })
  if (await more.isVisible()) {
    await more.click()
    await expect(page).toHaveURL(/\/hiring\/candidates\?.*search=Bengaluru/)
    await expect(page.getByRole('heading', { name: /talent near your business/i })).toBeVisible()
  }
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
