import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/LoadingSpinner'
import { listNotes, deleteNote } from '../../services/notesApi'

const STATUS_BADGE = {
  DRAFT: 'rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600',
  GENERATING_TOC: 'rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700',
  TOC_READY: 'rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700',
  GENERATING_NOTES: 'rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 animate-pulse',
  COMPLETED: 'rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700',
  FAILED: 'rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700',
}

const DIFFICULTY_BADGE = 'rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600'

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function NoteCard({ note, onDelete }) {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm(`Delete "${note.title || note.topic}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteNote(note.id)
      toast.success('Note and its TOC deleted.')
      onDelete(note.id)
    } catch {
      toast.error('Failed to delete note. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const title = note.title || note.topic || 'Untitled Table of Contents'
  const sectionCount = note.sections?.length ?? note.sectionCount ?? 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-md shadow-slate-900/5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">{title}</h2>
        <span className={STATUS_BADGE[note.status] || DIFFICULTY_BADGE}>
          {note.status?.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {note.difficulty && (
          <span className={DIFFICULTY_BADGE}>{note.difficulty}</span>
        )}
        {sectionCount > 0 && (
          <span className="text-slate-500">{sectionCount} section{sectionCount !== 1 ? 's' : ''}</span>
        )}
      </div>

      {note.createdAt && (
        <p className="text-xs text-slate-400">{formatDate(note.createdAt)}</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/notes/${note.id}/toc`)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            Open TOC
          </button>
        {note.tocSaved && (
          <Link to={`/notes/${note.id}`} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
            Review Notes
          </Link>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

function Dashboard() {
  const [notes, setNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchNotes() {
    setIsLoading(true)
    setError(null)
    try {
      const res = await listNotes()
      setNotes(res.data ?? [])
    } catch {
      setError('Failed to load your notes. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [])

  function handleNoteDeleted(noteId) {
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Notes</h1>
        </div>
        <Link
          to="/notes/create"
          className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        >
          + Create Notes
        </Link>
      </div>

      {isLoading && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <LoadingSpinner label="Loading notes..." />
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button
            type="button"
            onClick={fetchNotes}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && notes.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="rounded-xl border border-slate-200 bg-white p-10 shadow-md shadow-slate-900/5 max-w-md">
            <div className="mb-4 text-4xl">📝</div>
            <h2 className="text-lg font-semibold text-slate-900 mb-6">No notes yet</h2>
            <Link
              to="/notes/create"
              className="inline-block rounded-md bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              Create Notes
            </Link>
          </div>
        </div>
      )}

      {!isLoading && !error && notes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onDelete={handleNoteDeleted} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Dashboard
