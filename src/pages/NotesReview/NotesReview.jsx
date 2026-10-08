import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner'
import GenerationProgress from '../../components/GenerationProgress/GenerationProgress.jsx'
import { failedSectionIds, topicRegenerateState, topicStatusLabel } from '../../components/GenerationProgress/progressState'
import { getNote, generateNotes, regenerateFailedSections, regenerateSection } from '../../services/notesApi'
import { getErrorMessage } from '../../utils/errorMessage'
import { topicNumbers } from '../TocReview/tocPayload'

const NotesMarkdown = lazy(() => import('../../components/NotesMarkdown/NotesMarkdown'))

export default function NotesReview() {
  const { id } = useParams()
  const [note, setNote] = useState(null)
  const [error, setError] = useState(null)
  const [starting, setStarting] = useState(false)
  const [reload, setReload] = useState(0)
  const [pendingIds, setPendingIds] = useState(null)
  const [bulkPending, setBulkPending] = useState(false)
  const [sectionErrors, setSectionErrors] = useState({})

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
    if (pendingIds) return
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

  // Sends only the IDs whose persisted status is FAILED; completed topics are never resent.
  async function runRegeneration(sectionIds, request, bulk = false) {
    if (pendingIds || starting || sectionIds.length === 0) return
    setPendingIds(sectionIds)
    setBulkPending(bulk)
    setSectionErrors(errors => Object.fromEntries(
      Object.entries(errors).filter(([sectionId]) => !sectionIds.includes(sectionId))))
    try {
      const { data } = await request()
      setNote(data)
    } catch (err) {
      const message = getErrorMessage(err, 'Could not start regeneration. Please try again.')
      setSectionErrors(errors => ({
        ...errors,
        ...Object.fromEntries(sectionIds.map(sectionId => [sectionId, message])),
      }))
    } finally {
      setPendingIds(null)
      setBulkPending(false)
      // Resync either way: polls while topics generate, or refreshes after a 409.
      setReload(value => value + 1)
    }
  }

  function handleRegenerate(sectionId) {
    return runRegeneration([sectionId], () => regenerateSection(id, sectionId))
  }

  function handleRegenerateFailed() {
    const ids = failedSectionIds(note?.sections)
    return runRegeneration(ids, () => regenerateFailedSections(id, ids), true)
  }

  const running = ['GENERATING_NOTES', 'GENERATING_TOC'].includes(note?.status)
  const sections = note?.sections ?? []
  const numbers = topicNumbers(sections)
  const failedIds = failedSectionIds(sections)
  const requestInFlight = starting || pendingIds !== null

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
          {!running && note.status === 'FAILED' && failedIds.length > 0 && (
            <button type="button" onClick={handleRegenerateFailed} disabled={requestInFlight || Boolean(error)}
              aria-busy={bulkPending}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {bulkPending && <LoadingSpinner size="sm" />}
              {bulkPending ? 'Starting regeneration...' : `Regenerate All Failed Topics (${failedIds.length})`}
            </button>
          )}
          {!running && note.status !== 'FAILED' && (
            <button onClick={handleGenerate} disabled={requestInFlight || Boolean(error)}
              className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {starting ? 'Starting...' : note.status === 'COMPLETED' ? 'Regenerate Notes' : 'Generate Notes'}
            </button>
          )}
        </div>
      )}
      {note?.status === 'FAILED' && note.tocSaved && (
        <p role="alert" className="mt-4 text-sm text-red-700">Generation is incomplete. Completed topics are kept. Use Regenerate on a failed topic below, or regenerate all failed topics at once.</p>
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
            {sections.map((section, index) => {
              const failed = section.status === 'FAILED'
              const regen = topicRegenerateState(note, section, pendingIds)
              const sectionError = sectionErrors[section.sectionId]
              return (
                <section key={section.sectionId} id={`topic-${section.sectionId}`}
                  aria-busy={regen.busy}
                  className={`scroll-mt-6 rounded-xl border bg-white p-6 shadow-sm ${failed ? 'border-red-300' : 'border-slate-200'}`}>
                  <div role="heading" aria-level={section.level + 1}
                    className={section.level === 1 ? 'text-xl font-semibold text-slate-900' : 'text-lg font-semibold text-slate-800'}>
                    {numbers[index]} {section.title}
                  </div>
                  <p className={`mt-2 text-xs font-medium ${failed ? 'text-red-700' : 'text-slate-500'}`}>
                    {failed ? 'Generation failed' : topicStatusLabel(section.status)}
                  </p>
                  {section.content ? (
                    <div className="mt-4">
                      <Suspense fallback={<LoadingSpinner size="sm" label="Loading notes renderer..." />}>
                        <NotesMarkdown content={section.content} />
                      </Suspense>
                    </div>
                  ) : regen.busy ? (
                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                      <LoadingSpinner size="sm" />
                      <span>{pendingIds?.includes(section.sectionId) ? 'Starting regeneration...' : 'Generating this topic...'}</span>
                    </div>
                  ) : (
                    <p className={`mt-3 text-sm ${failed ? 'text-red-700' : 'text-slate-500'}`}>
                      {section.failureReason || (failed ? 'This topic could not be generated.' : 'Waiting for generation.')}
                    </p>
                  )}
                  {sectionError && (
                    <p role="alert" className="mt-2 text-sm text-red-700">{sectionError}</p>
                  )}
                  {regen.visible && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button type="button" onClick={() => handleRegenerate(section.sectionId)}
                        disabled={regen.disabled}
                        aria-label={`Regenerate topic ${numbers[index]} ${section.title}`}
                        className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                        {regen.busy && (
                          <span aria-hidden="true"
                            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-red-200 border-t-red-700" />
                        )}
                        {regen.busy ? 'Regenerating...' : 'Regenerate'}
                      </button>
                      {regen.blockedByOtherWork && (
                        <span className="text-xs text-slate-500">Available when the current generation finishes.</span>
                      )}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        </>
      )}
    </main>
  )
}
