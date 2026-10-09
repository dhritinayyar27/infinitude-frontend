# React + Vite

## Cookie authentication and API routing

Production browser requests always use `/api` on the frontend origin, including
login, session checks, notes, generation, and downloads. [vercel.json](vercel.json)
proxies those requests to `https://infinitude-backend.onrender.com/api/...` after
checking local files/functions, so `/api/send-otp` still runs on Vercel.
API responses are marked `Cache-Control: no-store`.

The backend's host-only `Secure`, `HttpOnly`, `SameSite=Strict` cookie is received
through the frontend domain and sent back on subsequent same-origin requests.
Direct browser calls from `vercel.app` to `onrender.com` do not work with this
cookie policy; `withCredentials` alone cannot bypass SameSite restrictions.
No JWT is stored in browser storage and cookie security is not relaxed.

Set `VITE_API_BASE_URL=/api` in Vercel and redeploy. Production deliberately
ignores stale absolute API URLs to prevent cross-site cookie regressions.
Keep Render `FRONTEND_ORIGIN=https://infinitudeai.vercel.app` (no trailing slash).
If moving the backend, update the proxy destination in [vercel.json](vercel.json).
After deploying, log in again to establish the cookie on the frontend domain.
Vite development also proxies `/api` to `http://localhost:8080`; explicit
`VITE_API_BASE_URL` overrides are supported only for development.

## Server-only OTP delivery on Vercel

Deploy this directory as a Vite project (output directory `dist`). Vercel also
deploys [api/send-otp.js](api/send-otp.js) as a Node function. SPA routes are
handled by [vercel.json](vercel.json); API requests never fall through to the SPA.
No SSR conversion or browser authentication changes are required.

Set these **server-only** environment variables in Vercel for the relevant
deployment environment, then redeploy:

| Variable | Value |
| --- | --- |
| `EMAIL_RELAY_SECRET` | Random secret of at least 32 bytes, identical to the backend's value. Generate with `openssl rand -hex 32`. |
| `GMAIL_USER` | Sending Gmail address; identical to backend `MAIL_FROM`. |
| `GMAIL_APP_PASSWORD` | Gmail app password generated after enabling 2-Step Verification. Not your normal account password. |
| `UPSTASH_REDIS_REST_URL` | HTTPS REST URL for an Upstash Redis database. |
| `UPSTASH_REDIS_REST_TOKEN` | Redis REST token with permission to SET keys. |

Never prefix these with `VITE_`. Never import the API/server modules into browser
code, commit credentials, or expose this endpoint through a client-side send action.
Use a stable production URL for the backend relay endpoint. If Vercel Deployment
Protection is enabled, configure its server-only automation bypass for the relay
or use a production deployment accessible to the backend.

The backend creates the original HTML email and inline logo, then POSTs signed
MIME bytes to `/api/send-otp` over HTTPS. HMAC-SHA256 authenticates the exact body,
recipient, timestamp, and request ID. Requests expire after 60 seconds; atomic
Redis NX claims prevent replay across instances for 180 seconds. Redis failure
rejects delivery. No CORS permission is granted and no OTP is returned to callers.
Gmail uses verified TLS on port 465 with bounded timeouts. Failures return a
non-success HTTP status with sanitized logs; SMTP acceptance does not guarantee
inbox delivery.

This requires outbound Gmail SMTP access from Vercel and an account eligible for
app passwords. If Gmail/hosting blocks SMTP, this relay cannot bypass that policy;
use Gmail API over HTTPS instead. Gmail also imposes sending limits.

Run `npm test` for authenticated delivery, tampering, expiry, concurrent replay,
oversized requests, configuration failures, and SMTP/Redis failure tests.

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
