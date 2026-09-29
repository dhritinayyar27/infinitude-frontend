import { useParams } from 'react-router-dom'

function TocReview() {
  const { id } = useParams()
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Review Table of Contents</h1>
      <p className="mt-2 text-slate-600">
        TOC editor for note <code className="rounded bg-slate-100 px-1.5 py-0.5">{id}</code> will
        appear here. (Implemented in Phase 4.)
      </p>
    </div>
  )
}

export default TocReview
