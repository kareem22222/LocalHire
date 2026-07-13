// Authentication API calls (register / login).
import api from './index.js'

export function register(payload) {
  return api.post('/auth/register', payload)
}

export function login(payload) {
  return api.post('/auth/login', payload)
}
