import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { getApiBaseUrl } from './apiBaseUrl.js'

test('production stays same-origin even with a stale direct Render URL', () => {
  assert.equal(getApiBaseUrl({
    PROD: true,
    VITE_API_BASE_URL: 'https://infinitude-backend.onrender.com/api',
  }), '/api')
  assert.equal(getApiBaseUrl({ PROD: true }), '/api')
})

test('development supports the local proxy and explicit backend override', () => {
  assert.equal(getApiBaseUrl({ PROD: false }), '/api')
  assert.equal(getApiBaseUrl({ PROD: false, VITE_API_BASE_URL: '/api' }), '/api')
  assert.equal(getApiBaseUrl({
    PROD: false, VITE_API_BASE_URL: 'http://localhost:8080/api',
  }), 'http://localhost:8080/api')
})

test('Vercel checks local functions before proxying backend API routes', () => {
  const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url)))
  const routes = config.routes
  const filesystemIndex = routes.findIndex((route) => route.handle === 'filesystem')
  const proxyIndex = routes.findIndex((route) => route.src === '/api/(.*)')
  const spaIndex = routes.findIndex((route) => route.dest === '/index.html')
  assert.ok(filesystemIndex >= 0 && filesystemIndex < proxyIndex)
  assert.ok(proxyIndex < spaIndex)
  assert.ok(config.functions['api/send-otp.js'])
  assert.equal(routes[proxyIndex].headers['Cache-Control'], 'no-store')

  for (const path of [
    '/api/auth/login/verify-otp',
    '/api/auth/signup/verify-otp',
    '/api/auth/me',
    '/api/auth/logout',
    '/api/notes',
    '/api/notes/fixture/generate',
    '/api/notes/fixture/download?format=pdf',
  ]) {
    assert.equal(
      path.replace(new RegExp(`^${routes[proxyIndex].src}$`), routes[proxyIndex].dest),
      `https://infinitude-backend.onrender.com${path}`,
    )
  }
})
