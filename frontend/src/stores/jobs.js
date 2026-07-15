import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as jobsApi from '../api/jobs.js'

const JOBS_TTL_MS = 2 * 60 * 1000

function nearbyKey(params = {}) {
  if (params.lat == null || params.lng == null) return 'all'
  return `${Number(params.lat).toFixed(3)},${Number(params.lng).toFixed(3)}`
}

function candidatesKey(params = {}) {
  const location = params.lat == null || params.lng == null
    ? 'all'
    : `${Number(params.lat).toFixed(3)},${Number(params.lng).toFixed(3)}`
  const term = (params.search || '').trim().toLowerCase()
  const role = (params.role || '').trim().toLowerCase()
  return `${location}|${term}|${role}`
}

function isFresh(timestamp) {
  return timestamp > 0 && Date.now() - timestamp < JOBS_TTL_MS
}

export const useJobsStore = defineStore('jobs', () => {
  const myJobs = ref([])
  const myJobsFetchedAt = ref(0)
  const jobsById = ref({})
  const jobFetchedAt = ref({})
  const applicationsByJob = ref({})
  const applicationsFetchedAt = ref({})
  const nearbyJobsByLocation = ref({})
  const candidates = ref([])
  const candidatesByKey = ref({})
  const myApplications = ref([])
  const myApplicationsFetchedAt = ref(0)
  const pending = new Map()
  let latestCandidatesRequest = 0

  function runOnce(key, request) {
    if (pending.has(key)) return pending.get(key)
    const promise = request().finally(() => pending.delete(key))
    pending.set(key, promise)
    return promise
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

  async function loadNearbyJobs(params = {}, { force = false } = {}) {
    const key = nearbyKey(params)
    const cached = nearbyJobsByLocation.value[key]
    if (!force && cached && isFresh(cached.fetchedAt)) return cached.data
    return runOnce(`nearby:${key}`, async () => {
      const { data } = await jobsApi.getNearbyJobs(params)
      nearbyJobsByLocation.value[key] = { data, fetchedAt: Date.now() }
      return data
    })
  }

  async function loadNearbyCandidates(params = {}, { force = false } = {}) {
    const requestToken = ++latestCandidatesRequest
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
    if (requestToken === latestCandidatesRequest) candidates.value = data
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

  async function createJob(payload) {
    const { data } = await jobsApi.createJob(payload)
    jobsById.value[data.id] = data
    jobFetchedAt.value[data.id] = Date.now()
    if (myJobsFetchedAt.value > 0) {
      myJobs.value = [data, ...myJobs.value.filter((job) => job.id !== data.id)]
      myJobsFetchedAt.value = Date.now()
    }
    nearbyJobsByLocation.value = {}
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
    return data
  }

  async function applyToJob(jobId) {
    const { data } = await jobsApi.applyToJob(jobId)
    myApplicationsFetchedAt.value = 0
    nearbyJobsByLocation.value = {}
    applicationsFetchedAt.value[jobId] = 0
    return data
  }

  function clear() {
    myJobs.value = []
    myJobsFetchedAt.value = 0
    jobsById.value = {}
    jobFetchedAt.value = {}
    applicationsByJob.value = {}
    applicationsFetchedAt.value = {}
    nearbyJobsByLocation.value = {}
    candidates.value = []
    candidatesByKey.value = {}
    latestCandidatesRequest++
    myApplications.value = []
    myApplicationsFetchedAt.value = 0
    pending.clear()
  }

  return {
    myJobs,
    jobsById,
    applicationsByJob,
    nearbyJobsByLocation,
    candidates,
    myApplications,
    loadMyJobs,
    loadJob,
    loadJobApplications,
    loadNearbyJobs,
    loadNearbyCandidates,
    loadMyApplications,
    createJob,
    updateJob,
    applyToJob,
    clear,
  }
})
