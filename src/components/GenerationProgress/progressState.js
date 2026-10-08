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
