---
version: 1.0
status: approved
date: 2026-10-31
requires: requirements.md
---

# System Design: User Authentication (Supabase Login)

## Architecture Overview

The browser signs in **directly with Supabase Auth** using the public publishable key and keeps
the session itself (supabase-js). Every call to the Nestly API carries the Supabase access token;
NestJS verifies it **locally** against the project's JWKS, then loads the caller's `members` row to
decide whether they may proceed (status) and what they may do (role).

```mermaid
flowchart LR
  subgraph Browser["Browser — Vite SPA (frontend/)"]
    LF[Login form] --> AUTH["lib/auth.ts<br/>(only supabase-js importer)"]
    RL["Route loaders<br/>requireMember / redirectIfSignedIn"] --> AUTH
    RL --> ME[features/auth queries<br/>GET /api/v1/me]
    API["lib/api-client.ts<br/>apiRequest()"] --> AUTH
    ME --> API
  end

  AUTH -- "signInWithPassword / refresh<br/>(publishable key)" --> SA[(Supabase Auth)]
  API -- "/api/* Bearer access token<br/>(Vite proxy in dev)" --> NEST

  subgraph NEST["NestJS — backend/"]
    G["AuthGuard (global)<br/>verify JWT → load member → check status"] --> R[RolesGuard]
    R --> C["MeController / HealthController"]
    G --> V["SupabaseJwtVerifier<br/>(jose + cached JWKS)"]
    G --> MR[MembersRepository]
  end

  V -- "GET /auth/v1/.well-known/jwks.json<br/>(cached)" --> SA
  MR -- "Drizzle / postgres.js" --> DB[(Supabase Postgres<br/>members + auth.users)]
  SCRIPT["scripts/create-admin.ts<br/>(secret key)"] --> SA
  SCRIPT --> DB
```

### Sign-in sequence (UC-001, FR-002, FR-009, FR-010)

```mermaid
sequenceDiagram
  actor V as Visitor
  participant UI as LoginForm (useSignIn)
  participant A as lib/auth.ts
  participant S as Supabase Auth
  participant N as NestJS
  V->>UI: email + password, submit
  UI->>UI: Zod validation (FR-001)
  UI->>A: signInWithPassword(email, password)
  A->>S: POST /auth/v1/token?grant_type=password
  alt invalid_credentials / rate limit / network
    S-->>UI: AuthError(code) → mapped message (FR-004..006)
  else ok
    S-->>A: session (access + refresh token) — persisted in localStorage
    UI->>N: GET /api/v1/me (Bearer)
    alt 403 MEMBER_DEACTIVATED / MEMBER_NOT_PROVISIONED
      N-->>UI: error → signOut() + message (FR-022)
    else 200
      N-->>UI: member → cache ['auth','me'] → navigate(safe redirectTo | '/')
    end
  end
```

### Protected request sequence (UC-008, FR-023..FR-026)

```mermaid
sequenceDiagram
  participant B as apiRequest()
  participant G as AuthGuard
  participant V as SupabaseJwtVerifier
  participant M as MembersRepository
  B->>G: GET /api/v1/... Authorization: Bearer <jwt>
  G->>G: route @Public()? → skip
  G->>V: verify(jwt) — sig (JWKS), iss, aud=authenticated, exp
  V-->>G: claims.sub | throw → 401 AUTH_INVALID_TOKEN
  G->>M: findById(sub)
  M-->>G: member | null → 403 MEMBER_NOT_PROVISIONED
  G->>G: status = deactivated → 403 MEMBER_DEACTIVATED
  G->>G: request.member = member → RolesGuard → handler
```

## Components

### Backend (`backend/`, new)

| Component | Path | Responsibility |
|-----------|------|----------------|
| App bootstrap | `src/main.ts` | Global prefix `api`, URI versioning (`v1`), global `ValidationPipe`, error filter, Swagger at `/api/docs` with bearer auth |
| `AppConfigModule` | `src/infrastructure/config/` | Load + validate env with Zod at startup (fail fast); typed `AppConfig` provider |
| `DatabaseModule` | `src/infrastructure/database/` | One postgres.js pool + Drizzle instance (`DRIZZLE` token); Drizzle schema barrel |
| `HealthModule` | `src/modules/health/` | `GET /api/v1/health` — `@Public()`, runs `select 1` (FR-024) |
| `AuthModule` | `src/common/auth/` | `TokenVerifier` interface + `SupabaseJwtVerifier` (jose); global `AuthGuard` and `RolesGuard` via `APP_GUARD`; `@Public()`, `@Roles('admin')`, `@CurrentMember()` decorators (FR-023, FR-025, FR-026, FR-028) |
| `MembersModule` | `src/modules/members/` | `members` Drizzle schema, `MembersRepository.findById()` (joins `auth.users` for email / last sign-in), `MeController` → `GET /api/v1/me` (FR-027). Exported for `AuthModule`; the Members slice extends it later |
| Error filter | `src/common/exceptions/` | Uniform error envelope `{ statusCode, code, message }`; never echoes tokens |
| Admin bootstrap script | `scripts/create-admin.ts` | Idempotent: creates/updates Supabase user (admin API, `email_confirm: true`) and upserts `members` row with role `admin` (FR-029) |

### Frontend (`frontend/`, changed)

| Component | Path | Responsibility |
|-----------|------|----------------|
| Supabase client + auth facade | `src/lib/auth.ts` (new) | The **only** module importing `@supabase/supabase-js` (NFR-008). Exports `signInWithPassword`, `signOut`, `getAccessToken`, `hasSession`, `onSessionEnded(cb)`; maps `AuthError` to `SignInError` kinds `invalid_credentials \| rate_limited \| unreachable \| unknown` |
| API client | `src/lib/api-client.ts` (changed) | Adds `Authorization: Bearer` (FR-020); `ApiError` gains `code`; on 401/403-member errors calls the registered `onAuthFailure` handler (FR-021, FR-022) |
| Safe redirect helper | `src/lib/safe-redirect.ts` (new) | `safeRedirectPath(value): string` — returns value only if it starts with a single `/`, else `/` (FR-010) |
| Auth feature API | `src/features/auth/api.ts` (new) | `meSchema` (Zod), `fetchMe()`, `AUTH_ERROR_CODES` |
| Auth queries | `src/features/auth/queries.ts` (new) | `meQueryOptions` (`['auth','me']`, `staleTime` 5 min), `useMe()`, `useSignIn()` mutation (sign-in → `/me` → cache), `useSignOut()` |
| Route loaders | `src/features/auth/loaders.ts` (new) | `requireMember` (protected pathless route) and `redirectIfSignedIn` (`/login`) using `queryClient.ensureQueryData(meQueryOptions)` (FR-012..FR-016) |
| Login form | `src/features/auth/components/login-form.tsx` (changed) | React Hook Form + Zod, pending state, field + form errors, forgot-password hint, `?reason=` banner (FR-001..FR-008, FR-022) |
| User menu | `src/features/auth/components/user-menu.tsx` (new) | Sidebar footer: avatar initials, name, email, "Sign out" (FR-017, FR-018) |
| Full-screen loader | `src/components/layout/full-screen-loader.tsx` (new) | `HydrateFallback` for the protected route while the session restores (FR-012) |
| Router | `src/router.tsx` (changed) | Protected pathless route wraps `AppLayout` with `loader: requireMember`; `/login` gets `loader: redirectIfSignedIn` |
| Bootstrap wiring | `src/main.ts(x)` (changed) | Registers `onAuthFailure` and `onSessionEnded` → `queryClient.clear()` + `router.navigate('/login?…')` (FR-019, FR-021) |
| Sidebar | `src/components/layout/app-sidebar.tsx` (changed) | Renders `UserMenu` in the footer under Settings |

### Repository layout

```
nestly/
├── frontend/                 # existing SPA
├── backend/                  # new NestJS app (spec §11 layout inside it)
│   ├── src/{main.ts, common/auth, common/exceptions, infrastructure/{config,database}, modules/{health,members}}
│   ├── database/migrations/  # drizzle-kit output (SQL, committed)
│   ├── scripts/create-admin.ts
│   ├── drizzle.config.ts
│   └── .env.example
└── supabase/config.toml      # Supabase CLI local stack config only (no CLI migrations)
```

## Data Model

One new table. Email and last sign-in time stay in `auth.users` (single source of truth) and are
joined on read. No trigger on `auth.users`: members are created explicitly by the bootstrap
script now and by the Members API later, both server-side.

```
enum member_role   = ('admin', 'member')
enum member_status = ('active', 'deactivated')

public.members
  id          uuid         PK, FK → auth.users(id) ON DELETE CASCADE
  name        text         NOT NULL, 1..100 chars
  role        member_role  NOT NULL DEFAULT 'member'
  status      member_status NOT NULL DEFAULT 'active'
  created_at  timestamptz  NOT NULL DEFAULT now()
  updated_at  timestamptz  NOT NULL DEFAULT now()

RLS: ENABLED
  policy "members can read own row"  FOR SELECT TO authenticated USING ((select auth.uid()) = id)
  (no INSERT / UPDATE / DELETE policies → clients can never change role or status — NFR-003)
```

Drizzle schema (`src/modules/members/members.schema.ts`) declares the FK via `authUsers` from
`drizzle-orm/supabase` and the policy via `pgPolicy(..., { to: authenticatedRole })`, so the RLS
policy lives in the same generated migration as the table.

Member read model returned by `MembersRepository.findById(id)`:

```ts
interface Member {
  id: string;
  name: string;
  email: string;            // auth.users.email
  role: 'admin' | 'member';
  status: 'active' | 'deactivated';
  createdAt: string;        // ISO 8601
  lastSignInAt: string | null; // auth.users.last_sign_in_at
}
```

This is the same shape the frontend Members feature already assumes (see `CLAUDE.md`).

## API Contracts

All errors use one envelope:

```json
{ "statusCode": 401, "code": "AUTH_INVALID_TOKEN", "message": "Your session has expired. Sign in again." }
```

| `code` | Status | When | Frontend behaviour |
|--------|--------|------|--------------------|
| `AUTH_REQUIRED` | 401 | No / malformed `Authorization` header | sign out locally → `/login?redirectTo=…` (FR-021) |
| `AUTH_INVALID_TOKEN` | 401 | Bad signature, wrong `iss`/`aud`, expired, unknown `kid` | same as above |
| `MEMBER_NOT_PROVISIONED` | 403 | Valid token, no `members` row | sign out → `/login?reason=not-provisioned` |
| `MEMBER_DEACTIVATED` | 403 | `members.status = 'deactivated'` | sign out → `/login?reason=deactivated` (FR-022) |
| `FORBIDDEN_ROLE` | 403 | Route requires `admin`, caller is `member` | shown as normal API error; session kept |

### Health check

- **Method / Path** — `GET /api/v1/health` — `@Public()`
- **Request** — none

```json
{ "status": "ok", "database": "up" }
```

- **Errors** — `503` `{ "status": "error", "database": "down" }` when `select 1` fails.

### Current member

- **Method / Path** — `GET /api/v1/me`
- **Request** — header `Authorization: Bearer <supabase access token>`

```json
{
  "id": "6f1c…",
  "name": "Charanchai",
  "email": "owner@example.com",
  "role": "admin",
  "status": "active",
  "createdAt": "2026-10-31T09:00:00.000Z",
  "lastSignInAt": "2026-10-31T09:05:12.000Z"
}
```

- **Errors** — `401 AUTH_REQUIRED`, `401 AUTH_INVALID_TOKEN`, `403 MEMBER_NOT_PROVISIONED`,
  `403 MEMBER_DEACTIVATED`. (A deactivated member never receives `200`, so `status` is always
  `active` in practice; it is kept for shape compatibility with the Members API.)

### Supabase Auth (consumed, not built)

- `signInWithPassword({ email, password })` — error `code` mapping:
  `invalid_credentials` → FR-004; `over_request_rate_limit` / HTTP 429 → FR-005;
  fetch failure / `AuthRetryableFetchError` → FR-006; anything else → generic
  "Something went wrong. Try again." (logged without the password).
- `email_not_confirmed` cannot occur: the bootstrap script and Members API create users with
  `email_confirm: true`.

### Configuration contract

| Variable | Where | Example (local) | Notes |
|----------|-------|-----------------|-------|
| `VITE_SUPABASE_URL` | frontend | `http://127.0.0.1:54321` | public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend | `sb_publishable_…` | public; RLS is the boundary |
| `PORT` | backend | `3000` | Vite proxies `/api` here |
| `DATABASE_URL` | backend | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | server-only |
| `SUPABASE_URL` | backend | `http://127.0.0.1:54321` | JWKS = `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` |
| `SUPABASE_JWT_ISSUER` | backend | *(defaults to `${SUPABASE_URL}/auth/v1`)* | override if the issuer host differs (e.g. `localhost` vs `127.0.0.1`) |
| `SUPABASE_SECRET_KEY` | backend scripts only | `sb_secret_…` | used by `create-admin.ts`; not required by the API process in this slice |

## Key Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| ADR-001: Where sign-in happens | (a) Browser → Supabase Auth via supabase-js; (b) Browser → NestJS `/auth/login` proxying Supabase | (a) | Supabase handles rate limiting, refresh-token rotation and persistence; NestJS never touches passwords. The publishable key is designed to be public. Revisit if we need server-set httpOnly cookies. |
| ADR-002: Token verification in NestJS | (a) `jose` + `createRemoteJWKSet` (local, cached); (b) `supabase.auth.getUser(jwt)` per request; (c) shared HS256 secret | (a) | Meets NFR-005 (no per-request network call); asymmetric keys are the default for new projects and supported by Supabase CLI ≥ 2.117 locally. Verify `iss` and `aud = authenticated`; accept only `ES256`/`RS256`. Do not cache JWKS beyond jose's defaults so key rotation keeps working. Revisit if the project is on legacy HS256 keys. |
| ADR-003: Source of role/status | (a) `members` table, PK lookup per request; (b) `app_metadata` claims in the JWT; (c) custom access-token hook | (a) | Deactivation takes effect on the very next request instead of after token expiry (≤ 1 h); `user_metadata` is client-editable and is never used (FR-025). One indexed PK read is ~1 ms locally. Revisit with (c) if per-request DB reads become a bottleneck. |
| ADR-004: DB access + migrations | (a) Drizzle ORM + drizzle-kit SQL migrations in `backend/database/migrations/`; (b) Prisma; (c) Supabase CLI SQL migrations + Kysely | (a) | One tool for typed queries, migrations **and RLS policies** (`pgPolicy`, `drizzle-orm/supabase` roles and `authUsers`); real Postgres transactions for the later Food slice; matches spec §11's `database/migrations/`. Prisma handles the `auth` schema and RLS poorly. The API connects as `postgres` (bypasses RLS) and authorizes in code; RLS protects anything reached with the publishable key. |
| ADR-005: Route protection in the SPA | (a) Loader on a protected pathless route + `HydrateFallback`; (b) `<RequireAuth>` component with `useEffect` redirect | (a) | Loaders run before render, so no flash of protected or login content (FR-012, FR-015); one place covers every future page under `AppLayout`. `ensureQueryData` keeps the member in TanStack Query, per `CLAUDE.md`. |
| ADR-006: Local Supabase | (a) Supabase CLI local stack (`supabase start`); (b) shared hosted dev project | (a) | Free, offline, resettable; CLI ≥ 2.117 issues asymmetric JWTs so ADR-002 runs unchanged. Hosted project for production. `supabase/config.toml` sets `[auth] enable_signup = false` (FR-008). |
| ADR-007: Handling auth failures from `apiRequest` | (a) `lib/api-client` calls a handler registered in `main.tsx`; (b) `api-client` imports the router | (a) | Keeps `lib/` free of app wiring and testable; `main.tsx` owns `queryClient.clear()` + navigation. |
| ADR-008: Repo layout | (a) `backend/` beside `frontend/`; (b) NestJS at repo root per spec §11 | (a) | `frontend/` already exists; spec §11's tree is applied inside `backend/`. Each app keeps its own `package.json` (pnpm). |
| ADR-009: Valid Supabase user without a `members` row | (a) 403 `MEMBER_NOT_PROVISIONED`; (b) auto-create a `member` row | (a) | Private app — only admins grant access. Prevents a user created in the Supabase dashboard from silently getting in. |

## Security Notes

- **Token storage** — supabase-js keeps the session in `localStorage`; an XSS bug could read it.
  Accepted for V1 (standard SPA trade-off); mitigations: no `dangerouslySetInnerHTML`, React
  escaping, add a CSP when the app is deployed.
- **Open redirect** — `redirectTo` passes through `safeRedirectPath()` only (FR-010).
- **Logging** — the backend logs request id, path, status and `sub`; never the `Authorization`
  header. The frontend logs `AuthError.code` only.
- **Bundle check** — `frontend` build step greps `dist/` for `sb_secret_` and `service_role`; a
  match fails the build (NFR-001).
- **Deactivation** — this slice enforces it in the API on every request. The Members slice's
  deactivate endpoint must also ban the user in Supabase (`ban_duration`) so new sign-ins fail at
  Supabase too, and should end their sessions.
- **Cross-tab sign-out** (FR-019) relies on supabase-js broadcasting auth events across tabs of
  the same origin; T-001's discovery task verifies this and falls back to a `storage` event
  listener if needed.

## Testing Approach

- **Backend unit** — `AuthGuard` with a fake `TokenVerifier` and fake `MembersRepository`
  (public route, missing header, invalid token, no member, deactivated, active, role mismatch);
  `SupabaseJwtVerifier` against a locally generated ES256 key + in-memory JWKS (wrong `iss`,
  wrong `aud`, expired, HS256 rejected); config validation.
- **Backend integration** — `GET /api/v1/me` and `/health` via Supertest against the local
  Supabase stack with a real user created through the bootstrap script.
- **Frontend** — route tests through `renderRoute()` with `@/lib/auth` mocked and `fetch`
  stubbed: redirect to login, return to `redirectTo`, error messages, pending state, sign-out,
  `?reason=` banners; unit tests for `safeRedirectPath()` and `AuthError` mapping.
- **E2E (one happy path)** — Playwright against local Supabase + backend: sign in → dashboard →
  reload stays signed in → sign out.

## Dependencies

- **Supabase (hosted + CLI ≥ 2.117)** — Auth (credentials, tokens, JWKS) and Postgres.
- **`@supabase/supabase-js`** (frontend; backend script only) — sign-in, session persistence,
  refresh, admin user creation.
- **`@nestjs/*` (core, config, swagger)** — backend framework, per spec §3.
- **`jose`** — JWT verification against the remote JWKS.
- **`drizzle-orm`, `drizzle-kit`, `postgres`** — DB access, migrations, RLS policy definitions.
- **`zod`** — env validation (backend) and response/form validation (frontend, already present).
