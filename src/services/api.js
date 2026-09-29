import axios from 'axios'

/**
 * Centralized Axios client for the Infinitude API.
 *
 * All HTTP calls to the Spring Boot backend must go through this module - never call
 * axios/fetch directly from components or pages. The Gemini API key never lives here or
 * anywhere in the frontend; it is a backend-only secret.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // The auth session lives in an httpOnly cookie set by the backend (see
  // PROJECT_ARCHITECTURE.md §17.6). The frontend never reads/stores the token itself -
  // withCredentials just lets the browser attach/receive that cookie automatically.
  withCredentials: true,
})

export default api
