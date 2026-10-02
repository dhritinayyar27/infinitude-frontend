import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner'
import { createNote, generateToc } from '../../services/notesApi'

const DIFFICULTY_OPTIONS = [
  { value: 'BEGINNER', label: 'Beginner', desc: 'Beginner: simple language, foundational concepts, no prior knowledge assumed.' },
  { value: 'INTERMEDIATE', label: 'Intermediate', desc: 'Intermediate: balanced depth, assumes basic familiarity with the topic.' },
  { value: 'ADVANCED', label: 'Advanced', desc: 'Advanced: in-depth coverage, technical details, assumes strong background knowledge.' },
]

function CreateNotes() {
  const navigate = useNavigate()

  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('INTERMEDIATE')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const selectedDiff = DIFFICULTY_OPTIONS.find((o) => o.value === difficulty)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!topic.trim()) return
    setIsSubmitting(true)
    setError(null)

    try {
      const createRes = await createNote(topic.trim(), difficulty)
      const noteId = createRes.data?.id ?? createRes.data?.noteId
      if (!noteId) throw new Error('No note ID returned from server.')

      await generateToc(noteId)
      navigate(`/notes/${noteId}/toc`)
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to generate table of contents. Please try again.'
      setError(message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        to="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 focus-visible:outline-none"
      >
        ← Back to Dashboard
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-md shadow-slate-900/5 mt-4">
        <h1 className="text-2xl font-semibold text-slate-900 mb-8">Create Table of Contents</h1>

        <form onSubmit={handleSubmit} className="space-y-7">
          {/* Topic */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="topic" className="block text-sm font-medium text-slate-700">
                Topic <span className="text-red-500">*</span>
              </label>
              <span className={`text-xs ${topic.length > 180 ? 'text-red-500' : 'text-slate-400'}`}>
                {topic.length} / 200
              </span>
            </div>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, 200))}
              placeholder="e.g. Machine Learning, React Hooks, Photosynthesis…"
              required
              disabled={isSubmitting}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>

          {/* Difficulty */}
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-slate-700 mb-1.5">
              Difficulty Level
            </label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              {DIFFICULTY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {selectedDiff && (
              <p className="mt-1.5 text-xs text-slate-500">{selectedDiff.desc}</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 rounded-md border border-red-200 bg-red-50 px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !topic.trim()}
            className="w-full rounded-md bg-slate-900 px-4 py-2.5 font-medium text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" tone="light" />
                <span>Generating Table of Contents…</span>
              </>
            ) : (
              'Generate Table of Contents'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateNotes
