import assert from 'node:assert/strict'
import test from 'node:test'
import {
  WORKSPACE_STATES,
  ancestorIds,
  buildTocTree,
  deriveWorkspaceState,
  matchingTopicIds,
  readTopicParam,
  readingHeadingLevel,
  topicWithDescendants,
  visibleChildren,
  withTopic,
  withoutTopic,
} from './workspaceModel.js'

const sections = [
  { sectionId: 'a', title: 'Basics', level: 1, content: '# A' },
  { sectionId: 'a1', title: 'Variables', level: 2, content: 'vars' },
  { sectionId: 'a1x', title: 'Scope', level: 3, content: 'scope' },
  { sectionId: 'a2', title: 'Functions', level: 2, content: 'fns' },
  { sectionId: 'b', title: 'Advanced', level: 1, content: 'adv' },
  { sectionId: 'c', title: 'Appendix', level: 1, content: 'app' },
]
const tree = buildTocTree(sections)

test('tree nests by level, keyed by stable section id, with matching numbering', () => {
  assert.deepEqual(tree.roots.map(n => n.id), ['a', 'b', 'c'])
  assert.deepEqual(tree.byId.get('a').children.map(n => n.id), ['a1', 'a2'])
  assert.deepEqual(tree.byId.get('a1').children.map(n => n.id), ['a1x'])
  assert.deepEqual(tree.nodes.map(n => n.number), ['1', '1.1', '1.1.1', '1.2', '2', '3'])
  assert.equal(tree.byId.get('a1x').parentId, 'a1')
  assert.equal(tree.byId.get('a').parentId, null)
})

test('duplicate titles stay distinct because nodes are keyed by id', () => {
  const dup = buildTocTree([
    { sectionId: 'x1', title: 'Overview', level: 1 },
    { sectionId: 'x2', title: 'Overview', level: 1 },
  ])
  assert.equal(dup.byId.get('x1').number, '1')
  assert.equal(dup.byId.get('x2').number, '2')
})

test('a selected topic shows itself plus nested subsections, a leaf shows only itself', () => {
  assert.deepEqual(topicWithDescendants(tree, 'a').map(n => n.id), ['a', 'a1', 'a1x', 'a2'])
  assert.deepEqual(topicWithDescendants(tree, 'a1').map(n => n.id), ['a1', 'a1x'])
  assert.deepEqual(topicWithDescendants(tree, 'b').map(n => n.id), ['b'])
  assert.deepEqual(topicWithDescendants(tree, 'missing'), [])
})

test('ancestors are listed nearest first', () => {
  assert.deepEqual(ancestorIds(tree, 'a1x'), ['a1', 'a'])
  assert.deepEqual(ancestorIds(tree, 'a'), [])
})

test('an empty or malformed section list produces an empty tree', () => {
  assert.equal(buildTocTree().nodes.length, 0)
  const skipped = buildTocTree([{ sectionId: 'p', title: 'P', level: 1 }, { sectionId: 'q', title: 'Q', level: 3 }])
  assert.equal(skipped.byId.get('q').parentId, 'p')
})

test('filter keeps matches and their ancestors, and is inactive when blank', () => {
  assert.equal(matchingTopicIds(tree, ''), null)
  assert.equal(matchingTopicIds(tree, '   '), null)
  assert.deepEqual([...matchingTopicIds(tree, 'scope')].sort(), ['a', 'a1', 'a1x'])
  assert.deepEqual([...matchingTopicIds(tree, 'ADVANCED')], ['b'])
  assert.equal(matchingTopicIds(tree, 'zzz').size, 0)
  assert.ok(matchingTopicIds(tree, '1.2').has('a2'))
})

test('collapse hides children; an active filter overrides collapse', () => {
  const a = tree.byId.get('a')
  assert.equal(visibleChildren(a, { collapsed: new Set(['a']), matches: null }).length, 0)
  assert.equal(visibleChildren(a, { collapsed: new Set(), matches: null }).length, 2)
  const matches = matchingTopicIds(tree, 'functions')
  assert.deepEqual(visibleChildren(a, { collapsed: new Set(['a']), matches }).map(n => n.id), ['a2'])
})

test('reading headings sit under the page title and never exceed h6', () => {
  assert.equal(readingHeadingLevel(1, 1), 2)
  assert.equal(readingHeadingLevel(1, 2), 3)
  assert.equal(readingHeadingLevel(2, 4), 4)
  assert.equal(readingHeadingLevel(1, 9), 6)
})

test('a newly opened document is TOC_ONLY even though every topic has content', () => {
  assert.deepEqual(deriveWorkspaceState({ selectedId: null, tree }), { state: WORKSPACE_STATES.TOC_ONLY, reason: null })
})

test('selecting a loaded topic enters READING; an unknown id is a not-found ERROR', () => {
  assert.equal(deriveWorkspaceState({ selectedId: 'a2', tree }).state, WORKSPACE_STATES.READING)
  assert.deepEqual(deriveWorkspaceState({ selectedId: 'gone', tree }), { state: WORKSPACE_STATES.ERROR, reason: 'not-found' })
})

test('a shared topic link is LOADING until notes arrive, and ERROR with retry when loading fails', () => {
  const empty = buildTocTree([])
  assert.equal(deriveWorkspaceState({ selectedId: 'a', tree: empty, loading: true }).state, WORKSPACE_STATES.LOADING)
  assert.deepEqual(deriveWorkspaceState({ selectedId: 'a', tree: empty, error: 'boom' }), { state: WORKSPACE_STATES.ERROR, reason: 'load' })
  assert.equal(deriveWorkspaceState({ selectedId: null, tree: empty, loading: true }).state, WORKSPACE_STATES.TOC_ONLY)
})

test('topic selection round-trips through the URL without disturbing other params', () => {
  const base = new URLSearchParams('view=x')
  const selected = withTopic(base, 'a1')
  assert.equal(selected.toString(), 'view=x&topic=a1')
  assert.equal(readTopicParam(selected), 'a1')
  assert.equal(withTopic(selected, 'b').get('topic'), 'b')
  assert.equal(withoutTopic(selected).toString(), 'view=x')
  assert.equal(base.toString(), 'view=x')
  assert.equal(readTopicParam(new URLSearchParams()), null)
  assert.equal(readTopicParam(new URLSearchParams('topic=%20')), null)
})

test('full interaction: overview, open topic, switch topics, nested topic, back to overview, restore from link', () => {
  let params = new URLSearchParams()
  const stateOf = () => deriveWorkspaceState({ selectedId: readTopicParam(params), tree })

  assert.equal(stateOf().state, WORKSPACE_STATES.TOC_ONLY)
  params = withTopic(params, 'a')
  assert.equal(stateOf().state, WORKSPACE_STATES.READING)
  assert.deepEqual(topicWithDescendants(tree, readTopicParam(params)).map(n => n.id), ['a', 'a1', 'a1x', 'a2'])
  params = withTopic(params, 'b')
  assert.deepEqual(topicWithDescendants(tree, readTopicParam(params)).map(n => n.section.content), ['adv'])
  params = withTopic(params, 'a1x')
  assert.equal(topicWithDescendants(tree, readTopicParam(params))[0].section.content, 'scope')
  params = withoutTopic(params)
  assert.equal(stateOf().state, WORKSPACE_STATES.TOC_ONLY)
  assert.equal(sections[0].content, '# A')

  params = new URLSearchParams('topic=a2')
  assert.equal(stateOf().state, WORKSPACE_STATES.READING)
})
