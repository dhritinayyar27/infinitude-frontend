export function generationProgress(sections = []) {
  const completed = sections.filter(section => section.status === 'COMPLETED').length
  const failed = sections.filter(section => section.status === 'FAILED').length
  const generating = sections.filter(section => section.status === 'GENERATING')
  const total = sections.length
  const processed = completed + failed
  return {
    total,
    completed,
    failed,
    generating,
    pending: total - processed - generating.length,
    processed,
    percent: total === 0 ? 0 : Math.floor(processed / total * 100),
  }
}

export function topicStatusLabel(status) {
  return {
    PENDING: 'Waiting',
    GENERATING: 'Generating',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
  }[status] ?? 'Waiting'
}

/** IDs of topics whose persisted status is FAILED, in TOC order. Nothing else is ever regenerated. */
export function failedSectionIds(sections = []) {
  return sections.filter(section => section?.status === 'FAILED').map(section => section.sectionId)
}

/**
 * Per-topic regenerate control state. Only FAILED topics offer Regenerate; it is disabled while
 * any request for this note is in flight or while the note is generating, because the backend
 * runs one generation job per note at a time. `pendingIds` lists the topic IDs of the in-flight
 * request (single or bulk), or is null/empty when idle.
 */
export function topicRegenerateState(note, section, pendingIds = null) {
  const pending = pendingIds ?? []
  const noteBusy = ['GENERATING_NOTES', 'GENERATING_TOC'].includes(note?.status)
  const requesting = pending.includes(section?.sectionId)
  const anyPending = pending.length > 0
  return {
    visible: section?.status === 'FAILED' || requesting,
    busy: requesting || section?.status === 'GENERATING',
    disabled: noteBusy || anyPending,
    blockedByOtherWork: !requesting && (noteBusy || anyPending),
  }
}
