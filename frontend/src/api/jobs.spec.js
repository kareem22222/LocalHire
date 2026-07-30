import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './index.js'
import {
  getCandidate,
  getSavedCandidates,
  getSavedJobs,
  hireApplicant,
  removeSavedCandidate,
  removeSavedJob,
  rejectApplicant,
  saveCandidate,
  saveJob,
  shortlistApplicant,
} from './jobs.js'

vi.mock('./index.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))

describe('jobs API candidate actions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls the shortlist and candidate endpoints', () => {
    shortlistApplicant('job-1', 'application-1')
    rejectApplicant('job-1', 'application-1')
    hireApplicant('job-1', 'application-2')
    getCandidate('candidate-1')

    expect(api.post).toHaveBeenCalledWith('/hiring/jobs/job-1/applications/application-1/shortlist')
    expect(api.post).toHaveBeenCalledWith('/hiring/jobs/job-1/applications/application-1/reject')
    expect(api.post).toHaveBeenCalledWith('/hiring/jobs/job-1/applications/application-2/hire')
    expect(api.get).toHaveBeenCalledWith('/hiring/candidates/candidate-1')
  })

  it('calls the saved candidate and job endpoints', () => {
    getSavedCandidates()
    saveCandidate('candidate-1')
    removeSavedCandidate('candidate-1')
    getSavedJobs()
    saveJob('job-1')
    removeSavedJob('job-1')

    expect(api.get).toHaveBeenCalledWith('/hiring/saved-candidates')
    expect(api.post).toHaveBeenCalledWith('/hiring/saved-candidates/candidate-1')
    expect(api.delete).toHaveBeenCalledWith('/hiring/saved-candidates/candidate-1')
    expect(api.get).toHaveBeenCalledWith('/work/saved-jobs')
    expect(api.post).toHaveBeenCalledWith('/work/saved-jobs/job-1')
    expect(api.delete).toHaveBeenCalledWith('/work/saved-jobs/job-1')
  })
})
