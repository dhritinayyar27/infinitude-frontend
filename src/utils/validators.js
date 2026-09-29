/**
 * Lightweight, dependency-free input validators shared by the auth pages.
 */

export function isValidEmail(email) {
  if (typeof email !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function isValidName(name) {
  return typeof name === 'string' && name.trim().length >= 2
}

export function isCompleteOtp(otp, length = 6) {
  return typeof otp === 'string' && new RegExp(`^\\d{${length}}$`).test(otp)
}
