import { useParams, useLocation } from 'react-router-dom'

function NotesViewer() {
  const { id } = useParams()
  const isEdit = useLocation().pathname.endsWith('/edit')

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">
        {isEdit ? 'Edit Notes' : 'Notes Viewer'}
      </h1>
      <p className="mt-2 text-slate-600">
        The Markdown reader/editor for note{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">{id}</code> will appear here.
        (Implemented in Phase 7.)
      </p>
    </div>
  )
}

export default NotesViewer
