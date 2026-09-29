/**
 * Turns an Axios error into a safe, user-facing message.
 *
 * Backend errors follow the shape documented in PROJECT_ARCHITECTURE.md §10:
 * `{ timestamp, status, error, message, path }`. We surface `message` when present
 * since the backend already keeps it non-leaky, and otherwise fall back to a generic,
 * status-aware message rather than exposing raw error/network details.
 */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const status = error?.response?.status
  const data = error?.response?.data

  if (data && typeof data.message === 'string' && data.message.trim()) {
    return data.message
  }

  if (!error?.response) {
    return 'Network error - please check your connection and try again.'
  }

  if (status === 429) {
    return 'Too many attempts. Please wait a moment before trying again.'
  }

  if (status === 423) {
    return 'This account is temporarily locked due to too many failed attempts. Please try again later.'
  }

  return fallback
}
