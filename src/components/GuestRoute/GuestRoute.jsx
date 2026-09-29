import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from '../LoadingSpinner'

/**
 * Guards routes that should only be visible to unauthenticated visitors
 * (e.g. /login, /signup) - already-authenticated users are sent to /dashboard.
 */
function GuestRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="animate-fade-slide-in flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner label="Checking your session..." />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default GuestRoute
