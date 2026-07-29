import { expect, test } from '../support/fixtures.js'

// The default talent list is scoped to the employer's own area, so its size
// depends on seeded locations. A fixed list keeps the pagination maths assertable.
function stubbedCandidates(total) {
  return Array.from({ length: total }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    name: `Stub Candidate ${String(index + 1).padStart(2, '0')}`,
    role: 'Store Associate',
    area: 'Indiranagar',
    state: 'Karnataka',
    pincode: '560038',
    matchScore: 80,
    distanceKm: 3,
  }))
}

test.beforeEach(async ({ page }) => {
  await page.goto('/hiring/candidates')
  await expect(page.getByRole('heading', { name: 'All talent near your business' })).toBeVisible()
})

test('lists at most ten candidates per page and paginates when needed', async ({ page }) => {
  const candidates = page.locator('article.candidate-card')
  await expect(candidates.first()).toBeVisible()
  expect(await candidates.count()).toBeLessThanOrEqual(10)
  const secondPage = page.getByRole('button', { name: /^Page 2 of / })
  if (await secondPage.isVisible()) {
    await secondPage.click()
    await expect(page).toHaveURL(/\/hiring\/candidates\?page=2$/)
    await expect(candidates.first()).toBeVisible()
  }
})

test('opens complete candidate details', async ({ page }) => {
  const details = page.locator('article.candidate-card').first().getByRole('button', { name: /View details for/ })
  await expect(details).toBeVisible()
  await details.click()
  await expect(page).toHaveURL(/\/hiring\/candidates\/[^/?]+$/)
  await expect(page.getByRole('heading', { name: 'Professional profile' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Work preferences' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Candidate details' })).toBeVisible()
})

test('shows contact details from the candidate card', async ({ page }) => {
  await page.locator('article.candidate-card').first().getByRole('button', { name: 'Contact' }).click()
  await expect(page).toHaveURL(/\/hiring\/candidates\/[^/?]+\?contact=1$/)
  await expect(page.getByRole('heading', { name: 'Contact' })).toBeVisible()
  await expect(page.getByRole('link', { name: /@/ })).toHaveAttribute('href', /^mailto:/)
})

test('shortlists a candidate in account-scoped browser state', async ({ page }) => {
  const card = page.locator('article.candidate-card').first()
  await card.getByRole('button', { name: 'Shortlist', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Shortlisted', exact: true })).toBeDisabled()
  await page.reload()
  await expect(page.locator('article.candidate-card').first().getByRole('button', { name: 'Shortlisted', exact: true })).toBeDisabled()
})


test('paginates the talent list by ten and honours a deep-linked page', async ({ page }) => {
  await page.route('**/api/hiring/candidates/nearby*', (route) => route.fulfill({ json: stubbedCandidates(25) }))

  await page.goto('/hiring/candidates?page=3')
  const cards = page.locator('article.candidate-card')
  await expect(cards).toHaveCount(5)
  await expect(page.getByText('25 results')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Page 3 of 3' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled()

  await page.getByRole('button', { name: 'Previous' }).click()
  await expect(page).toHaveURL(/\/hiring\/candidates\?page=2$/)
  await expect(cards).toHaveCount(10)
  await expect(cards.first()).toContainText('Stub Candidate 11')

  await page.getByRole('button', { name: 'Page 1 of 3' }).click()
  await expect(page).toHaveURL(/\/hiring\/candidates$/)
  await expect(cards.first()).toContainText('Stub Candidate 01')
  await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled()
})

test('keeps the search term in the heading and the request', async ({ page }) => {
  const requests = []
  await page.route('**/api/hiring/candidates/nearby*', (route) => {
    requests.push(route.request().url())
    return route.fulfill({ json: stubbedCandidates(3) })
  })

  await page.goto('/hiring/candidates?search=Indiranagar&role=Store%20Associate')
  await expect(page.getByRole('heading', { name: 'Talent matching Store Associate · "Indiranagar"' })).toBeVisible()
  await expect(page.locator('article.candidate-card')).toHaveCount(3)
  expect(requests.at(-1)).toContain('search=Indiranagar')
  expect(requests.at(-1)).toContain('role=Store')
})
