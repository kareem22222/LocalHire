import { expect, test as base } from '@playwright/test'

export { expect }

export const test = base.extend({
  page: async ({ page, request }, use) => {
    if (!process.env.PLAYWRIGHT_BASE_URL || process.env.PLAYWRIGHT_RESET_MOCK_API === 'true') {
      const response = await request.post('/api/test/reset')
      if (!response.ok()) throw new Error(`Could not reset mock API: ${response.status()}`)
    }
    await use(page)
  },
})
