import axios from 'axios'

// Determine API base URL
// In production, use the backend URL directly to avoid reverse proxy issues
// In development, use '/api' which will be proxied by Vite
const getApiBaseUrl = () => {
  // Check if we're in production (hosted on dd.cp.hupcfl.com)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // Auto-detect production environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    // If running on production domain, use backend URL directly
    if (hostname === 'dd.cp.hupcfl.com' || hostname.includes('hupcfl.com')) {
      return 'https://dd-backend.cp.hupcfl.com/api'
    }
  }
  
  // Default to '/api' for development (Vite proxy)
  return '/api'
}

const API_BASE_URL = getApiBaseUrl()

// Log API configuration in development
if (import.meta.env.DEV) {
  console.log('API Base URL:', API_BASE_URL)
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

