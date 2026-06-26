import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    const isAuthFlowRequest = ['/auth/login', '/auth/register', '/auth/logout']
      .some((path) => url.startsWith(path))

    if (error.response?.status === 401 && !isAuthFlowRequest && !error.config?.skipAuthReload) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.reload()
    }
    return Promise.reject(error)
  },
)

export function setAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export async function clearAuth() {
  localStorage.removeItem('token')
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
