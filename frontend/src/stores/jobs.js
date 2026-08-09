import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as jobsApi from '../api/jobs.js'

const JOBS_TTL_MS = 2 * 60 * 1000

function nearbyKey(params = {}) {
  const location = params.lat == null || params.lng == null
    ? 'all'
    : `${Number(params.lat)},${Number(params.lng)}`
  const term = (params.search || '').trim().toLowerCase()
  const employmentType = (params.employmentType || '').trim().toLowerCase()
  return `${location}|${term}|${employmentType}`
}

function candidatesKey(params = {}) {
  const location = params.lat == null || params.lng == null
    ? 'all'
    : `${Number(params.lat)},${Number(params.lng)}`
  const term = (params.search || '').trim().toLowerCase()
  const role = (params.role || '').trim().toLowerCase()
  return `${location}|${term}|${role}`
}

function isFresh(timestamp) {
  return timestamp > 0 && Date.now() - timestamp < JOBS_TTL_MS
}

function paramsKey(params = {}) {
  return Object.entries(params)
    .filter(([, value]) => value != null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${String(value).trim().toLowerCase()}`)
    .join('|')
}

const emptyPage = () => ({ items: [], page: 1, pageSize: 20, totalCount: 0, totalPages: 0 })

export const useJobsStore = defineStore('jobs', () => {
  const myJobs = ref([])
  const myJobsFetchedAt = ref(0)
  const jobsById = ref({})
  const jobFetchedAt = ref({})
  const applicationsByJob = ref({})
  const applicationsFetchedAt = ref({})
  const candidatesById = ref({})
  const candidateFetchedAt = ref({})
  const nearbyJobsByLocation = ref({})
  const candidates = ref([])
  const candidatesByKey = ref({})
  const myApplications = ref([])
  const myApplicationsFetchedAt = ref(0)
  const workerJobsPage = ref(emptyPage())
  const candidateSearchPage = ref(emptyPage())
  const employerJobsPage = ref(emptyPage())
  const jobApplicationsPage = ref(emptyPage())
  const myApplicationsPage = ref(emptyPage())
  const savedJobsPage = ref(emptyPage())
  const savedCandidatesPage = ref(emptyPage())
  const pagedCache = new Map()
  const pending = new Map()
  let pagedGeneration = 0
  let latestNearbyCandidatesRequest = 0
  let latestCandidateSearchRequest = 0
  let latestEmployerJobsRequest = 0
  let latestJobApplicationsRequest = 0
  let latestWorkerJobsRequest = 0
  let latestMyApplicationsPageRequest = 0
  let latestSavedJobsPageRequest = 0
  let latestSavedCandidatesPageRequest = 0

  function runOnce(key, request) {
    if (pending.has(key)) return pending.get(key)
    const promise = request().finally(() => pending.delete(key))
    pending.set(key, promise)
    return promise
  }

  async function loadPaged(key, request, target, { force = false, assign = () => true } = {}) {
    const cached = pagedCache.get(key)
    if (!force && cached && isFresh(cached.fetchedAt)) {
      if (assign()) target.value = cached.data
      return cached.data
    }
    const generation = pagedGeneration
    const data = await runOnce(`${generation}:${key}`, async () => (await request()).data)
    if (generation !== pagedGeneration) return data
    pagedCache.set(key, { data, fetchedAt: Date.now() })
    if (assign()) target.value = data
    return data
  }

  async function loadMyJobs({ force = false } = {}) {
    if (!force && isFresh(myJobsFetchedAt.value)) return myJobs.value
    return runOnce('my-jobs', async () => {
      const { data } = await jobsApi.getMyJobs()
      myJobs.value = data
      myJobsFetchedAt.value = Date.now()
      for (const job of data) {
        jobsById.value[job.id] = job
        jobFetchedAt.value[job.id] = myJobsFetchedAt.value
      }
      return data
    })
  }

  async function loadJob(id, { force = false } = {}) {
    if (!force && jobsById.value[id] && isFresh(jobFetchedAt.value[id])) {
      return jobsById.value[id]
    }
    return runOnce(`job:${id}`, async () => {
      const { data } = await jobsApi.getJob(id)
      jobsById.value[id] = data
      jobFetchedAt.value[id] = Date.now()
      return data
    })
  }

  async function loadJobApplications(jobId, { force = false } = {}) {
    if (!force && isFresh(applicationsFetchedAt.value[jobId])) {
      return applicationsByJob.value[jobId]
    }
    return runOnce(`job-applications:${jobId}`, async () => {
      const { data } = await jobsApi.getJobApplications(jobId)
      applicationsByJob.value[jobId] = data
      applicationsFetchedAt.value[jobId] = Date.now()
      return data
    })
  }

  function loadEmployerJobsPage(params = {}, { force = false } = {}) {
    const requestToken = ++latestEmployerJobsRequest
    return loadPaged(`employer-jobs:${paramsKey(params)}`,
      () => jobsApi.getMyJobsPaged(params), employerJobsPage,
      { force, assign: () => requestToken === latestEmployerJobsRequest })
  }

  function loadJobApplicationsPage(jobId, params = {}, { force = false } = {}) {
    const requestToken = ++latestJobApplicationsRequest
    return loadPaged(`job-applications-page:${jobId}:${paramsKey(params)}`,
      () => jobsApi.getJobApplicationsPaged(jobId, params), jobApplicationsPage,
      { force, assign: () => requestToken === latestJobApplicationsRequest })
  }

  async function updateApplicant(jobId, applicationId, request) {
    const { data } = await request(jobId, applicationId)
    if (applicationsByJob.value[jobId]) {
      applicationsByJob.value[jobId] = applicationsByJob.value[jobId]
        .map((application) => application.id === applicationId ? data : application)
      applicationsFetchedAt.value[jobId] = Date.now()
    }
    jobApplicationsPage.value = {
      ...jobApplicationsPage.value,
      items: jobApplicationsPage.value.items
        .map((application) => application.id === applicationId ? data : application),
    }
    invalidatePaged()
    jobFetchedAt.value[jobId] = 0
    myJobsFetchedAt.value = 0
    return data
  }

  const shortlistApplicant = (jobId, applicationId) =>
    updateApplicant(jobId, applicationId, jobsApi.shortlistApplicant)

  const rejectApplicant = (jobId, applicationId) =>
    updateApplicant(jobId, applicationId, jobsApi.rejectApplicant)

  const hireApplicant = (jobId, applicationId) =>
    updateApplicant(jobId, applicationId, jobsApi.hireApplicant)

  async function loadCandidate(id, { force = false } = {}) {
    const cached = candidatesById.value[id]
    if (!force && cached && isFresh(candidateFetchedAt.value[id])) return cached
    return runOnce(`candidate:${id}`, async () => {
      const { data } = await jobsApi.getCandidate(id)
      candidatesById.value[id] = data
      candidateFetchedAt.value[id] = Date.now()
      return data
    })
  }

  async function loadNearbyJobs(params = {}, { force = false } = {}) {
    const key = nearbyKey(params)
    const cached = nearbyJobsByLocation.value[key]
    if (!force && cached && isFresh(cached.fetchedAt)) return cached.data
    return runOnce(`nearby:${key}`, async () => {
      const { data } = await jobsApi.getNearbyJobs(params)
      const fetchedAt = Date.now()
      nearbyJobsByLocation.value[key] = { data, fetchedAt }
      for (const job of data) {
        jobsById.value[job.id] = job
        jobFetchedAt.value[job.id] = fetchedAt
      }
      return data
    })
  }

  async function loadWorkerJobsPage(params = {}, { force = false } = {}) {
    const requestToken = ++latestWorkerJobsRequest
    const data = await loadPaged(`worker-job-search:${nearbyKey(params)}:${params.page || 1}:${params.pageSize || 20}`,
      () => jobsApi.searchJobs(params), workerJobsPage,
      { force, assign: () => requestToken === latestWorkerJobsRequest })
    const fetchedAt = Date.now()
    for (const job of data.items) {
      jobsById.value[job.id] = job
      jobFetchedAt.value[job.id] = fetchedAt
    }
    return data
  }

  async function loadWorkerJob(id, { force = false } = {}) {
    if (!force && jobsById.value[id] && isFresh(jobFetchedAt.value[id])) {
      return jobsById.value[id]
    }
    return runOnce(`worker-job:${id}`, async () => {
      const { data } = await jobsApi.getWorkerJob(id)
      jobsById.value[id] = data
      jobFetchedAt.value[id] = Date.now()
      return data
    })
  }

  async function loadNearbyCandidates(params = {}, { force = false } = {}) {
    const requestToken = ++latestNearbyCandidatesRequest
    const key = candidatesKey(params)
    const cached = candidatesByKey.value[key]
    if (!force && cached && isFresh(cached.fetchedAt)) {
      candidates.value = cached.data
      return cached.data
    }
    const data = await runOnce(`candidates:${key}`, async () => {
      const { data } = await jobsApi.getNearbyCandidates(params)
      candidatesByKey.value[key] = { data, fetchedAt: Date.now() }
      return data
    })
    if (requestToken === latestNearbyCandidatesRequest) candidates.value = data
    return data
  }

  async function loadCandidateSearchPage(params = {}, { force = false } = {}) {
    const requestToken = ++latestCandidateSearchRequest
    const data = await loadPaged(
      `candidate-search:${candidatesKey(params)}:${params.page || 1}:${params.pageSize || 20}`,
      () => jobsApi.searchCandidates(params), candidateSearchPage,
      { force, assign: () => requestToken === latestCandidateSearchRequest },
    )
    return data
  }

  async function loadMyApplications({ force = false } = {}) {
    if (!force && isFresh(myApplicationsFetchedAt.value)) return myApplications.value
    return runOnce('my-applications', async () => {
      const { data } = await jobsApi.getMyApplications()
      myApplications.value = data
      myApplicationsFetchedAt.value = Date.now()
      return data
    })
  }

  function loadMyApplicationsPage(params = {}, { force = false } = {}) {
    const requestToken = ++latestMyApplicationsPageRequest
    return loadPaged(`my-applications-page:${paramsKey(params)}`,
      () => jobsApi.getMyApplicationsPaged(params), myApplicationsPage,
      { force, assign: () => requestToken === latestMyApplicationsPageRequest })
  }

  function loadSavedJobsPage(params = {}, { force = false } = {}) {
    const requestToken = ++latestSavedJobsPageRequest
    return loadPaged(`saved-jobs-page:${paramsKey(params)}`,
      () => jobsApi.getSavedJobsPaged(params), savedJobsPage,
      { force, assign: () => requestToken === latestSavedJobsPageRequest })
  }

  function loadSavedCandidatesPage(params = {}, { force = false } = {}) {
    const requestToken = ++latestSavedCandidatesPageRequest
    return loadPaged(`saved-candidates-page:${paramsKey(params)}`,
      () => jobsApi.getSavedCandidatesPaged(params), savedCandidatesPage,
      { force, assign: () => requestToken === latestSavedCandidatesPageRequest })
  }

  function invalidatePaged() {
    pagedGeneration++
    pagedCache.clear()
  }

  async function createJob(payload) {
    const { data } = await jobsApi.createJob(payload)
    jobsById.value[data.id] = data
    jobFetchedAt.value[data.id] = Date.now()
    if (myJobsFetchedAt.value > 0) {
      myJobs.value = [data, ...myJobs.value.filter((job) => job.id !== data.id)]
      myJobsFetchedAt.value = Date.now()
    }
    nearbyJobsByLocation.value = {}
    invalidatePaged()
    return data
  }

  async function updateJob(id, payload) {
    const { data } = await jobsApi.updateJob(id, payload)
    jobsById.value[id] = data
    jobFetchedAt.value[id] = Date.now()
    if (myJobsFetchedAt.value > 0) {
      myJobs.value = myJobs.value.map((job) => job.id === id ? data : job)
      myJobsFetchedAt.value = Date.now()
    }
    nearbyJobsByLocation.value = {}
    invalidatePaged()
    return data
  }

  async function applyToJob(jobId) {
    const { data } = await jobsApi.applyToJob(jobId)
    myApplicationsFetchedAt.value = 0
    nearbyJobsByLocation.value = {}
    invalidatePaged()
    applicationsFetchedAt.value[jobId] = 0
    jobFetchedAt.value[jobId] = 0
    return data
  }

  function clear() {
    invalidatePaged()
    myJobs.value = []
    myJobsFetchedAt.value = 0
    jobsById.value = {}
    jobFetchedAt.value = {}
    applicationsByJob.value = {}
    applicationsFetchedAt.value = {}
    candidatesById.value = {}
    candidateFetchedAt.value = {}
    nearbyJobsByLocation.value = {}
    candidates.value = []
    candidatesByKey.value = {}
    latestNearbyCandidatesRequest++
    latestCandidateSearchRequest++
    latestEmployerJobsRequest++
    latestJobApplicationsRequest++
    latestWorkerJobsRequest++
    latestMyApplicationsPageRequest++
    latestSavedJobsPageRequest++
    latestSavedCandidatesPageRequest++
    myApplications.value = []
    myApplicationsFetchedAt.value = 0
    workerJobsPage.value = emptyPage()
    candidateSearchPage.value = emptyPage()
    employerJobsPage.value = emptyPage()
    jobApplicationsPage.value = emptyPage()
    myApplicationsPage.value = emptyPage()
    savedJobsPage.value = emptyPage()
    savedCandidatesPage.value = emptyPage()
    pending.clear()
  }

  return {
    myJobs,
    jobsById,
    applicationsByJob,
    nearbyJobsByLocation,
    candidates,
    myApplications,
    workerJobsPage,
    candidateSearchPage,
    employerJobsPage,
    jobApplicationsPage,
    myApplicationsPage,
    savedJobsPage,
    savedCandidatesPage,
    loadMyJobs,
    loadJob,
    loadJobApplications,
    loadEmployerJobsPage,
    loadJobApplicationsPage,
    shortlistApplicant,
    rejectApplicant,
    hireApplicant,
    loadCandidate,
    loadNearbyJobs,
    loadWorkerJobsPage,
    loadWorkerJob,
    loadNearbyCandidates,
    loadCandidateSearchPage,
    loadMyApplications,
    loadMyApplicationsPage,
    loadSavedJobsPage,
    loadSavedCandidatesPage,
    createJob,
    updateJob,
    applyToJob,
    clear,
  }
})
