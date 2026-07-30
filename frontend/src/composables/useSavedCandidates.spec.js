import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSavedCandidates, removeSavedCandidate, saveCandidate } from '../api/jobs.js'
import { clearSavedCandidates, useSavedCandidates } from './useSavedCandidates.js'

vi.mock('../api/jobs.js', () => ({
  getSavedCandidates: vi.fn(),
  saveCandidate: vi.fn(),
  removeSavedCandidate: vi.fn(),
}))

describe('useSavedCandidates', () => {
  beforeEach(() => {
    clearSavedCandidates()
    vi.clearAllMocks()
    getSavedCandidates.mockResolvedValue({ data: [] })
    saveCandidate.mockResolvedValue({})
    removeSavedCandidate.mockResolvedValue({})
  })

  it('loads once and writes unique candidate changes through to the API', async () => {
    getSavedCandidates.mockResolvedValue({ data: ['candidate-1'] })
    const { isSaved, add, remove, load } = useSavedCandidates()
    await load()
    await load()

    expect(isSaved('candidate-1')).toBe(true)
    expect(getSavedCandidates).toHaveBeenCalledTimes(1)
    await add(null)
    await add('candidate-1')
    await add('candidate-2')
    await add('candidate-2')
    expect(saveCandidate).toHaveBeenCalledOnce()
    expect(saveCandidate).toHaveBeenCalledWith('candidate-2')

    await remove('missing')
    await remove('candidate-1')
    expect(removeSavedCandidate).toHaveBeenCalledWith('candidate-1')
  })

  it('clears account state on logout and reloads it for the next login', async () => {
    getSavedCandidates
      .mockResolvedValueOnce({ data: ['candidate-1'] })
      .mockResolvedValueOnce({ data: ['candidate-2'] })
    const first = useSavedCandidates()
    await first.load()
    clearSavedCandidates()
    expect(first.saved.value.size).toBe(0)

    const next = useSavedCandidates()
    await next.load()
    expect(next.isSaved('candidate-1')).toBe(false)
    expect(next.isSaved('candidate-2')).toBe(true)
  })
})
