import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner'
import GenerationProgress from '../../components/GenerationProgress/GenerationProgress.jsx'
import { topicStatusLabel } from '../../components/GenerationProgress/progressState'
import { getNote, generateNotes } from '../../services/notesApi'
import { topicNumbers } from '../TocReview/tocPayload'

const NotesMarkdown = lazy(() => import('../../components/NotesMarkdown/NotesMarkdown'))

export default function NotesReview() {
  const { id } = useParams()
  const [note, setNote] = useState(null)
  const [error, setError] = useState(null)
  const [starting, setStarting] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    let timer
    async function load() {
      try {
        const { data } = await getNote(id)
        if (!active) return
        setNote(data)
        setError(null)
        if (['GENERATING_NOTES', 'GENERATING_TOC'].includes(data.status)) {
          timer = setTimeout(load, 2000)
        }
      } catch (err) {
        if (active) setError(err?.response?.data?.message || 'Failed to load notes. Please retry.')
      }
    }
    load()
    return () => { active = false; clearTimeout(timer) }
  }, [id, reload])

  async function handleGenerate() {
    if (note.status === 'COMPLETED' && !window.confirm('Regenerate all notes from the saved TOC? This replaces the current content.')) return
    setStarting(true)
    setError(null)
    try {
      const { data } = await generateNotes(id)
      setNote(data)
      setReload(value => value + 1)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to start generation.')
    } finally {
      setStarting(false)
    }
  }

  const running = ['GENERATING_NOTES', 'GENERATING_TOC'].includes(note?.status)
  const sections = note?.sections ?? []
  const numbers = topicNumbers(sections)

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link to={`/notes/${id}/toc`} className="text-sm text-blue-700 hover:underline">Review / Edit TOC</Link>
      <h1 className="mt-5 text-2xl font-semibold text-slate-900">{note?.title || 'Generated Notes'}</h1>
      <p className="mt-2 text-sm text-slate-500">Notes follow the saved TOC. Every topic is shown below, including any failed topics.</p>
      {error && (
        <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button onClick={() => setReload(value => value + 1)} className="ml-3 underline">Retry loading</button>
        </div>
      )}
      {!note && !error && <LoadingSpinner label="Loading notes..." />}
      {note && !note.tocSaved && <p className="mt-5 text-sm text-amber-700">Save your TOC before generating notes.</p>}
      {note?.tocSaved && (
        <div className="mt-6">
          <GenerationProgress note={note} starting={starting} />
          {!running && (
            <button onClick={handleGenerate} disabled={starting || Boolean(error)}
              className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {starting ? 'Starting...' : note.status === 'COMPLETED' ? 'Regenerate Notes' :
                note.status === 'FAILED' ? 'Retry Notes Generation' : 'Generate Notes'}
            </button>
          )}
        </div>
      )}
      {note?.status === 'FAILED' && note.tocSaved && (
        <p role="alert" className="mt-4 text-sm text-red-700">Generation is incomplete. Review the failed topics below and retry to generate the complete notes.</p>
      )}
      {note?.tocSaved && (
        <>
          <nav aria-label="Saved table of contents" className="my-6 rounded-xl border border-slate-200 bg-white p-5">
            {sections.map((section, index) => (
              <a key={section.sectionId} href={`#topic-${section.sectionId}`}
                style={{ paddingLeft: `${(section.level - 1) * 16}px` }}
                className="flex flex-wrap justify-between gap-2 py-1 text-sm text-blue-700 hover:underline">
                <span>{numbers[index]} {section.title}</span>
                <span className={`text-xs ${section.status === 'FAILED' ? 'text-red-700' : 'text-slate-500'}`}>
                  {topicStatusLabel(section.status)}
                </span>
              </a>
            ))}
          </nav>
          <div className="space-y-6">
            {sections.map((section, index) => (
              <section key={section.sectionId} id={`topic-${section.sectionId}`}
                className="scroll-mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div role="heading" aria-level={section.level + 1}
                  className={section.level === 1 ? 'text-xl font-semibold text-slate-900' : 'text-lg font-semibold text-slate-800'}>
                  {numbers[index]} {section.title}
                </div>
                <p className={`mt-2 text-xs font-medium ${section.status === 'FAILED' ? 'text-red-700' : 'text-slate-500'}`}>
                  {topicStatusLabel(section.status)}
                </p>
                {section.content ? (
                  <div className="mt-4">
                    <Suspense fallback={<LoadingSpinner size="sm" label="Loading notes renderer..." />}>
                      <NotesMarkdown content={section.content} />
                    </Suspense>
                  </div>
                ) : (
                  <p className={`mt-3 text-sm ${section.status === 'FAILED' ? 'text-red-700' : 'text-slate-500'}`}>
                    {section.failureReason || (section.status === 'GENERATING' ? 'Generating this topic...' : 'Waiting for generation.')}
                  </p>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
