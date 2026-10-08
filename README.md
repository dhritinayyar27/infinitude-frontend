# React + Vite

## TOC editing

The TOC save request sends each section's `sectionId`, `title`, and explicit
one-based `order` to `PUT /api/notes/{noteId}/toc`. Order is derived from the
current editor list so edits, additions, deletions, and drag-and-drop reordering
all save consistently. New sections send a null `sectionId`; existing sections
retain their persisted IDs. API save and regeneration errors display the backend error message
when available.

Run `npm test` for the TOC save payload regression tests.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
