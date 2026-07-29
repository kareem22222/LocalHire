// Current-user profile and location API calls.
import api from './index.js'

// Returns the authenticated user's profile (GET /auth/me).
export function getMe() {
  return api.get('/auth/me')
}

export function updateProfile(details) {
  return api.put('/me/profile', details)
}

export function updateLocation(coords) {
  return api.put('/me/location', coords)
}

export function uploadResume(file, onUploadProgress) {
  const data = new FormData()
  data.append('resume', file)
  return api.put('/me/resume', data, { onUploadProgress })
}

export function getMyResume() {
  return api.get('/me/resume')
}
