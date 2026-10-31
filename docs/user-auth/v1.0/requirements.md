---
version: 1.0
status: approved
date: 2026-10-31
---

# Requirements: User Authentication (Supabase Login)

Nestly is a private, single-household platform. Accounts are created by an admin (Members
feature, already in the frontend); nobody can sign up on their own. This slice delivers
email + password sign-in through Supabase Auth, session handling and route protection in the
SPA, and the NestJS side that verifies the Supabase token and enforces member status/role.

Current repo state this builds on:

- `frontend/src/routes/login.tsx` + `frontend/src/features/auth/components/login-form.tsx` —
  static form with no submit logic.
- `frontend/src/lib/api-client.ts` — `apiRequest()` with no auth header.
- `frontend/src/router.tsx` — `AppLayout` children are not protected.
- No NestJS backend exists yet; the minimum backend foundation needed for auth is in scope.

## Actors

- **Visitor** — unauthenticated person on the login page.
- **Member** — authenticated household user with role `member`.
- **Admin** — authenticated household user with role `admin`; signs in the same way as a member.
  Creating/deactivating members belongs to the Members feature, not this slice.
- **Operator** — the person who sets up the Supabase project and creates the first admin account.
- **Supabase Auth** — external system that holds credentials and issues access/refresh tokens.
- **Nestly API (NestJS)** — verifies tokens and owns member role/status.

## Use Cases

- **UC-001** — **Sign in** — A Visitor enters email and password on `/login`, is authenticated by
  Supabase Auth, and lands on the page they originally requested (or the dashboard).
- **UC-002** — **Stay signed in** — A Member reloads the page, opens a new tab, or returns later
  and is still signed in without re-entering credentials while the session is valid.
- **UC-003** — **Reach a protected page while signed out** — A Visitor opens any app page
  (e.g. `/settings`) and is sent to `/login`; after signing in they are returned to that page.
- **UC-004** — **Sign out** — A Member signs out from the sidebar; every open tab returns to
  `/login`.
- **UC-005** — **Visit login while signed in** — A signed-in Member opening `/login` is sent to
  the dashboard.
- **UC-006** — **Deactivated member is refused** — A member whose account an admin deactivated
  cannot use the app even with a correct password or a still-valid token.
- **UC-007** — **Forgot password** — A Visitor who forgot their password is told to ask the
  household admin, who resets it via the Members feature.
- **UC-008** — **Call the API as the signed-in member** — Every backend request carries the
  member's token; the API identifies the member and rejects anonymous or invalid calls.
- **UC-009** — **Bootstrap the first admin** — The Operator creates the first admin account on a
  fresh Supabase project by following a documented, repeatable procedure.

## Functional Requirements

### Sign-in form

- **FR-001** — The system SHALL validate the login form on the client before contacting Supabase:
  email must be a syntactically valid address and password must be non-empty; each invalid field
  shows an inline message next to it.
- **FR-002** — The system SHALL authenticate with Supabase Auth email + password sign-in, using
  only the Supabase project URL and the public (anon/publishable) key in the client.
- **FR-003** — The system SHALL disable the submit button and show a pending indicator while a
  sign-in request is in flight, and SHALL ignore repeat submits until it completes.
- **FR-004** — The system SHALL show the single message "Incorrect email or password." when
  Supabase rejects the credentials, without revealing whether the email exists.
- **FR-005** — The system SHALL show "Too many sign-in attempts. Wait a moment and try again."
  when Supabase responds with a rate-limit error.
- **FR-006** — The system SHALL show "Couldn't reach the sign-in service. Check your connection
  and try again." when Supabase Auth or the Nestly API is unreachable, and SHALL keep the entered
  email in the form.
- **FR-007** — The system SHALL show a "Forgot password?" control on the login page that tells
  the Visitor to ask their household admin to reset the password; it SHALL NOT send any email.
- **FR-008** — The system SHALL NOT offer self-service sign-up anywhere in the UI, and public
  sign-up SHALL be disabled in the Supabase project configuration.

### Post-sign-in and session

- **FR-009** — After Supabase accepts the credentials, the system SHALL load the member profile
  from `GET /api/v1/me` before showing any app page; the user is considered signed in only when
  that call returns a member with status `active`.
- **FR-010** — After a successful sign-in the system SHALL navigate to the `redirectTo` query
  parameter when it is a same-origin relative path starting with a single `/`, and to `/`
  otherwise (absolute URLs, `//host` and other schemes are ignored).
- **FR-011** — The system SHALL persist the session so that a page reload or a new tab in the
  same browser keeps the Member signed in, and SHALL refresh the access token automatically
  before it expires.
- **FR-012** — While the session is being restored on app start, the system SHALL show a
  full-screen loading state and SHALL NOT briefly render either the login page or a protected
  page.
- **FR-013** — The system SHALL redirect a signed-in Member who opens `/login` to `/`.

### Route protection

- **FR-014** — The system SHALL require a signed-in, active member for every route rendered
  inside `AppLayout` (dashboard, settings and all future app pages).
- **FR-015** — When a Visitor opens a protected route, the system SHALL redirect to
  `/login?redirectTo=<original path + query>` without rendering the protected page.
- **FR-016** — The `/login` and not-found routes SHALL remain reachable without a session.

### Sign-out

- **FR-017** — The system SHALL show the signed-in member's name and email in the sidebar footer
  with a "Sign out" action.
- **FR-018** — On sign-out the system SHALL end the Supabase session, clear all cached server
  data (TanStack Query cache) and navigate to `/login`.
- **FR-019** — When the session ends in another tab (sign-out or refresh failure), the system
  SHALL clear cached data and navigate the current tab to `/login` within 2 seconds of the
  session ending.

### API authentication (frontend side)

- **FR-020** — `apiRequest()` SHALL send `Authorization: Bearer <access token>` on every backend
  request when a session exists.
- **FR-021** — When the API responds `401`, the system SHALL end the local session, clear cached
  data and redirect to `/login?redirectTo=<current path>`.
- **FR-022** — When the API responds `403` with the "member deactivated" error code, the system
  SHALL end the local session and show on `/login`: "Your account has been deactivated. Contact
  your household admin."

### API authentication (backend side)

- **FR-023** — The Nestly API SHALL reject every `/api/v1/*` request that lacks a valid Supabase
  access token with `401`, unless the route is explicitly marked public. A token is valid only
  if its signature, issuer, audience (`authenticated`) and expiry all check out.
- **FR-024** — The health-check endpoint SHALL be public.
- **FR-025** — The Nestly API SHALL resolve the caller's role and status from a server-side
  member record keyed by the Supabase user id, never from client-editable token claims such as
  `user_metadata`.
- **FR-026** — The Nestly API SHALL reject requests from a member whose status is `deactivated`
  with `403` and a stable error code, on every protected route.
- **FR-027** — `GET /api/v1/me` SHALL return the caller's member profile
  `{ id, name, email, role, status }`.
- **FR-028** — The Nestly API SHALL provide a way for a route to require the `admin` role and
  SHALL reject non-admin callers of such routes with `403`.

### Account bootstrap

- **FR-029** — The project SHALL document and script how to create the first admin account
  (Supabase user + member record with role `admin`) for both local development and a hosted
  Supabase project.

## Non-Functional Requirements

- **NFR-001** — **Security** — Only `VITE_SUPABASE_URL` and the Supabase anon/publishable key
  reach the client bundle. The service-role/secret key exists only in backend environment
  variables; a build check (grep of `dist/`) confirms it is absent from the frontend bundle.
- **NFR-002** — **Security** — Passwords and tokens are never logged (frontend console or
  backend logs) and never placed in URLs.
- **NFR-003** — **Security** — The member table holding role/status has RLS enabled; a member
  can read only their own row via the anon/authenticated key, and no client can change role or
  status.
- **NFR-004** — **Security** — Brute-force protection relies on Supabase Auth rate limits; the
  limits in effect are recorded in the setup documentation.
- **NFR-005** — **Performance** — Backend token verification adds < 5 ms p95 per request (no
  per-request network call to Supabase Auth once signing keys are cached).
- **NFR-006** — **Performance** — On reload with a valid stored session, the first protected page
  starts rendering within 1 s p95 on a local dev machine (excluding the `/me` call's network time
  to a hosted Supabase region).
- **NFR-007** — **Accessibility** — The login page meets WCAG 2.2 AA: every input has a visible
  label, error messages are linked to their field (`aria-describedby`) and the form-level error
  is announced (`role="alert"`), the whole flow is keyboard-operable, and focus moves to the
  first invalid field on failed validation.
- **NFR-008** — **Testability** — Frontend code reaches Supabase only through one auth module so
  route and component tests can replace it with a fake; no unit or component test talks to a
  real Supabase instance.
- **NFR-009** — **Compatibility** — Works on the latest two versions of Chrome, Edge, Firefox and
  Safari, including iOS Safari at 360 px width.
- **NFR-010** — **Session lifetime** — Supabase defaults apply: 1-hour access token, refresh-token
  rotation enabled, no inactivity timeout in V1. Values are documented in the setup guide.

## Constraints

- Supabase Auth is the identity provider (spec §3, §10); the frontend uses `@supabase/supabase-js`.
- Backend is NestJS + TypeScript (spec §3); auth code lives under `src/common/auth/` per spec §11.
- Frontend conventions from `CLAUDE.md`: pnpm, React Router v8 data mode, TanStack Query for
  server state, Zod-validated `apiRequest()`, feature code in `src/features/auth/`, kebab-case
  files.
- The Members feature's assumed API (`/api/v1/members…`) and member shape
  (`id, name, email, role, status, createdAt, lastSignInAt`) must stay compatible with the member
  record introduced here.
- The NestJS project does not exist yet; this slice includes only the Phase 0 pieces auth needs
  (project bootstrap, env config, Supabase connection, migration workflow, health check). Swagger
  and Docker may be included if cheap, but are not required by this slice.

## Out of Scope

- Self-service sign-up and email verification.
- Self-service password reset by email (admins reset passwords via the Members feature).
- OAuth / social login, magic links, phone/OTP and MFA.
- Member management screens and endpoints (create, list, deactivate, reset password) — the
  Members slice. This slice only adds the member record and `GET /api/v1/me`.
- RLS policies for Climate, Food and Electricity tables — added with each domain.
- "Remember me" toggle, inactivity timeout, and device/session management UI.
- Custom account lockout beyond Supabase's built-in rate limits.
- Profile editing (name, email, password change by the member).

## Open Questions

- **OQ-001** — *Resolved 2026-10-31:* remove the "Terms of Service / Privacy Policy" line and its
  placeholder links from the login form.
- **OQ-002** — *Resolved 2026-10-31:* Supabase CLI local stack for development, hosted Supabase
  project for production (see design.md ADR-006).
