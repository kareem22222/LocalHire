import { describe, expect, it } from 'vitest'
import { apiErrorMessage } from './apiError'

describe('apiErrorMessage', () => {
  it('normalizes validation, middleware, and network errors', () => {
    expect(apiErrorMessage({ response: { data: { errors: { Name: ['Required.'] } } } })).toBe('Required.')
    expect(apiErrorMessage({ response: { data: { error: 'Conflict.' } } })).toBe('Conflict.')
    expect(apiErrorMessage({}, 'Try again.')).toBe('Try again.')
  })
})
