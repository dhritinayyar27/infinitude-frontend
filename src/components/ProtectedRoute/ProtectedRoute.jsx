import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from '../LoadingSpinner'

/**
 * Guards routes that require an authenticated session. While the initial
 * `GET /api/auth/me` check is in flight we show a lightweight loading state instead of
 * flashing a redirect to /login.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="animate-fade-slide-in flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner label="Checking your session..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute
