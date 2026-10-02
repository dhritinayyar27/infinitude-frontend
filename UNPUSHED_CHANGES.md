# Pending Frontend Changes

Snapshot: 2026-10-02. Covers the current worktree relative to `HEAD`, including work present before the TOC-only change. No commits are ahead of the locally tracked `origin/main`. This is not a fresh remote check; no fetch, commit, or push was performed.

## Retained Pending Work

- Connected the dashboard to record listing/deletion APIs, with loading/error/empty states and success notifications.
- Connected creation to record creation and Gemini TOC generation, followed by navigation to the TOC editor.
- Added the TOC editor's section title editing, adding/removal, drag-and-drop ordering, regeneration, validation, and saving.
- Added the `notesApi` client module using the existing cookie-authenticated Axios client.
- Added `@hello-pangea/dnd` for TOC ordering and `react-hot-toast` for notifications, including the app-level toaster and lockfile changes.

## TOC-Only Changes

- Removed generation-progress and notes-viewer pages, including generation/view/edit routes.
- Removed the settings page, navigation link, settings API client, and user key/model controls.
- Removed detailed note generation, section operations, and Markdown/PDF downloads from the frontend API client.
- Creation now asks for topic and difficulty only; removed the content-style control because TOC generation does not use it.
- Updated dashboard/navigation labels to tables of contents. Every record opens its TOC, including failed drafts and legacy records.
- Removed the approval/full-note generation action. The final action is `Save TOC`, with a saved notification.
- Fixed TOC updates to send `sectionId`, preserving existing section identity. New sections use server-generated IDs after saving.
- Removed unused Markdown rendering packages (`react-markdown`, `rehype-sanitize`, `remark-gfm`) and viewer-only CSS; retained existing auth animations.
- Added wrapping for navigation, dashboard headings, and TOC titles on narrow screens.

## Configuration And Compatibility

- No Gemini keys are entered, stored, selected, or transmitted by the frontend. Configure `GEMINI_API_KEY` on the backend only.
- `VITE_API_BASE_URL` remains optional and defaults to `http://localhost:8080/api`.
- Active protected routes: `/dashboard`, `/notes/create`, `/notes/:id/toc`. Removed routes now reach the not-found page.
- Authentication screens, OTP flow, protected routes, and cookie-based sessions remain unchanged.

## Verification

- Production build passed after dependency removal: `npm run build`.
- Lint completed with two warnings in existing dashboard effect / TOC polling dependency patterns; no syntax errors were reported.
- VS Code reported no source errors at the diagnostics check.
- A browser test against an isolated mock API passed for creation, title editing, saving with preserved section IDs, and absence of settings/full-note actions. The temporary mock API was stopped afterward.
- TOC screenshots at 1280px desktop and 375px mobile widths showed no horizontal overflow.
- No real Gemini calls were made. Live authenticated backend integration is not covered by the build.
- Development URL: `http://localhost:5173/` (the running server binds to `127.0.0.1`). Use `localhost` to match the backend's default allowed frontend origin, or configure `FRONTEND_ORIGIN` explicitly.