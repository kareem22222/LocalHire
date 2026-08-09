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

function paged(items, request, pageSize = 10) {
  const current = Number(new URL(request.url()).searchParams.get('page')) || 1
  return {
    items: items.slice((current - 1) * pageSize, current * pageSize),
    page: current, pageSize, totalCount: items.length,
    totalPages: items.length ? Math.ceil(items.length / pageSize) : 0,
  }
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

test('saves a candidate in account-scoped state', async ({ page }) => {
  test.slow()
  const card = page.locator('article.candidate-card').first()
  const candidateName = await card.getByRole('heading').textContent()
  await card.getByRole('button', { name: 'Save candidate', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Saved candidate', exact: true })).toBeDisabled()
  const unsupportedStatuses = await page.evaluate(async () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem('localhire.accessToken')}` }
    const [candidateId] = await fetch('/api/hiring/saved-candidates', { headers }).then((response) => response.json())
    return Promise.all(['GET', 'PUT'].map((method) =>
      fetch(`/api/hiring/saved-candidates/${candidateId}`, { method, headers }).then((response) => response.status)))
  })
  expect(unsupportedStatuses).toEqual([404, 404])
  await page.reload()
  await expect(page.locator('article.candidate-card').first().getByRole('button', { name: 'Saved candidate', exact: true })).toBeDisabled()

  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: /^Saved candidates/ }).click()
  await expect(page).toHaveURL(/\/hiring\/saved-candidates$/)
  await expect(page.getByRole('heading', { name: 'Saved candidates' })).toBeVisible()
  const savedCard = page.locator('article.candidate-card').filter({ hasText: candidateName })
  await expect(savedCard).toBeVisible()
  await expect(savedCard.getByRole('button', { name: 'Saved candidate', exact: true })).toBeDisabled()
})


test('paginates the talent list by ten and honours a deep-linked page', async ({ page }) => {
  await page.route('**/api/hiring/candidates/search*', (route) => route.fulfill({
    json: paged(stubbedCandidates(25), route.request()),
  }))

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
  await page.route('**/api/hiring/candidates/search*', (route) => {
    requests.push(route.request().url())
    return route.fulfill({ json: paged(stubbedCandidates(3), route.request()) })
  })

  await page.goto('/hiring/candidates?search=Indiranagar&role=Store%20Associate')
  await expect(page.getByRole('heading', { name: 'Talent matching Store Associate · "Indiranagar"' })).toBeVisible()
  await expect(page.locator('article.candidate-card')).toHaveCount(3)
  expect(requests.at(-1)).toContain('search=Indiranagar')
  expect(requests.at(-1)).toContain('role=Store')
})
