import { afterEach, describe, expect, it } from 'vitest'
import { formatNumber, setLocale, t } from './i18n'

describe('i18n', () => {
  afterEach(() => setLocale('en'))

  it('persists Hindi and localizes core worker text and numbers', () => {
    setLocale('hi')
    expect(t('Apply now')).toBe('अभी आवेदन करें')
    expect(formatNumber(12500)).toBe(new Intl.NumberFormat('hi-IN').format(12500))
    expect(localStorage.getItem('localhire.locale')).toBe('hi')
    expect(document.documentElement.lang).toBe('hi')
  })
})
