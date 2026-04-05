/**
 * Vitalix API client
 * Centrale axios instantie voor alle API-calls naar de FastAPI backend.
 * Base URL is leeg — Vite proxy stuurt /api/* door naar localhost:8000.
 */
import axios from 'axios'

const api = axios.create({
  baseURL: '',
  withCredentials: true, // sessie-cookie meesturen
  headers: { 'Content-Type': 'application/json' },
})

// Bij 401: redirect naar login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
