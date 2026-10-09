export function getApiBaseUrl(env) {
  // Production must stay same-origin for the Secure, SameSite=Strict session cookie.
  return env.PROD ? '/api' : env.VITE_API_BASE_URL || '/api'
}
