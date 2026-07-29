import { expect, test } from '@playwright/test'

function rowFor(page, jobId) {
  return page.locator(`article.worker-job-row:has(a[href="/work/jobs/${jobId}"])`)
}

// The demo worker already has seeded applications, and the nearest roles are the
// ones most likely to be taken, so walk the paginated list for the first role that
// still offers "Apply now". The list re-renders once the worker's applications
// arrive, so the chosen role is pinned by its job id rather than by position.
async function findOpenRole(page, maxPages = 12) {
  for (let visited = 0; visited < maxPages; visited += 1) {
    const rows = page.locator('article.worker-job-row')
    await expect(rows.first()).toBeVisible()
    const open = rows.filter({ has: page.getByRole('button', { name: 'Apply now', exact: true }) }).first()

    if (await open.count()) {
      const href = await open.locator('a.worker-job-row__details').getAttribute('href')
      const jobId = href.split('/').pop()
      const row = rowFor(page, jobId)
      const title = (await row.locator('h3').textContent()).trim()
      // Re-check on the pinned row: the applications may have landed meanwhile.
      if (await row.getByRole('button', { name: 'Apply now', exact: true }).count()) {
        return { row, jobId, title }
      }
      continue
    }

    const next = page.getByRole('button', { name: 'Next' })
    if (!(await next.isEnabled().catch(() => false))) break
    const firstHref = await rows.first().locator('a.worker-job-row__details').getAttribute('href')
    await next.click()
    await expect(page.locator('a.worker-job-row__details').first()).not.toHaveAttribute('href', firstHref)
  }
  throw new Error('No role without an existing application was found in the nearby list.')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/work/jobs')
  await expect(page.getByRole('heading', { name: 'Roles for you' })).toBeVisible()
})

test('applies from the job detail page and tracks the application', async ({ page }) => {
  const { jobId, title } = await findOpenRole(page)

  await page.goto(`/work/jobs/${jobId}`)
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Apply now', exact: true }).click()

  await expect(page.getByRole('button', { name: 'Applied', exact: true })).toBeDisabled()
  await expect(page.getByText(/Application status:/)).toContainText('Applied')

  // The application is on the server, not only in the page state.
  await page.reload()
  await expect(page.getByRole('button', { name: 'Applied', exact: true })).toBeDisabled()

  // Newest applications are listed first in the tracker.
  await page.goto('/work/applications')
  const newest = page.locator('.applied-card').first()
  await expect(newest).toContainText(title)
  await expect(newest).toContainText('Applied')
  await expect(newest).toHaveAttribute('href', `/work/jobs/${jobId}`)
})

test('applies straight from the nearby list row', async ({ page }) => {
  const { row, jobId } = await findOpenRole(page)
  await row.getByRole('button', { name: 'Apply now', exact: true }).click()

  await expect(rowFor(page, jobId).getByRole('button', { name: 'Applied', exact: true })).toBeDisabled()
  await expect(page.getByRole('alert')).toHaveCount(0)

  await page.reload()
  await expect(rowFor(page, jobId).getByRole('button', { name: 'Applied', exact: true })).toBeDisabled()
})

test('reports a rejected application without marking the role applied', async ({ page }) => {
  const { row, jobId } = await findOpenRole(page)
  await page.route('**/api/work/jobs/*/apply', (route) => route.fulfill({
    status: 409,
    json: { message: 'You have already applied to this job.' },
  }))
  await row.getByRole('button', { name: 'Apply now', exact: true }).click()

  await expect(page.getByRole('alert')).toContainText('You have already applied to this job.')
  await expect(rowFor(page, jobId).getByRole('button', { name: 'Apply now', exact: true })).toBeEnabled()
})

test('an already applied role cannot be applied to again', async ({ page }) => {
  await page.goto('/work/applications')
  await expect(page.getByRole('heading', { name: 'Applied jobs' })).toBeVisible()
  await page.locator('.applied-card').first().click()
  await expect(page).toHaveURL(/\/work\/jobs\/[^/]+$/)
  await expect(page.getByRole('button', { name: 'Applied', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Apply now', exact: true })).toHaveCount(0)
})
