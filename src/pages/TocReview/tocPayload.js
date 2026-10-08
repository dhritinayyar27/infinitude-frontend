export function buildSectionsPayload(sections) {
  return sections.map((section, index) => ({
    sectionId: section.id.startsWith('new-') ? null : section.id,
    title: section.title,
    order: index + 1,
    level: section.level ?? 1,
  }))
}

export function topicNumbers(sections) {
  const counters = []
  return sections.map((section) => {
    const level = section.level ?? 1
    counters.length = level
    counters[level - 1] = (counters[level - 1] ?? 0) + 1
    return counters.join('.')
  })
}

export function validateHierarchy(sections) {
  let previous = 0
  for (const section of sections) {
    const level = section.level ?? 1
    if (level < 1 || level > 5 || level > previous + 1) {
      return 'Start with a top-level topic and do not skip hierarchy levels.'
    }
    previous = level
  }
  return null
}

export function isTocDirty(sections, savedSections) {
  return JSON.stringify(sections.map(s => [s.title, s.level ?? 1])) !==
    JSON.stringify(savedSections.map(s => [s.title, s.level ?? 1]))
}
