// Job-related API calls. Components depend on these named functions instead of
// raw axios URLs, so endpoint details live in one place (DIP / SRP).
import api from './index.js'

// --- Hiring ---
export function getMyJobs() {
  return api.get('/hiring/jobs')
}

export function getJob(id) {
  return api.get(`/hiring/jobs/${id}`)
}

export function createJob(payload) {
  return api.post('/hiring/jobs', payload)
}

export function updateJob(id, payload) {
  return api.put(`/hiring/jobs/${id}`, payload)
}

export function getJobApplications(jobId) {
  return api.get(`/hiring/jobs/${jobId}/applications`)
}

export function shortlistApplicant(jobId, applicationId) {
  return api.post(`/hiring/jobs/${jobId}/applications/${applicationId}/shortlist`)
}

export function getCandidate(id) {
  return api.get(`/hiring/candidates/${id}`)
}

export function getNearbyCandidates(params = {}) {
  return api.get('/hiring/candidates/nearby', { params })
}

// --- Worker ---
export function getNearbyJobs(params = {}) {
  return api.get('/work/jobs/nearby', { params })
}

export function getWorkerJob(id) {
  return api.get(`/work/jobs/${id}`)
}

export function applyToJob(jobId) {
  return api.post(`/work/jobs/${jobId}/apply`)
}

export function getMyApplications() {
  return api.get('/work/applications')
}
