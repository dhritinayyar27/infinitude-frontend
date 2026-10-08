import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSectionsPayload, topicNumbers, validateHierarchy, isTocDirty } from './tocPayload.js'

test('saving an edited section includes its persisted ID, title and one-based order', () => {
  assert.deepEqual(buildSectionsPayload([
    { id: 'existing-section', title: 'Edited title', order: 0 },
  ]), [
    { sectionId: 'existing-section', title: 'Edited title', order: 1, level: 1 },
  ])
})

test('new sections send a null ID and an explicit order', () => {
  assert.deepEqual(buildSectionsPayload([
    { id: 'existing-section', title: 'Introduction', order: 0 },
    { id: 'new-123', title: 'New section', order: 1 },
  ]), [
    { sectionId: 'existing-section', title: 'Introduction', order: 1, level: 1 },
    { sectionId: null, title: 'New section', order: 2, level: 1 },
  ])
})

test('reordered and deleted sections use their current position, not stale order values', () => {
  assert.deepEqual(buildSectionsPayload([
    { id: 'third', title: 'Third', order: 3 },
    { id: 'first', title: 'First', order: 1 },
  ]), [
    { sectionId: 'third', title: 'Third', order: 1, level: 1 },
    { sectionId: 'first', title: 'First', order: 2, level: 1 },
  ])
})

test('building the request does not mutate editor state', () => {
  const sections = [Object.freeze({ id: 'existing', title: 'Title', order: 0 })]
  buildSectionsPayload(Object.freeze(sections))
  assert.equal(sections[0].order, 0)
})

test('hierarchy survives the save payload and uses matching topic numbering', () => {
  const sections = [1, 2, 2, 1, 2, 3].map((level, i) => ({ id: `id-${i}`, title: `Topic ${i}`, level }))
  assert.deepEqual(buildSectionsPayload(sections).map(s => s.level), [1, 2, 2, 1, 2, 3])
  assert.deepEqual(topicNumbers(sections), ['1', '1.1', '1.2', '2', '2.1', '2.1.1'])
  assert.equal(validateHierarchy(sections), null)
})

test('invalid hierarchy cannot be saved', () => {
  assert.ok(validateHierarchy([{ level: 2 }]))
  assert.ok(validateHierarchy([{ level: 1 }, { level: 3 }]))
})

test('title, hierarchy and order edits require another save', () => {
  const saved = [{ title: 'A', level: 1 }, { title: 'B', level: 2 }]
  assert.equal(isTocDirty(saved, saved), false)
  assert.equal(isTocDirty([{ title: 'Edited', level: 1 }, saved[1]], saved), true)
  assert.equal(isTocDirty([saved[0], { title: 'B', level: 1 }], saved), true)
  assert.equal(isTocDirty([...saved].reverse(), saved), true)
})
