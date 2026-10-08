import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from '../LoadingSpinner'
import { BRAND_LOGO_SRC } from '../Brand/Brand'

function Navbar() {
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link
          to={isAuthenticated ? '/dashboard' : '/login'}
          className="flex items-center gap-2 rounded text-xl font-semibold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        >
          <img src={BRAND_LOGO_SRC} alt="" aria-hidden="true" className="h-6 w-6" />
          Infinitude
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-600 sm:gap-6">
          {isLoading && <LoadingSpinner size="sm" />}
          {!isLoading && isAuthenticated && (
            <>
              <Link to="/dashboard" className="rounded transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2">
                Dashboard
              </Link>
              <Link
                to="/notes/create"
                className="rounded-md bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                + Create Notes
              </Link>
              {user?.name && <span className="hidden text-slate-500 sm:inline">{user.name}</span>}
              <button
                type="button"
                onClick={handleLogout}
                data-testid="logout-button"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                Logout
              </button>
            </>
          )}
          {!isLoading && !isAuthenticated && (
            <>
              <Link to="/login" className="rounded transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2">
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-md bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Navbar
