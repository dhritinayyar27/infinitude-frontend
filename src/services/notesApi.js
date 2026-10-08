import api from './api'

// Notes CRUD
export const createNote = (topic, difficulty) =>
  api.post('/notes', { topic, difficulty })

export const listNotes = () => api.get('/notes')

export const getNote = (noteId) => api.get(`/notes/${noteId}`)

export const deleteNote = (noteId) => api.delete(`/notes/${noteId}`)

// TOC
export const generateToc = (noteId) => api.post(`/notes/${noteId}/toc/generate`)

export const getToc = (noteId) => api.get(`/notes/${noteId}/toc`)

export const updateToc = (noteId, sections) => api.put(`/notes/${noteId}/toc`, { sections })

export const generateNotes = (noteId) => api.post(`/notes/${noteId}/generate`)
