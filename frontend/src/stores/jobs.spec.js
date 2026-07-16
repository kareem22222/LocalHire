import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as jobsApi from '../api/jobs.js'
import { useJobsStore } from './jobs.js'

vi.mock('../api/jobs.js', () => ({
  getMyJobs: vi.fn(),
  getJob: vi.fn(),
  createJob: vi.fn(),
  updateJob: vi.fn(),
  getJobApplications: vi.fn(),
  shortlistApplicant: vi.fn(),
  getCandidate: vi.fn(),
  getNearbyJobs: vi.fn(),
  getNearbyCandidates: vi.fn(),
  applyToJob: vi.fn(),
  getMyApplications: vi.fn(),
}))

describe('jobs store cache', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('reuses job data loaded by the dashboard on the detail page', async () => {
    const job = { id: 'job-1', title: 'Cashier' }
    jobsApi.getMyJobs.mockResolvedValue({ data: [job] })
    const store = useJobsStore()

    await store.loadMyJobs()
    const detail = await store.loadJob('job-1')

    expect(detail).toEqual(job)
    expect(jobsApi.getMyJobs).toHaveBeenCalledTimes(1)
    expect(jobsApi.getJob).not.toHaveBeenCalled()
  })

  it('deduplicates concurrent requests for the same nearby search', async () => {
    let resolveRequest
    jobsApi.getNearbyJobs.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    const store = useJobsStore()
    const params = { lat: 12.346, lng: 77.654 }

    const first = store.loadNearbyJobs(params)
    const second = store.loadNearbyJobs(params)
    resolveRequest({ data: [{ id: 'job-1' }] })

    await expect(first).resolves.toEqual([{ id: 'job-1' }])
    await expect(second).resolves.toEqual([{ id: 'job-1' }])
    expect(jobsApi.getNearbyJobs).toHaveBeenCalledTimes(1)
  })

  it('keeps the latest candidate search visible when responses arrive out of order', async () => {
    const requests = {}
    jobsApi.getNearbyCandidates.mockImplementation(({ search }) =>
      new Promise((resolve) => { requests[search] = resolve }))
    const store = useJobsStore()

    const first = store.loadNearbyCandidates({ search: 'first' }, { force: true })
    const second = store.loadNearbyCandidates({ search: 'second' }, { force: true })
    requests.second({ data: [{ id: 'second' }] })
    await expect(second).resolves.toEqual([{ id: 'second' }])
    requests.first({ data: [{ id: 'first' }] })
    await expect(first).resolves.toEqual([{ id: 'first' }])

    expect(store.candidates).toEqual([{ id: 'second' }])
    await expect(store.loadNearbyCandidates({ search: 'first' })).resolves.toEqual([{ id: 'first' }])
    expect(jobsApi.getNearbyCandidates).toHaveBeenCalledTimes(2)
  })

  it('updates cached employer data and invalidates nearby searches after an edit', async () => {
    jobsApi.getMyJobs.mockResolvedValue({ data: [{ id: 'job-1', title: 'Cashier' }] })
    jobsApi.getNearbyJobs
      .mockResolvedValueOnce({ data: [{ id: 'job-1', title: 'Cashier' }] })
      .mockResolvedValueOnce({ data: [{ id: 'job-1', title: 'Senior Cashier' }] })
    jobsApi.updateJob.mockResolvedValue({ data: { id: 'job-1', title: 'Senior Cashier' } })
    const store = useJobsStore()

    await store.loadMyJobs()
    await store.loadNearbyJobs()
    await store.updateJob('job-1', { title: 'Senior Cashier' })
    await store.loadNearbyJobs()

    expect(store.myJobs[0].title).toBe('Senior Cashier')
    expect(store.jobsById['job-1'].title).toBe('Senior Cashier')
    expect(jobsApi.getNearbyJobs).toHaveBeenCalledTimes(2)
  })

  it('caches applications and candidates and invalidates applications after shortlisting', async () => {
    const applications = [{ id: 'application-1', status: 'Pending' }]
    const candidate = { id: 'candidate-1', name: 'Ravi' }
    jobsApi.getJobApplications.mockResolvedValue({ data: applications })
    jobsApi.getJob.mockResolvedValue({ data: { id: 'job-1', title: 'Cashier' } })
    jobsApi.getCandidate.mockResolvedValue({ data: candidate })
    jobsApi.shortlistApplicant.mockResolvedValue({ data: { ...applications[0], status: 'Shortlisted' } })
    const store = useJobsStore()

    await store.loadJob('job-1')
    await expect(store.loadJobApplications('job-1')).resolves.toEqual(applications)
    await expect(store.loadJobApplications('job-1')).resolves.toEqual(applications)
    await expect(store.loadCandidate('candidate-1')).resolves.toEqual(candidate)
    await expect(store.loadCandidate('candidate-1')).resolves.toEqual(candidate)
    await store.shortlistApplicant('job-1', 'application-1')
    await store.loadJobApplications('job-1')
    await store.loadJob('job-1')

    expect(jobsApi.getJobApplications).toHaveBeenCalledTimes(2)
    expect(jobsApi.getJob).toHaveBeenCalledTimes(2)
    expect(jobsApi.getCandidate).toHaveBeenCalledTimes(1)
    expect(jobsApi.shortlistApplicant).toHaveBeenCalledWith('job-1', 'application-1')
  })
})
