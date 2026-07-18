import axios from 'axios'
import { clearSavedCandidates } from '../composables/useSavedCandidates'

const api = axios.create({
  baseURL: '/api',
})

const TOKEN_STORAGE_KEY = 'localhire.accessToken'

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

let accessToken = readStoredToken()

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    const isAuthFlowRequest = ['/auth/login', '/auth/register']
      .some((path) => url.startsWith(path))

    if (error.response?.status === 401 && !isAuthFlowRequest && !error.config?.skipAuthReload) {
      clearAuth()
      window.location.reload()
    }
    return Promise.reject(error)
  },
)

export function setAuth(token) {
  accessToken = token || ''
  try {
    if (accessToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, accessToken)
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  } catch {
    // Storage unavailable (e.g. private mode); fall back to in-memory only.
  }
}

export function clearAuth() {
  accessToken = ''
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // Ignore storage errors.
  }
  clearSavedCandidates()
}

export async function isAuthenticated() {
  if (!accessToken) return false
  try {
    await api.get('/auth/me', { skipAuthReload: true })
    return true
  } catch (err) {
    if (err.response?.status === 401) {
      clearAuth()
    }
    return false
  }
}

export default api
