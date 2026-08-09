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

  await page.route('**/api/notifications/paged*', (route) => {
    const url = new URL(route.request().url())
    const status = url.searchParams.get('status') || 'all'
    const pageNumber = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('pageSize')) || 20
    const filtered = state.filter((item) => status === 'all'
      || (status === 'read' ? item.isRead : !item.isRead))
    return route.fulfill({ json: {
      items: filtered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
      page: pageNumber,
      pageSize,
      totalCount: filtered.length,
      totalPages: filtered.length ? Math.ceil(filtered.length / pageSize) : 0,
      unreadCount: state.filter((item) => !item.isRead).length,
      readCount: state.filter((item) => item.isRead).length,
    } })
  })

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

// Activates a control on the back face of a role card.
//
// The card flips on hover or focus with a 700ms rotateY transition, so a pointer
// click is unreliable: the element is "not stable" during the flip, and any
// scroll that moves the pointer off the card unflips it, leaving
// .hiring-role-card__visual on the front face intercepting the click. Focusing
// the control flips the card (focusin) independently of the pointer, and keyboard
// activation needs no hit testing at all.
//
// `selector` is a CSS selector because the back face is aria-hidden until the
// card flips, which keeps its buttons out of the accessibility tree.
export async function activateRoleCardControl(card, selector) {
  const control = card.locator(selector)
  await control.focus()
  await expect(card).toHaveClass(/hiring-role-card--flipped/)
  await control.press('Enter')
}

export async function signIn(page, role) {  await page.goto('/')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('I am').selectOption({ label: role })
  await dialog.getByLabel('Email address').fill('demo@localhire.test')
  await dialog.getByRole('button', { name: 'Continue' }).click()
  await dialog.getByLabel('Password').fill('LocalHire1!')
  await dialog.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible()
}
