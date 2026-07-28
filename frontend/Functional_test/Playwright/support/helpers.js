import { expect } from '@playwright/test'

export const emptyStorage = { cookies: [], origins: [] }

export async function openMenu(page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
}

export async function chooseMenuItem(page, name) {
  await openMenu(page)
  await page.locator('#menu-panel').getByRole('button', { name: new RegExp(`^${name}\\b`) }).click()
}

// Builds one notification payload item. `overrides` wins over the defaults.
let notificationSequence = 0
export function notification(overrides = {}) {
  notificationSequence += 1
  return {
    id: `00000000-0000-4000-8000-${String(notificationSequence).padStart(12, '0')}`,
    type: 'NewApplication',
    title: 'New application received',
    message: 'A candidate applied for Store Associate.',
    link: null,
    isRead: false,
    createdAt: new Date().toISOString(),
    readAt: null,
    ...overrides,
  }
}

// Serves a fixed notification list and keeps the read state in memory, so the
// read/unread flows can be asserted exactly. Nothing seeds notifications, and
// real ones only appear as a side effect of applying or shortlisting, so this is
// the only way to test the panel deterministically.
export async function stubNotifications(page, items) {
  const state = items.map((item) => ({ ...item }))
  const list = () => ({ items: state, unreadCount: state.filter((item) => !item.isRead).length })

  await page.route('**/api/notifications', (route) => route.fulfill({ json: list() }))

  await page.route('**/api/notifications/*/read', (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-2)
    const item = state.find((entry) => entry.id === id)
    if (!item) return route.fulfill({ status: 404, json: {} })
    Object.assign(item, { isRead: true, readAt: new Date().toISOString() })
    return route.fulfill({ json: item })
  })

  await page.route('**/api/notifications/read-all', (route) => {
    state.forEach((item) => Object.assign(item, { isRead: true, readAt: item.readAt || new Date().toISOString() }))
    return route.fulfill({ json: { updated: state.length } })
  })
}

export async function signIn(page, role) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('I am').selectOption({ label: role })
  await dialog.getByLabel('Email address').fill('demo@localhire.test')
  await dialog.getByRole('button', { name: 'Continue' }).click()
  await dialog.getByLabel('Password').fill('LocalHire1!')
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible()
}
