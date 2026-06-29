import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

let accessToken = ''

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
      accessToken = ''
      window.location.reload()
    }
    return Promise.reject(error)
  },
)

export function setAuth(token) {
  accessToken = token || ''
}

export function clearAuth() {
  accessToken = ''
}

export async function isAuthenticated() {
  if (!accessToken) return false
  try {
    await api.get('/auth/me', { skipAuthReload: true })
    return true
  } catch (err) {
    if (err.response?.status === 401) {
      accessToken = ''
    }
    return false
  }
}

export default api
