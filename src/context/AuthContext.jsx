import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getCurrentUser,
  logout as logoutRequest,
  verifyLoginOtp,
  verifySignupOtp,
} from '../services/authApi'
import { AuthContext } from './authContext.js'

/**
 * Auth state is derived exclusively from `GET /api/auth/me` (PROJECT_ARCHITECTURE.md
 * §17.6) - there is no token stored/decoded on the frontend. A 401 from `/me` just
 * means "not authenticated", not an application error.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await getCurrentUser()
      setUser(data)
      return data
    } catch {
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    ;(async () => {
      try {
        const { data } = await getCurrentUser()
        if (isMounted) setUser(data)
      } catch {
        if (isMounted) setUser(null)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [])

  const loginWithOtp = useCallback(async (email, otp) => {
    const { data } = await verifyLoginOtp(email, otp)
    setUser(data.user)
    return data.user
  }, [])

  const signupWithOtp = useCallback(async (name, email, otp) => {
    const { data } = await verifySignupOtp(name, email, otp)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      loginWithOtp,
      signupWithOtp,
      logout,
      refreshUser,
    }),
    [user, isLoading, loginWithOtp, signupWithOtp, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
