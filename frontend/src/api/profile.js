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
