import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import GuestRoute from './components/GuestRoute'
import LoadingSpinner from './components/LoadingSpinner'
import Dashboard from './pages/Dashboard'
import CreateNotes from './pages/CreateNotes'
import TocReview from './pages/TocReview'
import GenerationProgress from './pages/GenerationProgress'
import NotesViewer from './pages/NotesViewer'
import Login from './pages/Login'
import Signup from './pages/Signup'
import NotFound from './pages/NotFound'
import { useAuth } from './hooks/useAuth'

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner label="Loading Infinitude..." />
      </div>
    )
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-svh bg-slate-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <GuestRoute>
                <Signup />
              </GuestRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/create"
            element={
              <ProtectedRoute>
                <CreateNotes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/:id/toc"
            element={
              <ProtectedRoute>
                <TocReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/:id/generate"
            element={
              <ProtectedRoute>
                <GenerationProgress />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/:id/view"
            element={
              <ProtectedRoute>
                <NotesViewer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/:id/edit"
            element={
              <ProtectedRoute>
                <NotesViewer />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App

