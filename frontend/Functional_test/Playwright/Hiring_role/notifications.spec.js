import { expect, test } from '../support/fixtures.js'
import { notification, stubNotifications } from '../support/helpers.js'

test('opens the notification center and switches status tabs', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Notifications, \d+ unread/ }).click()
  const panel = page.getByRole('region', { name: 'Notifications' })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('tab', { name: /^unread\b/i })).toHaveAttribute('aria-selected', 'true')
  await panel.getByRole('tab', { name: /^read\b/i }).click()
  await expect(panel.getByRole('tab', { name: /^read\b/i })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
})

test('shows the full notification page for both status filters', async ({ page }) => {
  await page.goto('/notifications')
  await expect(page.getByRole('heading', { name: 'All notifications' })).toBeVisible()
  await expect(page.getByRole('tab', { name: /^unread\b/i })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: /^read\b/i }).click()
  await expect(page).toHaveURL(/\/notifications\?status=read$/)
  await expect(page.getByRole('tab', { name: /^read\b/i })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('button', { name: 'Back to dashboard' }).click()
  await expect(page).toHaveURL(/\/$/)
})


// Nothing is seeded into the notification feed, and real entries only appear as a
// side effect of another account applying, so these use a stubbed feed to assert
// the read/unread behaviour exactly.
test.describe('with a known notification feed', () => {
  test('marks a single notification read and moves it to the read tab', async ({ page }) => {
    await stubNotifications(page, [
      notification({ title: 'First application' }),
      notification({ title: 'Second application' }),
      notification({ title: 'Older application', isRead: true, readAt: new Date().toISOString() }),
    ])
    await page.goto('/')

    const bell = page.getByRole('button', { name: 'Notifications, 2 unread' })
    await bell.click()
    const panel = page.getByRole('region', { name: 'Notifications' })
    await expect(panel.getByRole('tab', { name: /^unread\b/i })).toContainText('2')
    await panel.getByRole('button', { name: /First application/ }).click()

    // Selecting a notification closes the panel and drops the unread count.
    await expect(panel).toBeHidden()
    await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible()
    await page.getByRole('button', { name: 'Notifications, 1 unread' }).click()
    await expect(panel.getByRole('tab', { name: /^unread\b/i })).toContainText('1')
    await panel.getByRole('tab', { name: /^read\b/i }).click()
    await expect(panel.getByRole('button', { name: /First application/ })).toBeVisible()
  })

  test('marks everything read from the notifications page', async ({ page }) => {
    await stubNotifications(page, [notification(), notification(), notification()])
    await page.goto('/notifications')

    const markAll = page.getByRole('button', { name: 'Mark all read' })
    await expect(markAll).toBeVisible()
    await markAll.click()

    await expect(markAll).toBeHidden()
    await expect(page.getByRole('tab', { name: /^unread\b/i })).toContainText('0')
    await expect(page.getByText('You are all caught up.')).toBeVisible()
    await page.getByRole('tab', { name: /^read\b/i }).click()
    await expect(page.locator('.notifications-page__item')).toHaveCount(3)
  })

  test('follows the link of a notification', async ({ page }) => {
    await stubNotifications(page, [notification({ title: 'Review your shortlists', link: '/hiring/shortlists' })])
    await page.goto('/')
    await page.getByRole('button', { name: 'Notifications, 1 unread' }).click()
    await page.getByRole('region', { name: 'Notifications' })
      .getByRole('button', { name: /Review your shortlists/ }).click()
    await expect(page).toHaveURL(/\/hiring\/shortlists$/)
    await expect(page.getByRole('heading', { name: 'Review your shortlists' })).toBeVisible()
  })

  test('paginates the full notification history ten at a time', async ({ page }) => {
    await stubNotifications(page, Array.from({ length: 25 }, (_, index) =>
      notification({ title: `Application ${index + 1}` })))
    await page.goto('/notifications')

    const items = page.locator('.notifications-page__item')
    await expect(items).toHaveCount(10)
    await page.getByRole('button', { name: 'Page 3 of 3' }).click()
    await expect(page).toHaveURL(/\/notifications\?page=3$/)
    await expect(items).toHaveCount(5)
    await page.getByRole('button', { name: 'Previous' }).click()
    await expect(items).toHaveCount(10)
  })

  test('shows more than the panel preview on the full page', async ({ page }) => {
    // A fixed viewport keeps the panel's show-more control inside the window; the
    // project default follows the real (headed, full-screen) window size.
    await page.setViewportSize({ width: 1280, height: 1000 })
    await stubNotifications(page, Array.from({ length: 8 }, (_, index) =>
      notification({ title: `Application ${index + 1}` })))
    await page.goto('/')
    await page.getByRole('button', { name: 'Notifications, 8 unread' }).click()
    const panel = page.getByRole('region', { name: 'Notifications' })
    await expect(panel.locator('.notification-center__item')).toHaveCount(5)
    const showMore = panel.getByRole('button', { name: /Show more unread notifications \(8 total\)/ })
    await expect(showMore).toBeVisible()
    await showMore.click()
    await expect(page).toHaveURL(/\/notifications\?status=unread$/)
    await expect(page.locator('.notifications-page__item')).toHaveCount(8)
  })
})
