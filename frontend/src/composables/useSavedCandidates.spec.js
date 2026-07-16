import { describe, expect, it, vi } from 'vitest'
import { useSavedCandidates } from './useSavedCandidates.js'

describe('useSavedCandidates', () => {
  it('adds, persists, and removes unique candidate ids', () => {
    const { isSaved, add, remove } = useSavedCandidates()

    add(null)
    add('candidate-1')
    add('candidate-1')
    expect(isSaved('candidate-1')).toBe(true)
    expect(JSON.parse(localStorage.getItem('localhire.savedCandidates'))).toContain('candidate-1')

    remove('missing')
    remove('candidate-1')
    expect(isSaved('candidate-1')).toBe(false)
  })

  it('keeps the in-memory shortlist when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    const { isSaved, add, remove } = useSavedCandidates()

    add('memory-only')
    expect(isSaved('memory-only')).toBe(true)
    remove('memory-only')
  })
})
