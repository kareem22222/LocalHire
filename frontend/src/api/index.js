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
    const isAuthFlowRequest = ['/auth/login', '/auth/register', '/auth/logout']
      .some((path) => url.startsWith(path))

    if (error.response?.status === 401 && !isAuthFlowRequest && !error.config?.skipAuthReload) {
      accessToken = ''
      localStorage.removeItem('user')
      window.location.reload()
    }
    return Promise.reject(error)
  },
)

export function setAuth(token) {
  accessToken = token
  localStorage.removeItem('user')
}

export async function clearAuth() {
  accessToken = ''
  localStorage.removeItem('user')
  try {
    await api.post('/auth/logout', null, { skipAuthReload: true })
  } catch {
  }
}

export async function isAuthenticated() {
  try {
    await api.get('/auth/me', { skipAuthReload: true })
    return true
  } catch {
    return false
  }
}

export default api
