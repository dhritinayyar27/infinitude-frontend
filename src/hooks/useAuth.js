import { useContext } from 'react'
import { AuthContext } from '../context/authContext.js'

/**
 * Access the auth context ({ user, isLoading, isAuthenticated, loginWithOtp,
 * signupWithOtp, logout, refreshUser }). Must be used within an <AuthProvider>.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
