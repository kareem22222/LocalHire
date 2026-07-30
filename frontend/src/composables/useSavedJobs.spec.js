import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSavedJobs, removeSavedJob, saveJob } from '../api/jobs.js'
import { clearSavedJobs, useSavedJobs } from './useSavedJobs.js'

vi.mock('../api/jobs.js', () => ({
  getSavedJobs: vi.fn(),
  saveJob: vi.fn(),
  removeSavedJob: vi.fn(),
}))

describe('useSavedJobs', () => {
  beforeEach(() => {
    clearSavedJobs()
    vi.clearAllMocks()
    getSavedJobs.mockResolvedValue({ data: ['job-1'] })
    saveJob.mockResolvedValue({})
    removeSavedJob.mockResolvedValue({})
  })

  it('loads saved jobs and writes toggles through to the API', async () => {
    const { isSaved, toggle, load } = useSavedJobs()
    await load()
    expect(isSaved('job-1')).toBe(true)

    await toggle('job-1')
    expect(removeSavedJob).toHaveBeenCalledWith('job-1')
    await toggle('job-2')
    expect(saveJob).toHaveBeenCalledWith('job-2')
    expect(isSaved('job-2')).toBe(true)
  })

  it('serializes rapid toggles for the same job', async () => {
    let resolveSave
    getSavedJobs.mockResolvedValue({ data: [] })
    saveJob.mockReturnValue(new Promise((resolve) => { resolveSave = resolve }))
    const { isSaved, toggle, load } = useSavedJobs()
    await load()

    const saving = toggle('job-1')
    await vi.waitFor(() => expect(isSaved('job-1')).toBe(true))
    const removing = toggle('job-1')
    expect(removeSavedJob).not.toHaveBeenCalled()

    resolveSave({})
    await saving
    await removing
    expect(removeSavedJob).toHaveBeenCalledWith('job-1')
    expect(isSaved('job-1')).toBe(false)
  })
})
