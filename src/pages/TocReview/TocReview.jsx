import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import LoadingSpinner from '../../components/LoadingSpinner'
import GenerationProgress from '../../components/GenerationProgress/GenerationProgress.jsx'
import { getNote, generateToc, updateToc, generateNotes } from '../../services/notesApi'
import { buildSectionsPayload, topicNumbers, validateHierarchy, isTocDirty } from './tocPayload'

function TocReview() {
  const { id: noteId } = useParams()
  const navigate = useNavigate()

  const [note, setNote] = useState(null)
  const [sections, setSections] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPolling, setIsPolling] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editingValue, setEditingValue] = useState('')
  const pollingRef = useRef(null)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const loadNote = useCallback(async () => {
    try {
      const res = await getNote(noteId)
      const n = res.data
      setNote(n)
      const rawSections = n.sections ?? n.toc?.sections ?? []
      setSections(
        rawSections.map((s, i) => ({
          id: s.id ?? s.sectionId ?? `section-${i}`,
          title: s.title ?? s.heading ?? '',
          order: s.order ?? i,
          level: s.level ?? 1,
        }))
      )
      return n
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load note.')
      return null
    }
  }, [noteId])

  const startPolling = useCallback(() => {
    stopPolling()
    setIsPolling(true)
    async function poll() {
      const n = await loadNote()
      if (pollingRef.current === null) return
      if (!n) {
        stopPolling()
        setIsPolling(false)
        return
      }
      if (!['GENERATING_TOC', 'GENERATING_NOTES'].includes(n.status)) {
        stopPolling()
        setIsPolling(false)
      } else {
        pollingRef.current = setTimeout(poll, 2000)
      }
    }
    pollingRef.current = setTimeout(poll, 2000)
  }, [loadNote, stopPolling])

  useEffect(() => {
    let active = true
    async function init() {
      setIsLoading(true)
      const n = await loadNote()
      if (!active) return
      setIsLoading(false)
      if (n && ['GENERATING_TOC', 'GENERATING_NOTES'].includes(n.status)) {
        startPolling()
      }
    }
    init()
    return () => { active = false; stopPolling() }
  }, [loadNote, startPolling, stopPolling])

  function handleDragEnd(result) {
    if (!isEditing) return
    if (!result.destination) return
    const source = result.source.index
    const destination = result.destination.index
    if (source === destination) return
    const level = sections[source].level
    if (sections[destination].level !== level) {
      toast.error('Reorder topics at the same level. Use the level selector to change hierarchy.')
      return
    }
    let end = source + 1
    while (end < sections.length && sections[end].level > level) end++
    let targetEnd = destination + 1
    while (targetEnd < sections.length && sections[targetEnd].level > level) targetEnd++
    const reordered = Array.from(sections)
    const moved = reordered.splice(source, end - source)
    const insertion = destination > source ? targetEnd - moved.length : destination
    reordered.splice(insertion, 0, ...moved)
    setSections(reordered.map((s, i) => ({ ...s, order: i })))
  }

  function startEdit(section) {
    if (!isEditing) return
    setEditingId(section.id)
    setEditingValue(section.title)
  }

  function commitEdit(sectionId) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title: editingValue.trim() } : s))
    )
    setEditingId(null)
    setEditingValue('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingValue('')
  }

  function cancelTocEdit() {
    if (isTocDirty(sections, note?.sections ?? []) &&
        !window.confirm('Discard your unsaved TOC changes?')) return
    setSections((note?.sections ?? []).map((section, index) => ({
      id: section.sectionId,
      title: section.title,
      order: index + 1,
      level: section.level ?? 1,
    })))
    cancelEdit()
    setIsEditing(false)
    setError(null)
  }

  function deleteSection(sectionId) {
    const start = sections.findIndex(section => section.id === sectionId)
    let end = start + 1
    while (end < sections.length && sections[end].level > sections[start].level) end++
    if (end > start + 1 && !window.confirm('Remove this topic and all its subtopics?')) return
    setSections(prev => prev.filter((_, index) => index < start || index >= end))
  }

  function addSection() {
    const newSection = {
      id: `new-${Date.now()}`,
      title: '',
      order: sections.length,
      level: 1,
    }
    setSections((prev) => [...prev, newSection])
    setEditingId(newSection.id)
    setEditingValue('')
  }

  function validate() {
    if (sections.length === 0) return 'Add at least one section.'
    const blanks = sections.filter((s) => !s.title.trim())
    if (blanks.length > 0) return 'All section titles must be non-blank.'
    return validateHierarchy(sections)
  }

  async function handleSave() {
    const err = validate()
    if (err) { setError(err); return }
    setIsSaving(true)
    setError(null)
    try {
      if (note?.markdownContent && !window.confirm('Saving this TOC clears the existing notes. You can generate them again from the saved outline.')) return
      const { data } = await updateToc(noteId, buildSectionsPayload(sections))
      if (data.tocSaved !== true) {
        throw new Error('The backend did not confirm a saved TOC. Restart the backend with the latest notes-generation code, reload this page, and save again.')
      }
      setNote(data)
      setSections(data.sections.map((section, index) => ({
        id: section.sectionId, title: section.title, order: index + 1, level: section.level ?? 1,
      })))
      setIsEditing(false)
      cancelEdit()
      toast.success('Table of contents saved.')
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to save TOC. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleGenerateNotes() {
    setIsGeneratingNotes(true)
    setError(null)
    try {
      await generateNotes(noteId)
      navigate(`/notes/${noteId}`)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to start notes generation.')
    } finally {
      setIsGeneratingNotes(false)
    }
  }

  async function handleRegenerate() {
    if (!window.confirm('Regenerate the TOC? This replaces the outline and clears generated notes.')) return
    setIsRegenerating(true)
    setIsEditing(false)
    cancelEdit()
    setError(null)
    try {
      await generateToc(noteId)
      const n = await loadNote()
      if (n && n.status === 'GENERATING_TOC') {
        setIsPolling(true)
        startPolling()
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to regenerate TOC.')
    } finally {
      setIsRegenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner label="Loading Table of Contents…" />
      </div>
    )
  }

  if (error && !note) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm text-red-600">{error}</p>
        <Link to="/dashboard" className="mt-4 inline-block text-sm text-slate-500 hover:text-slate-900">
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  const title = note?.title ?? note?.topic ?? 'Note'
  const dirty = isTocDirty(sections, note?.sections ?? [])
  const busy = isSaving || isRegenerating || isPolling || isGeneratingNotes ||
    ['GENERATING_TOC', 'GENERATING_NOTES'].includes(note?.status)
  const numbers = topicNumbers(sections)

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        ← Back to Dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-4 mb-2">
        <div className="min-w-0 flex-1 basis-64">
          <h1 className="text-2xl font-semibold text-slate-900">Review Table of Contents</h1>
          <p className="mt-1 text-sm text-slate-500 break-words">{title}</p>
          <p className="mt-2 text-xs font-medium text-slate-600">
            Difficulty: {note?.difficulty} - applies to the TOC and every notes topic.
          </p>
        </div>
        {isEditing && <button
          type="button"
          onClick={handleRegenerate}
          disabled={busy}
          className="shrink-0 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRegenerating ? 'Regenerating…' : 'Regenerate TOC'}
        </button>}
      </div>

      <section aria-label="Notes workflow actions" className="my-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
        <p className="text-sm font-semibold text-slate-900">
          {note?.tocSaved ? 'TOC saved - generate your notes next' : 'Next: Save TOC, then Generate Notes'}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {(isEditing || !note?.tocSaved) && (
            <button type="button" onClick={handleSave}
              disabled={busy || sections.length === 0 || editingId !== null || (note?.tocSaved && !dirty)}
              className="rounded-md bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save TOC'}
            </button>
          )}
          <button type="button" onClick={handleGenerateNotes}
            disabled={!note?.tocSaved || busy || isEditing || dirty || editingId !== null}
            aria-describedby="notes-generation-help"
            className="rounded-md bg-blue-700 px-5 py-2.5 font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
            {isGeneratingNotes ? 'Starting generation...' : note?.markdownContent ? 'Regenerate Notes' : 'Generate Notes'}
          </button>
          {note?.tocSaved && (
            <Link to={`/notes/${noteId}`} className="text-sm font-medium text-blue-700 hover:underline">Review Notes</Link>
          )}
        </div>
        <p id="notes-generation-help" className="mt-3 text-sm text-slate-600">
          {isEditing ? 'Save or cancel editing before generating notes.' :
            dirty ? 'Save your TOC changes to enable notes generation.' :
              note?.tocSaved ? 'Notes will use every topic from this saved TOC.' :
                'Your TOC is generated. Click Save TOC to approve it and enable Generate Notes. Editing is optional.'}
        </p>
      </section>

      {note?.status === 'GENERATING_NOTES' && (
        <div className="my-6">
          <GenerationProgress note={note} />
          <Link to={`/notes/${noteId}`} className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline">
            Follow generation and read notes
          </Link>
        </div>
      )}

      {(isPolling || isRegenerating) && note?.status !== 'GENERATING_NOTES' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 mb-6 flex items-center gap-3">
          <LoadingSpinner size="sm" />
          <p className="text-sm text-blue-700">
            Generating your Table of Contents... please wait.
          </p>
        </div>
      )}

      {!isPolling && note?.status === 'FAILED' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 mb-6">
          <p className="text-sm text-red-700">
            {note.tocSaved ? 'Notes generation failed for one or more topics. Open notes to review progress or retry.' : 'TOC generation failed. Click Edit, then Regenerate TOC to retry.'}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-md shadow-slate-900/5">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <span className="text-sm font-medium text-slate-600">
            {sections.length} section{sections.length !== 1 ? 's' : ''}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            {isEditing ? (
              <>
                <button type="button" onClick={addSection} disabled={busy || sections.length >= 100}
                  className="text-sm font-medium text-slate-700 hover:text-slate-900 disabled:opacity-50">
                  + Add section
                </button>
                <button type="button" onClick={cancelTocEdit} disabled={busy}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50">
                  Cancel Editing
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setIsEditing(true)} disabled={busy}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50">
                Edit
              </button>
            )}
          </div>
        </div>

        {sections.length === 0 && !isPolling && (
          <div className="px-6 py-8 text-center text-sm text-slate-400">
            {isEditing ? 'No sections yet. Add one using the button above.' : 'No sections yet. Generate a TOC or click Edit to add topics.'}
          </div>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="toc-list">
            {(provided) => (
              <ul ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-slate-100">
                {sections.map((section, index) => (
                  <Draggable key={section.id} draggableId={section.id} index={index} isDragDisabled={!isEditing || busy || editingId !== null}>
                    {(drag, snapshot) => (
                      <li
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className={`flex items-center gap-3 px-4 py-3 ${snapshot.isDragging ? 'bg-slate-50 shadow-md' : ''}`}
                      >
                        {isEditing && <span
                          {...drag.dragHandleProps}
                          className="cursor-grab text-slate-300 hover:text-slate-500 shrink-0 select-none"
                          title="Drag to reorder"
                        >
                          ⠿
                        </span>}
                        {/* Order number */}
                        <span className="min-w-6 shrink-0 text-center text-xs font-mono text-slate-400">
                          {numbers[index]}
                        </span>
                        {isEditing && <select
                          aria-label={`Hierarchy level for ${section.title || 'untitled topic'}`}
                          value={section.level}
                          disabled={busy}
                          onChange={(event) => setSections(prev => prev.map(s =>
                            s.id === section.id ? { ...s, level: Number(event.target.value) } : s))}
                          className="max-w-24 rounded border border-slate-200 bg-white text-xs"
                        >
                          {[1, 2, 3, 4, 5].map(level => <option key={level} value={level}>Heading {level}</option>)}
                        </select>}
                        {/* Title */}
                        {!isEditing ? (
                          <span style={{ paddingLeft: `${(section.level - 1) * 12}px` }}
                            className="min-w-0 flex-1 break-words text-sm text-slate-900">
                            {section.title}
                          </span>
                        ) : editingId === section.id ? (
                          <input
                            autoFocus
                            type="text"
                            maxLength={300}
                            aria-label={`Title for topic ${numbers[index]}`}
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit(section.id)
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            onBlur={() => commitEdit(section.id)}
                            className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(section)}
                            disabled={busy}
                            style={{ paddingLeft: `${(section.level - 1) * 12}px` }}
                            className="min-w-0 flex-1 break-words text-left text-sm text-slate-900 hover:text-slate-700 focus-visible:outline-none"
                            title="Click to edit"
                          >
                            {section.title || <span className="text-slate-400 italic">Untitled section</span>}
                          </button>
                        )}
                        {/* Delete */}
                        {isEditing && <button
                          type="button"
                          onClick={() => deleteSection(section.id)}
                          disabled={busy}
                          className="shrink-0 rounded p-1 text-slate-400 hover:text-red-600 focus-visible:outline-none"
                          title="Remove section"
                          aria-label={`Remove ${section.title || 'untitled topic'}`}
                        >
                          ✕
                        </button>}
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <p className="mt-3 text-sm text-slate-500">
        {isEditing ? 'Edit topic titles and heading levels, then save or cancel editing before generating notes. Heading levels control structure, not difficulty.' :
          dirty ? 'You have unsaved changes. Save the TOC before generating notes.' :
          note?.tocSaved ? 'Notes will use this saved TOC, including every topic and hierarchy level.' :
            'Review the outline and save the TOC to enable notes generation.'}
      </p>
    </div>
  )
}

export default TocReview
