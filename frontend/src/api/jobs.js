// Job-related API calls. Components depend on these named functions instead of
// raw axios URLs, so endpoint details live in one place (DIP / SRP).
import api from './index.js'

// --- Hiring ---
export function getMyJobs() {
  return api.get('/hiring/jobs')
}

export function getMyJobsPaged(params = {}) {
  return api.get('/hiring/jobs/paged', { params })
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

export function setJobActive(id, isActive) {
  return api.patch(`/hiring/jobs/${id}/status`, { isActive })
}

export function getJobApplications(jobId) {
  return api.get(`/hiring/jobs/${jobId}/applications`)
}

export function getJobApplicationsPaged(jobId, params = {}) {
  return api.get(`/hiring/jobs/${jobId}/applications/paged`, { params })
}

export function shortlistApplicant(jobId, applicationId) {
  return api.post(`/hiring/jobs/${jobId}/applications/${applicationId}/shortlist`)
}

export function rejectApplicant(jobId, applicationId) {
  return api.post(`/hiring/jobs/${jobId}/applications/${applicationId}/reject`)
}

export function hireApplicant(jobId, applicationId) {
  return api.post(`/hiring/jobs/${jobId}/applications/${applicationId}/hire`)
}

export function getCandidate(id) {
  return api.get(`/hiring/candidates/${id}`)
}

export function getCandidateResume(id) {
  return api.get(`/hiring/candidates/${id}/resume`)
}

export function getNearbyCandidates(params = {}) {
  return api.get('/hiring/candidates/nearby', { params })
}

export function searchCandidates(params = {}) {
  return api.get('/hiring/candidates/search', { params })
}

export function getSavedCandidates() {
  return api.get('/hiring/saved-candidates')
}

export function getSavedCandidatesPaged(params = {}) {
  return api.get('/hiring/saved-candidates/paged', { params })
}

export function saveCandidate(workerId) {
  return api.post(`/hiring/saved-candidates/${workerId}`)
}

export function removeSavedCandidate(workerId) {
  return api.delete(`/hiring/saved-candidates/${workerId}`)
}

export function inviteCandidate(workerId, jobPostId) {
  return api.post(`/hiring/candidates/${workerId}/invitations`, { jobPostId })
}

// --- Worker ---
export function getNearbyJobs(params = {}) {
  return api.get('/work/jobs/nearby', { params })
}

export function searchJobs(params = {}) {
  return api.get('/work/jobs/search', { params })
}

export function getWorkerJob(id) {
  return api.get(`/work/jobs/${id}`)
}

export function getBusinessProfile(employerId) {
  return api.get(`/work/businesses/${employerId}`)
}

export function applyToJob(jobId) {
  return api.post(`/work/jobs/${jobId}/apply`)
}

export function getMyApplications() {
  return api.get('/work/applications')
}

export function getMyApplicationsPaged(params = {}) {
  return api.get('/work/applications/paged', { params })
}

export function withdrawApplication(applicationId) {
  return api.post(`/work/applications/${applicationId}/withdraw`)
}

export function getMyInvitations() {
  return api.get('/work/invitations')
}

export function declineInvitation(invitationId) {
  return api.post(`/work/invitations/${invitationId}/decline`)
}

export function getAppointment(applicationId, role = 'work') {
  return api.get(`/${role}/applications/${applicationId}/appointment`)
}

export function setAppointment(applicationId, payload, role = 'work') {
  return api.put(`/${role}/applications/${applicationId}/appointment`, payload)
}

export function confirmAppointment(applicationId, role = 'work') {
  return api.post(`/${role}/applications/${applicationId}/appointment/confirm`)
}

export function cancelAppointment(applicationId, role = 'work') {
  return api.post(`/${role}/applications/${applicationId}/appointment/cancel`)
}

export function downloadAppointment(applicationId, role = 'work') {
  return api.get(`/${role}/applications/${applicationId}/appointment.ics`, { responseType: 'blob' })
}

export function getSavedJobs() {
  return api.get('/work/saved-jobs')
}

export function getSavedJobsPaged(params = {}) {
  return api.get('/work/saved-jobs/paged', { params })
}

export function saveJob(jobId) {
  return api.post(`/work/saved-jobs/${jobId}`)
}

export function removeSavedJob(jobId) {
  return api.delete(`/work/saved-jobs/${jobId}`)
}
