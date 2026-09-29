import api from './api'

/**
 * Auth calls for the Email + OTP flow (PROJECT_ARCHITECTURE.md §17).
 *
 * There is no password auth and no client-side token handling anywhere here - the
 * backend issues an httpOnly session cookie on successful OTP verification and the
 * browser attaches it automatically because `api` is configured with
 * `withCredentials: true`. Nothing in this module ever reads/stores a token.
 */

export const sendLoginOtp = (email) => api.post('/auth/login/send-otp', { email })

export const verifyLoginOtp = (email, otp) => api.post('/auth/login/verify-otp', { email, otp })

export const sendSignupOtp = (name, email) => api.post('/auth/signup/send-otp', { name, email })

export const verifySignupOtp = (name, email, otp) =>
  api.post('/auth/signup/verify-otp', { name, email, otp })

export const logout = () => api.post('/auth/logout')

export const getCurrentUser = () => api.get('/auth/me')
