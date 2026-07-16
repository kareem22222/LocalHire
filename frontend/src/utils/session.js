import { clearAuth } from '../api'
import { clearSavedCandidates } from '../composables/useSavedCandidates'

// Clears the stored auth token and reloads so the app returns to the
// unauthenticated landing state.
export function logout() {
  clearSavedCandidates()
  clearAuth()
  window.location.reload()
}
