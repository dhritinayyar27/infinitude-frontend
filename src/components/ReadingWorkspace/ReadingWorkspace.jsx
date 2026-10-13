import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import LoadingSpinner from '../LoadingSpinner'
import {
  WORKSPACE_STATES,
  ancestorIds,
  buildTocTree,
  deriveWorkspaceState,
  matchingTopicIds,
  readingHeadingLevel,
  topicWithDescendants,
  visibleChildren,
} from './workspaceModel.js'

const NotesMarkdown = lazy(() => import('../NotesMarkdown/NotesMarkdown'))

const FILTER_THRESHOLD = 8
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500'

function Chevron({ open }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor"
      className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? 'rotate-90' : ''}`}>
      <path fillRule="evenodd" clipRule="evenodd"
        d="M7.2 4.8a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06L11.17 9.83 7.2 5.86a.75.75 0 0 1 0-1.06Z" />
    </svg>
  )
}

function TocBranch({ nodes, ctx, depth = 0 }) {
  const { activeId, activeAncestors, collapsed, matches, activeRef, onToggle, onSelect } = ctx
  return (
    <ul className={depth > 0 ? 'ml-3 border-l border-slate-200 pl-1' : ''}>
      {nodes.map(node => {
        const children = visibleChildren(node, ctx)
        const hasChildren = node.children.length > 0
        const expanded = hasChildren && (matches ? children.length > 0 : !collapsed.has(node.id))
        const active = node.id === activeId
        const containsActive = !expanded && activeAncestors.has(node.id)
        return (
          <li key={node.id}>
            <div className="flex items-start gap-0.5">
              {hasChildren ? (
                <button type="button" onClick={() => onToggle(node.id)}
                  disabled={Boolean(matches)}
                  aria-expanded={expanded}
                  aria-controls={expanded ? `toc-branch-${node.id}` : undefined}
                  aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.number} ${node.title}`}
                  data-testid={`toc-toggle-${node.id}`}
                  className={`mt-0.5 flex h-7 w-6 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent ${FOCUS_RING}`}>
                  <Chevron open={expanded} />
                </button>
              ) : (
                <span className="w-6 shrink-0" aria-hidden="true" />
              )}
              <button type="button" onClick={() => onSelect(node.id)}
                ref={active ? activeRef : undefined}
                aria-current={active ? 'true' : undefined}
                data-testid={`toc-item-${node.id}`}
                className={`min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-sm leading-snug transition-colors motion-reduce:transition-none ${FOCUS_RING} ${
                  active ? 'bg-blue-50 font-medium text-blue-800'
                    : containsActive ? 'font-medium text-blue-800 hover:bg-slate-100'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`}>
                <span className="tabular-nums text-slate-400">{node.number}</span>{' '}
                <span className="break-words">{node.title}</span>
              </button>
            </div>
            {expanded && children.length > 0 && (
              <div id={`toc-branch-${node.id}`}>
                <TocBranch nodes={children} ctx={ctx} depth={depth + 1} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function TopicContent({ node, headingLevel, primary }) {
  const Heading = `h${headingLevel}`
  const missing = !node.section.content
  return (
    <article id={`reading-topic-${node.id}`} data-testid={`reading-topic-${node.id}`}
      className={primary ? '' : 'mt-10 scroll-mt-4 border-t border-slate-100 pt-8'}>
      <Heading id={primary ? 'reading-heading' : undefined}
        className={primary ? 'text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl'
          : headingLevel === 3 ? 'text-xl font-semibold text-slate-900' : 'text-lg font-semibold text-slate-800'}>
        <span className="tabular-nums text-slate-400">{node.number}</span>{' '}
        {node.title}
      </Heading>
      <div className="mt-4">
        {missing ? (
          <p className="text-sm text-slate-500">{node.section.failureReason || 'No notes are available for this topic.'}</p>
        ) : (
          <Suspense fallback={<LoadingSpinner size="sm" label="Loading notes renderer..." />}>
            <NotesMarkdown content={node.section.content} />
          </Suspense>
        )}
      </div>
    </article>
  )
}

function StatusCard({ state, children }) {
  return (
    <div data-testid="reading-workspace" data-state={state} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      {children}
    </div>
  )
}

/**
 * TOC-first reading workspace. Shows only the table of contents until a topic is selected,
 * then a 30:70 TOC/notes split (drawer TOC below the lg breakpoint). Selection lives in the
 * parent (URL); all content comes from the already-loaded sections, so switching never refetches.
 */
export default function ReadingWorkspace({
  sections = [],
  selectedId = null,
  onSelect,
  onShowToc,
  loading = false,
  error = null,
  onRetry,
}) {
  const tree = useMemo(() => buildTocTree(sections), [sections])
  const { state, reason } = deriveWorkspaceState({ selectedId, tree, loading, error })
  const reading = state === WORKSPACE_STATES.READING

  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [drawerOpen, setDrawerOpen] = useState(false)

  const panelRef = useRef(null)
  const asideRef = useRef(null)
  const activeRef = useRef(null)
  const triggerRef = useRef(null)
  const positions = useRef(new Map())
  const lastScrollY = useRef(0)
  const previousId = useRef(null)

  const matches = useMemo(() => matchingTopicIds(tree, query), [tree, query])
  const selectedNode = reading ? tree.byId.get(selectedId) : null
  const topics = useMemo(() => (reading ? topicWithDescendants(tree, selectedId) : []), [reading, tree, selectedId])
  const activeAncestors = useMemo(() => new Set(reading ? ancestorIds(tree, selectedId) : []), [reading, tree, selectedId])

  useEffect(() => {
    const onScroll = () => { lastScrollY.current = window.scrollY }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Remembers where each topic was left, restores it on return, and otherwise brings the new topic into view.
  useLayoutEffect(() => {
    if (previousId.current) positions.current.set(previousId.current, lastScrollY.current)
    previousId.current = reading ? selectedId : null
    if (!reading) return
    const saved = positions.current.get(selectedId)
    if (saved !== undefined) {
      window.scrollTo({ top: saved, behavior: 'auto' })
    } else if (panelRef.current && panelRef.current.getBoundingClientRect().top < 0) {
      const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      panelRef.current.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' })
    }
    // Scroll only the TOC pane; scrollIntoView would also move the window.
    const pane = asideRef.current
    const item = activeRef.current
    if (pane && item && pane.scrollHeight > pane.clientHeight) {
      const paneBox = pane.getBoundingClientRect()
      const itemBox = item.getBoundingClientRect()
      if (itemBox.top < paneBox.top) pane.scrollTop += itemBox.top - paneBox.top - 8
      else if (itemBox.bottom > paneBox.bottom) pane.scrollTop += itemBox.bottom - paneBox.bottom + 8
    }
  }, [reading, selectedId])

  useEffect(() => {
    if (!drawerOpen) return undefined
    // The drawer is still visibility:hidden in this commit; focus once the first frame has made it visible.
    const frame = requestAnimationFrame(() => asideRef.current?.querySelector('button, input')?.focus())
    const onKeyDown = event => {
      if (event.key !== 'Escape') return
      setDrawerOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [drawerOpen])

  function handleSelect(id) {
    if (drawerOpen) {
      setDrawerOpen(false)
      triggerRef.current?.focus()
    }
    if (id !== selectedId) onSelect(id)
  }

  function handleToggle(id) {
    setCollapsed(current => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  function closeDrawer() {
    setDrawerOpen(false)
    triggerRef.current?.focus()
  }

  if (state === WORKSPACE_STATES.LOADING) {
    return (
      <StatusCard state={state}>
        <div className="py-10"><LoadingSpinner label="Loading your notes..." /></div>
      </StatusCard>
    )
  }

  if (state === WORKSPACE_STATES.ERROR && tree.nodes.length === 0) {
    return (
      <StatusCard state={state}>
        <div role="alert" className="py-6 text-center">
          <p className="text-sm font-medium text-red-700">{error || 'The selected notes could not be loaded.'}</p>
          <button type="button" onClick={onRetry} data-testid="reading-retry"
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2">
            Retry
          </button>
        </div>
      </StatusCard>
    )
  }

  const treeContext = {
    activeId: reading ? selectedId : null,
    activeAncestors,
    collapsed,
    matches,
    activeRef,
    onToggle: handleToggle,
    onSelect: handleSelect,
  }
  const rootNodes = matches ? tree.roots.filter(node => matches.has(node.id)) : tree.roots
  const asideClass = reading
    ? `min-w-0 bg-white max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:w-[88%] max-lg:max-w-sm max-lg:overflow-y-auto max-lg:border-r max-lg:border-slate-200 max-lg:shadow-xl max-lg:transition-[transform,visibility] max-lg:duration-200 motion-reduce:max-lg:transition-none lg:sticky lg:top-4 lg:max-h-[calc(100svh-2rem)] lg:self-start lg:overflow-y-auto ${drawerOpen ? '' : 'max-lg:invisible max-lg:-translate-x-full'}`
    : 'min-w-0 bg-white'

  return (
    <div data-testid="reading-workspace" data-state={state}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {state === WORKSPACE_STATES.ERROR && (
        <div role="alert" data-testid="reading-error"
          className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          <span>
            {reason === 'not-found'
              ? 'That topic is no longer part of these notes. Choose another topic from the table of contents.'
              : 'The selected notes could not be loaded.'}
          </span>
          <span className="flex gap-3">
            <button type="button" onClick={onShowToc} className="font-medium underline">Back to table of contents</button>
            <button type="button" onClick={onRetry} className="font-medium underline">Retry</button>
          </span>
        </div>
      )}
      {reading && drawerOpen && (
        <button type="button" tabIndex={-1} aria-label="Close table of contents" onClick={closeDrawer}
          className="fixed inset-0 z-30 cursor-default bg-slate-900/40 lg:hidden" />
      )}
      <div className={`reading-grid grid grid-cols-1 ${reading ? 'lg:grid-cols-[30fr_70fr]' : 'lg:grid-cols-[100fr_0fr]'}`}>
        <nav ref={asideRef} aria-label="Table of contents" data-testid="toc-panel" className={asideClass}>
          <div className={`${reading ? 'sticky top-0 z-10' : ''} bg-white px-4 pb-3 pt-5 sm:px-5`}>
            {reading ? (
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={onShowToc} data-testid="back-to-overview"
                  className={`-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 ${FOCUS_RING}`}>
                  <span aria-hidden="true">&larr;</span> Back to overview
                </button>
                <button type="button" onClick={closeDrawer} className={`rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 lg:hidden ${FOCUS_RING}`}>
                  Close
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-base font-semibold text-slate-900">Table of contents</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {tree.nodes.length} topic{tree.nodes.length === 1 ? '' : 's'}. Select a topic to start reading.
                </p>
              </div>
            )}
            {tree.nodes.length >= FILTER_THRESHOLD && (
              <div className="mt-3">
                <label htmlFor="toc-filter" className="sr-only">Filter topics</label>
                <input id="toc-filter" type="search" value={query} onChange={event => setQuery(event.target.value)}
                  placeholder="Filter topics" data-testid="toc-filter" autoComplete="off"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
              </div>
            )}
          </div>
          <div className="px-2 pb-5 sm:px-3">
            {rootNodes.length > 0 ? (
              <div className={reading ? '' : 'max-w-3xl'}><TocBranch nodes={rootNodes} ctx={treeContext} /></div>
            ) : (
              <p className="px-3 py-2 text-sm text-slate-500">No topics match &ldquo;{query.trim()}&rdquo;.</p>
            )}
          </div>
        </nav>
        <div className={`min-w-0 ${reading ? "lg:border-l lg:border-slate-200" : ""}`}>
          {reading && selectedNode && (
            <div className="animate-fade-slide-in">
              <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
                <button type="button" ref={triggerRef} onClick={() => setDrawerOpen(true)}
                  aria-expanded={drawerOpen} data-testid="mobile-contents-button"
                  className="inline-flex shrink-0 items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2">
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M3 5.75A.75.75 0 0 1 3.75 5h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 5.75Zm0 4.25a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10Zm.75 3.5a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z" />
                  </svg>
                  Contents
                </button>
                <span className="min-w-0 truncate text-sm text-slate-500">{selectedNode.number} {selectedNode.title}</span>
              </div>
              <section ref={panelRef} aria-labelledby="reading-heading" data-testid="reading-panel"
                data-topic-id={selectedId}
                className="scroll-mt-4 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
                <p className="sr-only" role="status" aria-live="polite">Showing {selectedNode.number} {selectedNode.title}</p>
                {topics.map((node, index) => (
                  <TopicContent key={node.id} node={node} primary={index === 0}
                    headingLevel={readingHeadingLevel(selectedNode.level, node.level)} />
                ))}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
