import { expect } from '@playwright/test'

export const emptyStorage = { cookies: [], origins: [] }

export async function openMenu(page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
}

export async function chooseMenuItem(page, name) {
  await openMenu(page)
  await page.locator('#menu-panel').getByRole('button', { name: new RegExp(`^${name}\\b`) }).click()
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
