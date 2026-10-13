import { topicNumbers } from '../../pages/TocReview/tocPayload.js'

export const WORKSPACE_STATES = Object.freeze({
  TOC_ONLY: 'TOC_ONLY',
  READING: 'READING',
  LOADING: 'LOADING',
  ERROR: 'ERROR',
})

export const TOPIC_PARAM = 'topic'

/** Nests the flat, ordered section list by level. Nodes are keyed by stable sectionId. */
export function buildTocTree(sections = []) {
  const numbers = topicNumbers(sections)
  const roots = []
  const nodes = []
  const stack = []
  sections.forEach((section, index) => {
    const level = section.level ?? 1
    while (stack.length > 0 && stack[stack.length - 1].level >= level) stack.pop()
    const parent = stack[stack.length - 1] ?? null
    const node = {
      id: section.sectionId,
      title: section.title,
      level,
      number: numbers[index],
      index,
      section,
      parentId: parent?.id ?? null,
      children: [],
    }
    ;(parent ? parent.children : roots).push(node)
    stack.push(node)
    nodes.push(node)
  })
  return { roots, nodes, byId: new Map(nodes.map(node => [node.id, node])) }
}

/** The topic followed by all of its descendants, in reading order. */
export function topicWithDescendants(tree, id) {
  const start = tree.byId.get(id)
  if (!start) return []
  const result = []
  const walk = node => {
    result.push(node)
    node.children.forEach(walk)
  }
  walk(start)
  return result
}

export function ancestorIds(tree, id) {
  const result = []
  let node = tree.byId.get(id)
  while (node?.parentId) {
    result.push(node.parentId)
    node = tree.byId.get(node.parentId)
  }
  return result
}

/** Null when no filter is active; otherwise the matching topic IDs plus their ancestors. */
export function matchingTopicIds(tree, query) {
  const needle = (query ?? '').trim().toLowerCase()
  if (!needle) return null
  const visible = new Set()
  for (const node of tree.nodes) {
    if (`${node.number} ${node.title ?? ''}`.toLowerCase().includes(needle)) {
      visible.add(node.id)
      ancestorIds(tree, node.id).forEach(id => visible.add(id))
    }
  }
  return visible
}

/** Children to render under a node. An active filter overrides manual collapse. */
export function visibleChildren(node, { collapsed, matches }) {
  if (matches) return node.children.filter(child => matches.has(child.id))
  return collapsed.has(node.id) ? [] : node.children
}

/** Heading level for a topic inside the reading panel; the selected topic is an h2 under the page title. */
export function readingHeadingLevel(selectedLevel, nodeLevel) {
  return Math.min(6, Math.max(2, 2 + (nodeLevel - selectedLevel)))
}

/**
 * Derives the explicit workspace state. TOC_ONLY is the default for any document opened
 * without a selected topic, even when every topic has already been generated.
 */
export function deriveWorkspaceState({ selectedId = null, tree, loading = false, error = null }) {
  const loaded = tree.nodes.length > 0
  if (!loaded && selectedId) {
    if (error) return { state: WORKSPACE_STATES.ERROR, reason: 'load' }
    if (loading) return { state: WORKSPACE_STATES.LOADING, reason: null }
  }
  if (!selectedId) return { state: WORKSPACE_STATES.TOC_ONLY, reason: null }
  if (!tree.byId.has(selectedId)) return { state: WORKSPACE_STATES.ERROR, reason: 'not-found' }
  return { state: WORKSPACE_STATES.READING, reason: null }
}

export function readTopicParam(searchParams) {
  const value = searchParams.get(TOPIC_PARAM)
  return value && value.trim() ? value : null
}

export function withTopic(searchParams, id) {
  const next = new URLSearchParams(searchParams)
  next.set(TOPIC_PARAM, id)
  return next
}

export function withoutTopic(searchParams) {
  const next = new URLSearchParams(searchParams)
  next.delete(TOPIC_PARAM)
  return next
}
