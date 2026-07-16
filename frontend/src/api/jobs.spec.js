import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from './index.js'
import { getCandidate, shortlistApplicant } from './jobs.js'

vi.mock('./index.js', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

describe('jobs API candidate actions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls the shortlist and candidate endpoints', () => {
    shortlistApplicant('job-1', 'application-1')
    getCandidate('candidate-1')

    expect(api.post).toHaveBeenCalledWith('/hiring/jobs/job-1/applications/application-1/shortlist')
    expect(api.get).toHaveBeenCalledWith('/hiring/candidates/candidate-1')
  })
})
