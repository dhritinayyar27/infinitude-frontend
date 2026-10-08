import assert from 'node:assert/strict'
import test from 'node:test'
import { failedSectionIds, generationProgress, topicRegenerateState, topicStatusLabel } from './progressState.js'

test('all topics including nested topics count towards progress', () => {
  const result = generationProgress([
    { level: 1, status: 'COMPLETED' },
    { level: 2, status: 'GENERATING', title: 'Variables' },
    { level: 3, status: 'PENDING' },
    { level: 1, status: 'FAILED' },
  ])
  assert.equal(result.total, 4)
  assert.equal(result.completed, 1)
  assert.equal(result.failed, 1)
  assert.equal(result.pending, 1)
  assert.equal(result.processed, 2)
  assert.equal(result.percent, 50)
  assert.equal(result.generating[0].title, 'Variables')
})

test('processed progress does not treat failed topics as successfully completed', () => {
  const result = generationProgress([{ status: 'COMPLETED' }, { status: 'FAILED' }])
  assert.equal(result.percent, 100)
  assert.equal(result.completed, 1)
  assert.equal(result.failed, 1)
})

test('empty and queued jobs have zero progress', () => {
  assert.equal(generationProgress().percent, 0)
  assert.equal(generationProgress([{ status: 'PENDING' }]).pending, 1)
  assert.equal(generationProgress([{ status: 'PENDING' }]).percent, 0)
})

test('every topic state has a readable status', () => {
  assert.deepEqual(['PENDING', 'GENERATING', 'COMPLETED', 'FAILED'].map(topicStatusLabel),
    ['Waiting', 'Generating', 'Completed', 'Failed'])
})

test('only failed topics offer regenerate and it is enabled when the note is idle', () => {
  const note = { status: 'FAILED' }
  assert.deepEqual(topicRegenerateState(note, { sectionId: 'a', status: 'FAILED' }),
    { visible: true, busy: false, disabled: false, blockedByOtherWork: false })
  assert.equal(topicRegenerateState(note, { sectionId: 'b', status: 'COMPLETED' }).visible, false)
  assert.equal(topicRegenerateState(note, { sectionId: 'c', status: 'PENDING' }).visible, false)
})

test('regenerate is busy and disabled while its request is in flight', () => {
  const state = topicRegenerateState({ status: 'FAILED' }, { sectionId: 'a', status: 'FAILED' }, ['a'])
  assert.equal(state.visible, true)
  assert.equal(state.busy, true)
  assert.equal(state.disabled, true)
  assert.equal(state.blockedByOtherWork, false)
})

test('other failed topics are blocked while another request or generation is running', () => {
  const other = topicRegenerateState({ status: 'FAILED' }, { sectionId: 'b', status: 'FAILED' }, ['a'])
  assert.equal(other.disabled, true)
  assert.equal(other.blockedByOtherWork, true)
  const running = topicRegenerateState({ status: 'GENERATING_NOTES' }, { sectionId: 'b', status: 'FAILED' })
  assert.equal(running.disabled, true)
  assert.equal(running.blockedByOtherWork, true)
  const regenerating = topicRegenerateState({ status: 'GENERATING_NOTES' }, { sectionId: 'a', status: 'GENERATING' })
  assert.equal(regenerating.busy, true)
  assert.equal(regenerating.visible, false)
})

test('failed topic ids are exactly the persisted FAILED topics, in TOC order', () => {
  const sections = Array.from({ length: 10 }, (_, i) => ({
    sectionId: `t${i + 1}`,
    status: [2, 5, 9].includes(i + 1) ? 'FAILED' : 'COMPLETED',
  }))
  assert.deepEqual(failedSectionIds(sections), ['t2', 't5', 't9'])
  assert.deepEqual(failedSectionIds([{ sectionId: 'x', status: 'GENERATING' }, { sectionId: 'y', status: 'PENDING' }]), [])
  assert.deepEqual(failedSectionIds(), [])
})

test('every topic in an in-flight bulk request shows as busy; others stay blocked', () => {
  const note = { status: 'FAILED' }
  const pending = ['t2', 't5', 't9']
  assert.equal(topicRegenerateState(note, { sectionId: 't5', status: 'FAILED' }, pending).busy, true)
  const completed = topicRegenerateState(note, { sectionId: 't1', status: 'COMPLETED' }, pending)
  assert.equal(completed.visible, false)
  assert.equal(completed.busy, false)
  assert.equal(topicRegenerateState(note, { sectionId: 't2', status: 'FAILED' }, []).disabled, false)
})