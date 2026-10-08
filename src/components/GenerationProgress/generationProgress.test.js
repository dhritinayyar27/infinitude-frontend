import assert from 'node:assert/strict'
import test from 'node:test'
import { generationProgress, topicStatusLabel } from './progressState.js'

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
