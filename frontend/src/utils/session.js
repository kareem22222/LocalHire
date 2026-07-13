import { clearAuth } from '../api'

// Clears the stored auth token and reloads so the app returns to the
// unauthenticated landing state.
export function logout() {
  clearAuth()
  window.location.reload()
}
