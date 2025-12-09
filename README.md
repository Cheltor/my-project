# CiviCode Frontend

> A role-aware React application for managing municipal code enforcement cases, inspections, complaints, licensing, permitting, and staff communication. The UI is branded as “CodeSoft” in several screens, but the codebase is referenced internally as **CiviCode**.

## Quick Start

### Requirements

- Node.js 18 LTS (or newer) and npm 9+
- A running REST API that exposes the endpoints consumed throughout `src/Components`
- A `.env` (or `.env.development`) with `REACT_APP_API_URL`

### Setup

```bash
npm install
cp .env.development .env.local   # adjust API base URL
npm start                        # http://localhost:3000
```

Scripts exposed in `package.json`:

- `npm start` – CRA dev server with fast refresh.
- `npm test` – React Testing Library/Jest in watch mode.
- `npm run build` – Production build (`DISABLE_ESLINT_PLUGIN=true` to keep CI fast).
- `npm run eject` – Standard CRA eject (irreversible; rarely needed).

## Technology Stack

- **Framework**: React 18 + Create React App (CRA)
- **Routing**: `react-router-dom@6`
- **Styling/UI**: Tailwind CSS (`tailwind.config.js`), Headless UI dialogs, Heroicons, custom styles in `App.css`
- **State & Data**: React Context (`src/AuthContext.js`), custom hooks (`src/Hooks/useVisibilityAwareInterval.js`), and lightweight fetch helpers (`src/api.js`, `src/Services/api.js`)
- **Networking**: native `fetch`, Axios (chat + legacy calls), Server-Sent Events (`EventSource`)
- **Tooling**: ESLint (CRA defaults), React Testing Library/Jest, Vercel Analytics, Workbox-powered service worker for offline caching

## High-Level Architecture

| Layer | Description |
| --- | --- |
| **Routing (`src/App.js`)** | Authenticates users, mounts the global `Sidebar`, wires every `<Route>`, toggles the chat widget, handles service-worker update notices, and renders the `@vercel/analytics` tracker. |
| **Auth (`src/AuthContext.js`)** | Stores the JWT + user object in context/localStorage, hydrates the current user via `${REACT_APP_API_URL}/user`, and exposes `login/logout`. Role codes live in `src/utils.js` (0 = Guest, 1 = ONS, 2 = OAS, 3 = Admin). |
| **Data access (`src/api.js`, `src/Services/api.js`)** | `apiFetch` wraps native `fetch` to attach JWTs, redirect on 401, and allow per-call unauthorized handlers. The Axios instance in `src/Services/api.js` powers the chat widget and any endpoints that require interceptors. |
| **Layout (`src/Layouts/Sidebar.js`)** | Houses navigation, search, notifications, service-worker banners, and logout controls. Links are rendered conditionally per role (Map, Admin tools, Rooms, Users, etc.). |
| **Domain modules (`src/Components`)** | Dedicated folders for Address, Business, Contact, Dashboard, Inspection, Admin, Dashboard widgets, etc. Each module bundles list/detail pages, create/edit modals, and supporting utilities. |
| **Background UX** | `useVisibilityAwareInterval` pauses polling when the tab is hidden (chat setting, notifications). Workbox (`service-worker.js`) precaches assets and broadcasts update events handled in `serviceWorkerRegistration.js`. |

## Feature Overview

- **Operational Dashboard** – `src/Components/Home.js` aggregates Welcome messaging, Weekly Stats, Pending Inspections, Active Violations, and role-gated admin widgets. Quick-action buttons open complaint, license, permit, business, and violation creation modals.
- **Address Intelligence** – `src/Components/Address/*` composes detail tabs for citations, inspections, licenses, permits, owner info, photos, timelines, and comments. Shared hooks such as `useUnitSearch` and forms like `NewAddressForm` centralize address CRUD.
- **Inspection Lifecycle** – `InspectionDetail`, `Inspection/Conduct`, `Inspection/Review`, `UnitDetail`, `AreaDetail`, `UnitAreaDetail`, and `Rooms` manage scheduling, conducting inspections, room/area observations, and converting findings into follow-up actions.
- **Case & Compliance Modules** – Rich screens for Violations, Complaints, Citations, Codes (`Codes.js`, `CodeDetail.js`, `CodeEdit.js`), Permits, Licenses, Businesses, Users, Rooms, SIR, and Vacancy Statuses. Many modules include `Add*Modal` components so data can be created inline.
- **Comments & Attachments** – Address/Contact/Unit comment threads (e.g., `ContactComments.js`, `UnitComments.js`) share upload widgets from `Components/Common/FileUploadInput.js` and rely on helper utilities in `src/utils.js` for consistent labeling.
- **Notifications System** – `Sidebar.js` and `Components/NotificationsPage.js` fetch notification feeds via `apiFetch`, allow marking items read/unread, deep link users back to the originating record (`origin_url_path` or inspection IDs), and now expose desktop push controls (`PushNotificationsCard`, `usePushNotifications`, `/push-subscriptions`).
- **AI Chat & Admin Controls** – `Components/ChatWidget.js` offers authenticated users a markdown-enabled assistant hit via `/chat`. Admins can toggle availability, inspect logs, and filter transcripts inside `Components/AdminChat.js`.
- **Public Resident Portal** – `Components/LandingPage.js` funnels anonymous visitors to `Components/ResidentConcern.js`, a guided form that searches addresses/contacts (`react-select/async`), deduplicates contacts, uploads attachments, and submits concerns without login.
- **Maps, Calendar & Helpful Links** – `ScheduleCalendar`, `MapPage`, and `Helpful` provide quick access to scheduling, GIS, DPIE searches, and municipal code PDFs.

## Directory Tour

```text
my-project/
├─ public/                     # CRA static assets + SW entry
├─ src/
│  ├─ App.js                   # Router + auth gate + background polling
│  ├─ AuthContext.js           # Login/logout + user hydration
│  ├─ api.js                   # fetch helper with JWT + 401 handling
│  ├─ Hooks/useVisibilityAwareInterval.js
│  ├─ Layouts/Sidebar.js       # Navigation, search, notifications
│  ├─ Components/
│  │   ├─ Dashboard/           # Home widgets
│  │   ├─ Inspection/          # Conduct/Review/Creation flows
│  │   ├─ Address/, Contact/, Business/, Unit/, Admin*, etc.
│  │   ├─ ChatWidget.js, AdminChat.js, NotificationsPage.js, ...
│  ├─ Services/api.js          # Axios instance w/ auth interceptor
│  ├─ utils.js                 # Formatters, role helpers, attachment utils
│  ├─ service-worker.js        # Workbox runtime config
│  └─ serviceWorkerRegistration.js
├─ .env.development            # Example API base
├─ tailwind.config.js          # Tailwind + safelist + forms plugin
├─ package.json
└─ README.md                   # You are here
```

## Environment & API Integration

1. **API base URL** – Exposed as `REACT_APP_API_URL` (e.g., `http://localhost:8000`). CRA only inlines variables prefixed with `REACT_APP_`.
2. **Authentication** – JWTs are stored in `localStorage` by `AuthContext`. On load, `${REACT_APP_API_URL}/user` must return the active staff member (including a numeric `role`).
3. **Endpoints** – The UI expects REST resources for addresses, units, inspections, complaints, citations, violations, licenses, permits, businesses, contacts, notifications, chat, and resident concerns. Consult each component before changing backend routes.
4. **Background polling** – `useVisibilityAwareInterval` powers periodic calls to `/settings/chat` and notification endpoints but pauses when the tab is hidden. `App.js` also subscribes to `${REACT_APP_API_URL}/settings/stream` via `EventSource` for push-style updates.
5. **Desktop push** – Generate VAPID keys (`npx web-push generate-vapid-keys`) and expose the public key as `REACT_APP_WEB_PUSH_PUBLIC_KEY`. The matching private/public/contact values must be set on the FastAPI backend (`WEB_PUSH_VAPID_*`) so `/push-subscriptions` can send payloads.
6. **File uploads** – `FileUploadInput` emits `File` objects in arrays. Ensure the backend accepts `multipart/form-data` payloads with the field names used in each form (e.g., `attachments`, `photos`, etc.).

## UI/UX Conventions

- Favor Tailwind utility classes inside JSX. Complex styling lives in `App.css`.
- Name large feature files with the `<Feature>Detail`, `<Feature>List`, `New<Feature>Form`, or `Add<Feature>Modal` pattern used throughout `src/Components`.
- Gate navigation or blocks with `user.role` (values from `roles` in `src/utils.js`).
- Format dates/times via `toEasternLocaleString/DateString/TimeString` so every timestamp shows in the America/New_York timezone.
- Dispatch/listen for window events when coordinating cross-component behavior (e.g., `civiccode:sw-updated`, `notifications:refresh`).

## Progressive Web App Behavior

- `service-worker.js` precaches build assets with Workbox, skips waiting, broadcasts `SERVICE_WORKER_ACTIVATED`, and displays desktop notifications when push payloads arrive (`push` + `notificationclick` handlers).
- `serviceWorkerRegistration.js` registers the worker, forces reloads after updates (`onBeforeReload`, `onActivate`), polls for updates hourly, and exposes helpers to inspect/request push subscriptions.
- `src/pushNotifications.js` + `Hooks/usePushNotifications.js` wrap permission prompts, VAPID subscriptions, and `/push-subscriptions` API calls. `PushNotificationsCard` provides the UI entry point.
- `App.js` listens for SW events and surfaces update notices via a banner in the sidebar layout.

## Testing & Quality

- Tests live next to the code under test (e.g., `src/App.test.js`). Use React Testing Library (`render`, `screen`, `userEvent`) for DOM interactions.
- Jest config comes from CRA. Run `npm test` for watch mode or `CI=true npm test -- --runInBand` in pipelines.
- ESLint extends CRA defaults plus Testing Library rules (see `.eslintrc.json`). Run `npx eslint src` manually if needed.
- For network-heavy components, mock `fetch`/`apiFetch` or inject mock handlers through props to keep tests deterministic.

## Deployment Notes

1. `npm run build` outputs the production bundle in `build/`. Deploy the entire folder and configure your host for SPA fallbacks (serve `index.html` for unknown routes).
2. Set `REACT_APP_API_URL` (and any other env vars) at build time. CRA cannot read runtime env vars without a rebuild.
3. Ensure your API supports HTTPS + CORS for the deployed origin, especially for SSE endpoints used by `EventSource`.
4. Vercel Analytics is mounted globally but becomes a no-op outside Vercel. Remove or guard the `<Analytics />` import if you do not want to send telemetry.
5. After deployment, clear old caches when bumping versions. The service worker already calls `registration.update()`, but browsers may hang on to outdated caches for up to 24 hours.

## Troubleshooting

| Symptom | Likely Cause / Mitigation |
| --- | --- |
| “Failed to fetch” everywhere | `REACT_APP_API_URL` missing, unreachable, or blocked by CORS. Verify `.env` and restart `npm start`. |
| Redirects back to LandingPage after login | `/user` endpoint returned 401/500. Inspect network tab, verify JWT issuance, and confirm HTTPS/CORS settings. |
| Chat widget missing | User is unauthenticated or `/settings/chat` returned `enabled: false`. Admins can toggle the setting in `AdminChat`. |
| Notifications badge stuck | SSE endpoint `${REACT_APP_API_URL}/settings/stream` not emitting JSON or being blocked by the browser. Confirm server keeps the connection open and sends `{ key: 'chat_enabled', enabled: true }` payloads. |
| Desktop push not arriving | Ensure `REACT_APP_WEB_PUSH_PUBLIC_KEY` (frontend) and `WEB_PUSH_VAPID_*` (backend) match, the user accepted permissions, and `/push-subscriptions` shows at least one entry. Use “Send test alert” in `PushNotificationsCard` to verify wiring. |
| Uploads rejected | Backend must accept `multipart/form-data` with the exact field names used by `FileUploadInput`. Adjust max file size limits server-side if large photos fail. |

## Contributing Tips

1. Keep new code near the feature it belongs to (`src/Components/<Feature>`). Large screens (e.g., `AddressDetail`, `BusinessDetail`) already assemble many child components—extend them instead of duplicating logic.
2. Reuse `apiFetch` for authenticated requests so 401 handling and logout flows stay consistent.
3. When adding new background jobs, reuse `useVisibilityAwareInterval` to avoid wasted work on hidden tabs.
4. Update this README whenever you add environment variables, deployment expectations, or new high-level features—the document doubles as the onboarding guide.

---

Need a guided tour? Start with `src/App.js`, `src/Layouts/Sidebar.js`, and the relevant folder inside `src/Components/`—they illustrate how routing, data fetching, and role-aware UI all fit together.
