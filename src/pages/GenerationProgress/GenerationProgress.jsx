import { useParams } from 'react-router-dom'

function GenerationProgress() {
  const { id } = useParams()
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Generating Notes</h1>
      <p className="mt-2 text-slate-600">
        Real, backend-driven generation progress for note{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5">{id}</code> will appear here.
        (Implemented in Phase 5.)
      </p>
    </div>
  )
}

export default GenerationProgress
