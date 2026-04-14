/**
 * Axios instance with JWT auto-refresh interceptor.
 * - On 401 response → tries to refresh token
 * - If refresh fails → clears storage and redirects to /login
 * - Queues concurrent requests during refresh
 */
import axios from 'axios'

const api = axios.create({ baseURL: '/' })

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token))
  failedQueue = []
}

// Request interceptor — attach token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor — handle 401
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config

    // Only retry once, skip refresh endpoint itself
    if (err.response?.status !== 401 || original._retry || original.url?.includes('/api/auth/') || !original) {
      return Promise.reject(err)
    }

    if (isRefreshing) {
      // Queue this request until refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry = true
    isRefreshing = true

    const refresh = localStorage.getItem('refresh')
    if (!refresh) {
      localStorage.clear()
      window.location.href = '/login'
      return Promise.reject(err)
    }

    try {
      const { data } = await axios.post('/api/auth/refresh/', { refresh })
      const newAccess = data.access
      localStorage.setItem('access', newAccess)
      api.defaults.headers.common.Authorization = `Bearer ${newAccess}`
      processQueue(null, newAccess)
      original.headers.Authorization = `Bearer ${newAccess}`
      return api(original)
    } catch (refreshErr) {
      processQueue(refreshErr, null)
      localStorage.clear()
      window.location.href = '/login'
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  }
)

export default api
