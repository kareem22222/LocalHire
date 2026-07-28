import { expect, test } from '@playwright/test'
import { notification, stubNotifications } from '../support/helpers.js'

test('opens and closes the worker notification center', async ({ page }) => {
  await page.goto('/')
  const bell = page.getByRole('button', { name: /Notifications, \d+ unread/ })
  await bell.click()
  const panel = page.getByRole('region', { name: 'Notifications' })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('tab', { name: /^unread\b/i })).toHaveAttribute('aria-selected', 'true')
  await page.locator('main').click({ position: { x: 1, y: 1 } })
  await expect(panel).toBeHidden()
})

test('filters the full worker notification history', async ({ page }) => {
  await page.goto('/notifications')
  await expect(page.getByRole('heading', { name: 'All notifications' })).toBeVisible()
  await page.getByRole('tab', { name: /^read\b/i }).click()
  await expect(page).toHaveURL(/\/notifications\?status=read$/)
  await page.getByRole('tab', { name: /^unread\b/i }).click()
  await expect(page).toHaveURL(/\/notifications\?status=unread$/)
})


// Notifications are only created as a side effect of an employer action, so the
// feed is stubbed to assert the worker-facing read flow deterministically.
test.describe('with a known notification feed', () => {
  test('opens the job behind a shortlist notification', async ({ page }) => {
    // Take a real job id so the notification lands on a real job page.
    await page.goto('/work/jobs')
    const jobId = (await page.locator('article.worker-job-row').first()
      .getByRole('link', { name: 'View details →' }).getAttribute('href')).split('/').pop()

    await stubNotifications(page, [notification({
      type: 'Shortlisted',
      title: 'You were shortlisted',
      message: 'FreshMart shortlisted you for Store Associate.',
      link: `/work/jobs/${jobId}`,
    })])
    await page.goto('/')

    await page.getByRole('button', { name: 'Notifications, 1 unread' }).click()
    await page.getByRole('region', { name: 'Notifications' })
      .getByRole('button', { name: /You were shortlisted/ }).click()

    await expect(page).toHaveURL(new RegExp(`/work/jobs/${jobId}$`))
    await expect(page.getByRole('heading', { name: 'About this job' })).toBeVisible()
    // Reading it clears the badge.
    await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
  })

  test('tells the worker when there is nothing to read', async ({ page }) => {
    await stubNotifications(page, [])
    await page.goto('/')
    await page.getByRole('button', { name: 'Notifications, 0 unread' }).click()
    const panel = page.getByRole('region', { name: 'Notifications' })
    await expect(panel.getByText('You are all caught up.')).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Mark all read' })).toHaveCount(0)
    await panel.getByRole('tab', { name: /^read\b/i }).click()
    await expect(panel.getByText('No read notifications yet.')).toBeVisible()
  })

  test('keeps read and unread history apart on the full page', async ({ page }) => {
    await stubNotifications(page, [
      notification({ title: 'Unread update' }),
      notification({ title: 'Read update', isRead: true, readAt: new Date().toISOString() }),
    ])
    await page.goto('/notifications')

    await expect(page.getByRole('button', { name: /Unread update/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Read update/ })).toHaveCount(0)
    await page.getByRole('tab', { name: /^read\b/i }).click()
    await expect(page.getByRole('button', { name: /Read update/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Unread update/ })).toHaveCount(0)
  })
})
