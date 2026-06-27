import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

function getStoredToken() {
  return localStorage.getItem('lh_token') || ''
}

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    const isAuthFlowRequest = ['/auth/login', '/auth/register', '/auth/logout']
      .some((path) => url.startsWith(path))

    if (error.response?.status === 401 && !isAuthFlowRequest && !error.config?.skipAuthReload) {
      localStorage.removeItem('lh_token')
      window.location.reload()
    }
    return Promise.reject(error)
  },
)

export function setAuth(token) {
  localStorage.setItem('lh_token', token)
}

export async function clearAuth() {
  localStorage.removeItem('lh_token')
  try {
    await api.post('/auth/logout', null, { skipAuthReload: true })
  } catch {
  }
}

export async function isAuthenticated() {
  if (!getStoredToken()) return false
  try {
    await api.get('/auth/me', { skipAuthReload: true })
    return true
  } catch {
    localStorage.removeItem('lh_token')
    return false
  }
}

export default api
