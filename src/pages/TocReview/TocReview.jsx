import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import LoadingSpinner from '../../components/LoadingSpinner'
import { getNote, generateToc, updateToc } from '../../services/notesApi'

function TocReview() {
  const { id: noteId } = useParams()

  const [note, setNote] = useState(null)
  const [sections, setSections] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPolling, setIsPolling] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const pollingRef = useRef(null)

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  async function loadNote() {
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
        }))
      )
      return n
    } catch {
      setError('Failed to load note.')
      return null
    }
  }

  function startPolling() {
    setIsPolling(true)
    pollingRef.current = setInterval(async () => {
      const n = await loadNote()
      if (!n) {
        stopPolling()
        setIsPolling(false)
        return
      }
      if (n.status === 'TOC_READY' || n.status === 'FAILED' || n.status === 'COMPLETED') {
        stopPolling()
        setIsPolling(false)
      }
    }, 2000)
  }

  useEffect(() => {
    async function init() {
      setIsLoading(true)
      const n = await loadNote()
      setIsLoading(false)
      if (n && n.status === 'GENERATING_TOC') {
        startPolling()
      }
    }
    init()
    return () => stopPolling()
  }, [noteId])

  function handleDragEnd(result) {
    if (!result.destination) return
    const reordered = Array.from(sections)
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)
    setSections(reordered.map((s, i) => ({ ...s, order: i })))
  }

  function startEdit(section) {
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

  function deleteSection(sectionId) {
    setSections((prev) => prev.filter((s) => s.id !== sectionId))
  }

  function addSection() {
    const newSection = {
      id: `new-${Date.now()}`,
      title: '',
      order: sections.length,
    }
    setSections((prev) => [...prev, newSection])
    setEditingId(newSection.id)
    setEditingValue('')
  }

  function buildSectionsPayload() {
    return sections.map((section) => ({
      sectionId: section.id.startsWith('new-') ? null : section.id,
      title: section.title,
    }))
  }

  function validate() {
    if (sections.length === 0) return 'Add at least one section.'
    const blanks = sections.filter((s) => !s.title.trim())
    if (blanks.length > 0) return 'All section titles must be non-blank.'
    return null
  }

  async function handleSave() {
    const err = validate()
    if (err) { setError(err); return }
    setIsSaving(true)
    setError(null)
    try {
      await updateToc(noteId, buildSectionsPayload())
      await loadNote()
      toast.success('Table of contents saved.')
    } catch {
      setError('Failed to save TOC. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRegenerate() {
    if (!window.confirm('Regenerate the TOC? This will replace the current sections.')) return
    setIsRegenerating(true)
    setError(null)
    try {
      await generateToc(noteId)
      const n = await loadNote()
      if (n && n.status === 'GENERATING_TOC') {
        setIsPolling(true)
        startPolling()
      }
    } catch {
      setError('Failed to regenerate TOC.')
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

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        ← Back to Dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-4 mb-2">
        <div className="min-w-0 flex-1 basis-64">
          <h1 className="text-2xl font-semibold text-slate-900">Review Table of Contents</h1>
          <p className="mt-1 text-sm text-slate-500 break-words">{title}</p>
        </div>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={isRegenerating || isPolling || isSaving}
          className="shrink-0 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRegenerating ? 'Regenerating…' : 'Regenerate TOC'}
        </button>
      </div>

      {isPolling && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 mb-6 flex items-center gap-3">
          <LoadingSpinner size="sm" />
          <p className="text-sm text-blue-700">Generating your Table of Contents… please wait.</p>
        </div>
      )}

      {!isPolling && note?.status === 'FAILED' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 mb-6">
          <p className="text-sm text-red-700">TOC generation failed. Try regenerating.</p>
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
          <button
            type="button"
            onClick={addSection}
            className="text-sm font-medium text-slate-700 hover:text-slate-900 focus-visible:outline-none"
          >
            + Add section
          </button>
        </div>

        {sections.length === 0 && !isPolling && (
          <div className="px-6 py-8 text-center text-sm text-slate-400">
            No sections yet. Add one using the button above.
          </div>
        )}

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="toc-list">
            {(provided) => (
              <ul ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-slate-100">
                {sections.map((section, index) => (
                  <Draggable key={section.id} draggableId={section.id} index={index}>
                    {(drag, snapshot) => (
                      <li
                        ref={drag.innerRef}
                        {...drag.draggableProps}
                        className={`flex items-center gap-3 px-4 py-3 ${snapshot.isDragging ? 'bg-slate-50 shadow-md' : ''}`}
                      >
                        {/* Drag handle */}
                        <span
                          {...drag.dragHandleProps}
                          className="cursor-grab text-slate-300 hover:text-slate-500 shrink-0 select-none"
                          title="Drag to reorder"
                        >
                          ⠿
                        </span>
                        {/* Order number */}
                        <span className="w-6 shrink-0 text-center text-xs font-mono text-slate-400">
                          {index + 1}
                        </span>
                        {/* Title */}
                        {editingId === section.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit(section.id)
                              if (e.key === 'Escape') cancelEdit()
                            }}
                            onBlur={() => commitEdit(section.id)}
                            className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(section)}
                            className="min-w-0 flex-1 break-words text-left text-sm text-slate-900 hover:text-slate-700 focus-visible:outline-none"
                            title="Click to edit"
                          >
                            {section.title || <span className="text-slate-400 italic">Untitled section</span>}
                          </button>
                        )}
                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => deleteSection(section.id)}
                          className="shrink-0 rounded p-1 text-slate-400 hover:text-red-600 focus-visible:outline-none"
                          title="Remove section"
                        >
                          ✕
                        </button>
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

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isRegenerating || isPolling || sections.length === 0 || editingId !== null}
          className="rounded-md bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save TOC'}
        </button>
      </div>
    </div>
  )
}

export default TocReview
