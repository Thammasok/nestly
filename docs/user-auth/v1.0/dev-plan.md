---
version: 1.0
status: active
date: 2026-10-31
requires: design.md
ux-design: ux-design.md
---

# Development Plan: User Authentication (Supabase Login)

## Summary

- **Total tasks** — 11 (9 engineering, 1 test design, 1 test automation)
- **Estimated effort** — ~8.5 agent-days total; ~4.5 days along the critical path with the
  frontend and backend tracks running in parallel
- **Critical path** — T-001 → T-002 → T-003 → T-004 → T-011
- **Parallel tracks**
  - Backend: T-001 → T-002 → T-003 → {T-004, T-005}
  - Frontend: T-006 → T-007 → {T-008, T-009} (mocks `@/lib/auth` and `fetch`; needs no running
    backend until T-011)
  - Test design: T-010 (no dependencies)
- **Review gate** — every task touches authentication or schema, so each one stops at `review`
  for a human before `done` (status legend below).

## Tasks

### T-001 — Set up the local Supabase stack and verify auth assumptions

```yaml
- title: Set up the local Supabase stack and verify auth assumptions
- description: >
  Discovery task for an existing repo (frontend exists, backend does not). Initialise the
  Supabase CLI project at the repo root (supabase/config.toml only — no CLI migrations, per
  design.md ADR-004/ADR-006), turn public sign-up off, and prove the assumptions the design
  relies on before code is built on them: asymmetric (ES256/RS256) access tokens and a JWKS
  endpoint locally (ADR-002), the exact issuer string, and that supabase-js broadcasts
  SIGNED_OUT to other tabs of the same origin (FR-019). Record findings in
  docs/user-auth/v1.0/findings.md.
- agent: software-engineer-backend
- depends_on: []
- status: backlog
- size: S
```

#### Acceptance criteria

- [ ] `supabase/config.toml` committed with `[auth] enable_signup = false`; `signing_keys.json` (if used) is git-ignored
- [ ] `findings.md` records the Supabase CLI version used and that it is ≥ 2.117
- [ ] `findings.md` records that `GET http://127.0.0.1:54321/auth/v1/.well-known/jwks.json` returns ≥ 1 key with `alg` ES256 or RS256, with the response saved
- [ ] `findings.md` records the decoded `iss` and `aud` of a real local access token (decides the `SUPABASE_JWT_ISSUER` default)
- [ ] `findings.md` states yes/no for cross-tab SIGNED_OUT delivery in the pinned supabase-js version, citing source or a manual two-tab check
- [ ] `findings.md` lists the local ports (API, DB, Studio) and the default auth rate limits (NFR-004)

#### Test cases (TDD contract)

```yaml
unit: []  # spike — no production code; findings.md is the deliverable
```

**Notes** — If local JWKS returns no keys, generate one with `supabase gen signing-key` and set
`[auth] signing_keys_path`; if that is impossible, set the task to `blocked` — ADR-002 must be
revisited before T-004.

### T-002 — Bootstrap the NestJS backend foundation

```yaml
- title: Bootstrap the NestJS backend foundation
- description: >
  Create backend/ (pnpm, NestJS, TypeScript strict) using the spec §11 layout inside it
  (design.md §Repository layout, ADR-008). Include only the Phase 0 pieces auth needs:
  Zod-validated env config that fails fast (design.md §Configuration contract), global prefix
  `api` + URI versioning `v1`, global ValidationPipe, the uniform error envelope
  `{ statusCode, code, message }` (design.md §API Contracts), the DatabaseModule (postgres.js +
  Drizzle, DRIZZLE token), drizzle.config.ts pointing at database/migrations/, the public
  `GET /api/v1/health` endpoint (FR-024) and Swagger at /api/docs with bearer auth. Request logs
  must never contain the Authorization header (NFR-002).
- agent: software-engineer-backend
- depends_on: [T-001]
- status: backlog
- size: M
```

#### Acceptance criteria

- [ ] `pnpm start:dev` in `backend/` serves on `PORT` (default 3000) and the frontend's Vite proxy reaches it
- [ ] Startup exits non-zero with a message naming the variable when `DATABASE_URL` or `SUPABASE_URL` is missing or not a URL
- [ ] `GET /api/v1/health` returns `200 {"status":"ok","database":"up"}` with the local stack running and `503 {"status":"error","database":"down"}` when the DB is unreachable
- [ ] An unhandled exception produces `500 {statusCode:500, code:"INTERNAL_ERROR", message}` with no stack trace in the body
- [ ] `/api/docs` renders and declares a bearer security scheme
- [ ] `backend/.env.example` lists every variable in design.md §Configuration contract with local example values and no real secrets
- [ ] `pnpm lint`, `pnpm build` and `pnpm test` pass in `backend/`

#### Test cases (TDD contract)

```yaml
unit:
  - id: TC-U-001
    scenario: Valid env is parsed into typed config
    given: env with PORT, DATABASE_URL, SUPABASE_URL set and SUPABASE_JWT_ISSUER unset
    when: parseConfig(env) is called
    then: returns config with jwtIssuer derived from SUPABASE_URL
    test_data:
      input: { PORT: "3000", DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres", SUPABASE_URL: "http://127.0.0.1:54321" }
      expected: { port: 3000, jwtIssuer: "http://127.0.0.1:54321/auth/v1", jwksUrl: "http://127.0.0.1:54321/auth/v1/.well-known/jwks.json" }
  - id: TC-U-002
    scenario: Explicit issuer overrides the derived one
    given: SUPABASE_JWT_ISSUER is set
    when: parseConfig(env) is called
    then: jwtIssuer equals the explicit value
    test_data:
      input: { SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_JWT_ISSUER: "http://localhost:54321/auth/v1" }
      expected: { jwtIssuer: "http://localhost:54321/auth/v1" }
  - id: TC-U-003
    scenario: Missing required variable fails fast
    given: env without DATABASE_URL
    when: parseConfig(env) is called
    then: throws an error whose message contains "DATABASE_URL"
    test_data:
      input: { SUPABASE_URL: "http://127.0.0.1:54321" }
      expected: Error /DATABASE_URL/
  - id: TC-U-004
    scenario: Health reports database down
    given: a DB client whose `select 1` rejects
    when: HealthController.check() is called
    then: responds 503 with database "down"
    test_data:
      input: db.execute rejects with Error("ECONNREFUSED")
      expected: { status: 503, body: { status: "error", database: "down" } }
  - id: TC-U-005
    scenario: Error filter shapes HttpException with a code
    given: a handler throws UnauthorizedException({ code: "AUTH_REQUIRED", message: "Sign in to continue." })
    when: the global filter handles it
    then: body is the envelope with that code
    test_data:
      input: UnauthorizedException({ code: "AUTH_REQUIRED", message: "Sign in to continue." })
      expected: { statusCode: 401, code: "AUTH_REQUIRED", message: "Sign in to continue." }
```

**Notes** — Swagger and the error filter are cheap now and every later slice needs them. Docker is
out of scope for this slice (requirements.md §Constraints).

### T-003 — Create the members table, RLS policy and repository

```yaml
- title: Create the members table, RLS policy and repository
- description: >
  Add the `members` table, `member_role` / `member_status` enums and the
  "members can read own row" RLS policy exactly as in design.md §Data Model, declared in
  Drizzle (authUsers FK, pgPolicy with authenticatedRole) and generated into
  backend/database/migrations/ with drizzle-kit. Implement MembersRepository.findById(id)
  returning the Member read model (joins auth.users for email and last_sign_in_at) in
  src/modules/members/. Covers FR-025 and NFR-003.
- agent: software-engineer-backend
- depends_on: [T-002]
- status: backlog
- size: M
```

#### Acceptance criteria

- [ ] `pnpm db:generate` produces a committed SQL migration; `pnpm db:migrate` applies it cleanly to a freshly reset local stack
- [ ] The migration enables RLS on `public.members` and creates exactly one policy (SELECT, role `authenticated`, `auth.uid() = id`)
- [ ] With the publishable key and a member's token, selecting `members` returns only that member's row; insert/update/delete are rejected
- [ ] Deleting the `auth.users` row cascades to the `members` row
- [ ] `findById` returns `null` for an unknown id and the full Member shape (ISO dates, `lastSignInAt` null when never signed in) for a known one
- [ ] `backend/package.json` has `db:generate` and `db:migrate` scripts

#### Test cases (TDD contract)

```yaml
unit:
  - id: TC-U-006
    scenario: Repository maps a joined row to the Member read model
    given: a DB row { id, name, role: "admin", status: "active", created_at, email, last_sign_in_at: null }
    when: toMember(row) is called
    then: returns camelCase Member with ISO strings and lastSignInAt null
    test_data:
      input: { id: "6f1c0000-0000-4000-8000-000000000001", name: "Charanchai", role: "admin", status: "active", created_at: "2026-10-31T09:00:00Z", email: "owner@example.com", last_sign_in_at: null }
      expected: { id: "6f1c0000-0000-4000-8000-000000000001", name: "Charanchai", email: "owner@example.com", role: "admin", status: "active", createdAt: "2026-10-31T09:00:00.000Z", lastSignInAt: null }
  - id: TC-U-007
    scenario: Unknown member id
    given: no members row for the id
    when: findById(id) is called against the local DB
    then: resolves to null
    test_data:
      input: "00000000-0000-4000-8000-000000000000"
      expected: null
  - id: TC-U-008
    scenario: RLS hides other members' rows
    given: members A and B exist; a client authenticated as A with the publishable key
    when: select * from members
    then: exactly one row, id = A
    test_data:
      input: tokens for A; rows A and B
      expected: [ { id: A } ]
  - id: TC-U-009
    scenario: Client cannot change own role
    given: a client authenticated as member A (role member)
    when: update members set role = 'admin' where id = A
    then: zero rows updated; A's role is still member
    test_data:
      input: update via publishable key + A's token
      expected: role "member"
```

**Notes** — TC-U-007..009 need the local Supabase stack (component-level). The API itself connects
as `postgres` and bypasses RLS by design (ADR-004); RLS only guards publishable-key access.

### T-004 — Implement JWT verification, guards and GET /api/v1/me

```yaml
- title: Implement JWT verification, guards and GET /api/v1/me
- description: >
  Build AuthModule under src/common/auth/: a TokenVerifier interface and SupabaseJwtVerifier
  using jose createRemoteJWKSet (ADR-002: verify signature, iss, aud "authenticated", exp;
  accept ES256/RS256 only); a global AuthGuard that resolves the member via MembersRepository
  and enforces status (ADR-003, ADR-009); a global RolesGuard with @Roles('admin');
  @Public() and @CurrentMember() decorators; and MeController returning the caller's Member.
  Error codes and messages exactly as design.md §API Contracts. Covers FR-023..FR-028, NFR-002,
  NFR-005.
- agent: software-engineer-backend
- depends_on: [T-003]
- status: backlog
- size: L
```

#### Acceptance criteria

- [ ] Every route is protected unless decorated `@Public()`; `/api/v1/health` stays public
- [ ] Missing or non-Bearer `Authorization` → `401 AUTH_REQUIRED`
- [ ] Bad signature, wrong `iss`, wrong `aud`, expired token, unknown `kid` or HS256 token → `401 AUTH_INVALID_TOKEN`
- [ ] Valid token with no `members` row → `403 MEMBER_NOT_PROVISIONED`; deactivated member → `403 MEMBER_DEACTIVATED`
- [ ] `@Roles('admin')` route called by a `member` → `403 FORBIDDEN_ROLE`
- [ ] `GET /api/v1/me` with a valid active member's token returns `200` and the Member shape in design.md, documented in Swagger
- [ ] Role and status are never read from token claims (code review check: no use of `user_metadata` / `app_metadata`)
- [ ] Verification of a valid token with warm JWKS cache takes < 5 ms p95 over 1,000 iterations (micro-benchmark output attached)
- [ ] No log line contains the raw token (a test asserts the logger never receives the Authorization value)

#### Test cases (TDD contract)

```yaml
unit:
  - id: TC-U-010
    scenario: Valid ES256 token verifies
    given: an in-memory JWKS holding an ES256 public key; token signed with its private key, iss = config issuer, aud = "authenticated", exp = now + 1h
    when: verifier.verify(token)
    then: resolves with claims.sub
    test_data:
      input: { sub: "6f1c0000-0000-4000-8000-000000000001", aud: "authenticated", iss: "http://127.0.0.1:54321/auth/v1" }
      expected: { sub: "6f1c0000-0000-4000-8000-000000000001" }
  - id: TC-U-011
    scenario: Expired token rejected
    given: token with exp = now - 1s
    when: verifier.verify(token)
    then: throws InvalidTokenError
    test_data:
      input: exp = now - 1
      expected: InvalidTokenError
  - id: TC-U-012
    scenario: Wrong audience rejected
    given: token with aud = "anon"
    when: verifier.verify(token)
    then: throws InvalidTokenError
    test_data:
      input: aud "anon"
      expected: InvalidTokenError
  - id: TC-U-013
    scenario: Wrong issuer rejected
    given: token with iss = "https://evil.example/auth/v1"
    when: verifier.verify(token)
    then: throws InvalidTokenError
    test_data:
      input: iss "https://evil.example/auth/v1"
      expected: InvalidTokenError
  - id: TC-U-014
    scenario: HS256 token rejected even with a matching secret
    given: token signed HS256
    when: verifier.verify(token)
    then: throws InvalidTokenError
    test_data:
      input: alg HS256
      expected: InvalidTokenError
  - id: TC-U-015
    scenario: Public route skips verification
    given: handler decorated @Public(); no Authorization header
    when: AuthGuard.canActivate(ctx)
    then: returns true and the verifier is not called
    test_data:
      input: headers {}
      expected: true; verifier.verify call count 0
  - id: TC-U-016
    scenario: Missing header on protected route
    given: protected handler; no Authorization header
    when: AuthGuard.canActivate(ctx)
    then: throws 401 AUTH_REQUIRED
    test_data:
      input: headers {}
      expected: { statusCode: 401, code: "AUTH_REQUIRED" }
  - id: TC-U-017
    scenario: Non-Bearer scheme
    given: Authorization "Basic abc"
    when: AuthGuard.canActivate(ctx)
    then: throws 401 AUTH_REQUIRED
    test_data:
      input: "Basic abc"
      expected: { statusCode: 401, code: "AUTH_REQUIRED" }
  - id: TC-U-018
    scenario: Verifier rejects the token
    given: fake verifier throws InvalidTokenError
    when: AuthGuard.canActivate(ctx)
    then: throws 401 AUTH_INVALID_TOKEN
    test_data:
      input: "Bearer bad.token.value"
      expected: { statusCode: 401, code: "AUTH_INVALID_TOKEN" }
  - id: TC-U-019
    scenario: Valid token, no member row
    given: verifier returns sub X; repository.findById(X) returns null
    when: AuthGuard.canActivate(ctx)
    then: throws 403 MEMBER_NOT_PROVISIONED
    test_data:
      input: sub "6f1c0000-0000-4000-8000-000000000009"
      expected: { statusCode: 403, code: "MEMBER_NOT_PROVISIONED" }
  - id: TC-U-020
    scenario: Deactivated member
    given: repository returns member with status "deactivated"
    when: AuthGuard.canActivate(ctx)
    then: throws 403 MEMBER_DEACTIVATED
    test_data:
      input: { status: "deactivated" }
      expected: { statusCode: 403, code: "MEMBER_DEACTIVATED" }
  - id: TC-U-021
    scenario: Active member attached to request
    given: repository returns active member M
    when: AuthGuard.canActivate(ctx)
    then: returns true and request.member equals M
    test_data:
      input: { id: "6f1c…01", role: "member", status: "active" }
      expected: true; request.member.id "6f1c…01"
  - id: TC-U-022
    scenario: Role guard blocks non-admin
    given: handler @Roles('admin'); request.member.role = "member"
    when: RolesGuard.canActivate(ctx)
    then: throws 403 FORBIDDEN_ROLE
    test_data:
      input: role "member"
      expected: { statusCode: 403, code: "FORBIDDEN_ROLE" }
  - id: TC-U-023
    scenario: Role guard allows admin and routes without @Roles
    given: (a) @Roles('admin') with role admin; (b) no @Roles with role member
    when: RolesGuard.canActivate(ctx)
    then: returns true in both cases
    test_data:
      input: [ { roles: ["admin"], role: "admin" }, { roles: undefined, role: "member" } ]
      expected: [ true, true ]
  - id: TC-U-024
    scenario: /me returns the current member
    given: request.member = M (active admin)
    when: MeController.get()
    then: returns M unchanged
    test_data:
      input: { id: "6f1c…01", name: "Charanchai", email: "owner@example.com", role: "admin", status: "active", createdAt: "2026-10-31T09:00:00.000Z", lastSignInAt: null }
      expected: same object
```

**Notes** — Use jose's `generateKeyPair('ES256')` + `createLocalJWKSet` in unit tests so no
network is touched; production uses `createRemoteJWKSet(new URL(config.jwksUrl))`. Don't add a
JWKS cache beyond jose's own (design.md ADR-002, key rotation).

### T-005 — Add the first-admin bootstrap script and setup docs

```yaml
- title: Add the first-admin bootstrap script and setup docs
- description: >
  Implement backend/scripts/create-admin.ts (pnpm admin:create --email --name, password read
  from a prompt or ADMIN_PASSWORD env, never a CLI arg) that idempotently creates or updates the
  Supabase user via the admin API with email_confirm true and upserts a members row with role
  admin and status active (FR-029, design.md ADR-009). Document local and hosted setup in
  backend/README.md (supabase start, env files, migrate, create admin, run both apps, auth
  rate limits and session lifetimes per NFR-004/NFR-010) and add the backend commands to the
  root CLAUDE.md.
- agent: software-engineer-backend
- depends_on: [T-003]
- status: backlog
- size: S
```

#### Acceptance criteria

- [ ] On a freshly reset local stack, following `backend/README.md` step by step ends with a working admin sign-in
- [ ] Running the script twice with the same email leaves exactly one `auth.users` row and one `members` row (role `admin`, status `active`)
- [ ] Running it for an existing `member` promotes them to `admin` and re-activates them
- [ ] The script exits non-zero with a clear message when `SUPABASE_SECRET_KEY` is missing
- [ ] The password never appears in process arguments, logs or shell history (accepted only via prompt / env)
- [ ] `CLAUDE.md` "Repository state" no longer says the backend isn't scaffolded and lists the backend commands

#### Test cases (TDD contract)

```yaml
unit:
  - id: TC-U-025
    scenario: Argument parsing requires email and name
    given: argv without --name
    when: parseArgs(argv)
    then: throws a usage error mentioning --name
    test_data:
      input: ["--email", "owner@example.com"]
      expected: Error /--name/
  - id: TC-U-026
    scenario: Existing auth user is reused, not duplicated
    given: a fake admin client whose user lookup returns an existing user U
    when: createAdmin({ email, name, password })
    then: updateUserById(U.id, { password }) is called; createUser is not; members upsert gets { id: U.id, role: "admin", status: "active" }
    test_data:
      input: { email: "owner@example.com", name: "Charanchai", password: "S3cure-pass!" }
      expected: createUser calls 0; upsert { id: U.id, role: "admin", status: "active" }
  - id: TC-U-027
    scenario: New user created confirmed
    given: lookup returns no user
    when: createAdmin(...)
    then: createUser is called with email_confirm true
    test_data:
      input: { email: "new@example.com", name: "New Admin", password: "S3cure-pass!" }
      expected: createUser({ email: "new@example.com", password: "S3cure-pass!", email_confirm: true })
```

### T-006 — Add the Supabase auth facade and authenticated API client

```yaml
- title: Add the Supabase auth facade and authenticated API client
- description: >
  Frontend foundation (design.md §Components → Frontend). Add @supabase/supabase-js and create
  src/lib/auth.ts — the only module importing it (NFR-008) — exposing signInWithPassword,
  signOut, getAccessToken, hasSession and onSessionEnded, and mapping AuthError to
  SignInError kinds (design.md §Supabase Auth). Add src/lib/safe-redirect.ts (FR-010). Change
  src/lib/api-client.ts to send the Bearer token (FR-020), carry `code` on ApiError, and call a
  registered onAuthFailure handler for 401 and for 403 MEMBER_DEACTIVATED /
  MEMBER_NOT_PROVISIONED (ADR-007, FR-021, FR-022). Add VITE_SUPABASE_URL and
  VITE_SUPABASE_PUBLISHABLE_KEY to .env.example and a post-build check that fails if dist/
  contains `sb_secret_` or `service_role` (NFR-001).
- agent: react-vite-developer
- depends_on: []
- status: backlog
- size: M
```

#### Acceptance criteria

- [ ] `@supabase/supabase-js` is imported only in `src/lib/auth.ts` (oxlint `no-restricted-imports` rule or a test enforces it)
- [ ] `apiRequest` sends `Authorization: Bearer <token>` when a session exists and no Authorization header when it doesn't
- [ ] `ApiError` exposes `status` and `code` (code `undefined` when the body has none)
- [ ] `onAuthFailure` is invoked with `'session-expired'` on 401, `'deactivated'` / `'not-provisioned'` on the matching 403 codes, and not on `403 FORBIDDEN_ROLE`
- [ ] `pnpm build` fails when a file in `dist/` contains `sb_secret_` (verified by a temporary planted string, then removed)
- [ ] The password is never passed to `console.*` (test spies on console during a failed sign-in)
- [ ] `pnpm lint`, `pnpm build`, `pnpm test:run` pass

#### Test cases (TDD contract)

```yaml
unit:
  - id: TC-U-028
    scenario: Same-origin relative path is kept
    given: a redirect value
    when: safeRedirectPath(value)
    then: returns it unchanged
    test_data:
      input: "/settings?tab=members"
      expected: "/settings?tab=members"
  - id: TC-U-029
    scenario: Unsafe redirect values fall back to root
    given: absolute, protocol-relative, scheme, backslash, empty or null values
    when: safeRedirectPath(value)
    then: returns "/"
    test_data:
      input: ["https://evil.example", "//evil.example", "javascript:alert(1)", "/\\evil.example", "", null, "settings"]
      expected: "/" for every input
  - id: TC-U-030
    scenario: AuthError mapping
    given: errors from supabase-js
    when: toSignInError(error)
    then: maps to the SignInError kind
    test_data:
      input: [ { code: "invalid_credentials", status: 400 }, { code: "over_request_rate_limit", status: 429 }, { status: 429 }, { name: "AuthRetryableFetchError", status: 0 }, { code: "unexpected_failure", status: 500 } ]
      expected: [ "invalid_credentials", "rate_limited", "rate_limited", "unreachable", "unknown" ]
  - id: TC-U-031
    scenario: Bearer header attached
    given: getAccessToken resolves "tok123"; fetch stubbed to 200 {}
    when: apiRequest('/v1/me', schema)
    then: fetch called with headers.Authorization "Bearer tok123"
    test_data:
      input: token "tok123"
      expected: Authorization "Bearer tok123"
  - id: TC-U-032
    scenario: No session, no header
    given: getAccessToken resolves null
    when: apiRequest('/v1/health', schema)
    then: request has no Authorization header
    test_data:
      input: token null
      expected: Authorization absent
  - id: TC-U-033
    scenario: 401 triggers auth failure handler
    given: handler registered; fetch → 401 { code: "AUTH_INVALID_TOKEN", message: "…" }
    when: apiRequest(...)
    then: handler called once with "session-expired"; ApiError(401, code "AUTH_INVALID_TOKEN") thrown
    test_data:
      input: status 401
      expected: handler("session-expired"); ApiError.status 401
  - id: TC-U-034
    scenario: 403 deactivated vs forbidden role
    given: handler registered
    when: apiRequest gets 403 MEMBER_DEACTIVATED, then 403 FORBIDDEN_ROLE
    then: handler("deactivated") for the first; handler not called for the second; both throw ApiError with their code
    test_data:
      input: [ { status: 403, code: "MEMBER_DEACTIVATED" }, { status: 403, code: "FORBIDDEN_ROLE" } ]
      expected: [ handler("deactivated"), no handler call ]
```

**Notes** — Keep the existing `status 0 = backend unreachable` behaviour. The Supabase client
uses default `persistSession` / `autoRefreshToken` (FR-011). Apply T-001's finding on cross-tab
events inside `onSessionEnded` (storage-event fallback if needed).

### T-007 — Protect app routes and wire session lifecycle

```yaml
- title: Protect app routes and wire session lifecycle
- description: >
  Add src/features/auth/{api.ts, queries.ts, loaders.ts}: meSchema + fetchMe, meQueryOptions
  (['auth','me']), useSignIn (Supabase sign-in → /me → cache; signs out again on 403 member
  errors), useSignOut; requireMember and redirectIfSignedIn loaders (ADR-005). Wrap AppLayout
  in src/router.tsx with a protected pathless route (loader requireMember, HydrateFallback =
  new src/components/layout/full-screen-loader.tsx per ux-design.md §Session restore) and give
  /login the redirectIfSignedIn loader. In main.tsx register onAuthFailure and onSessionEnded →
  queryClient.clear() + router.navigate to /login with redirectTo / reason. Covers FR-009,
  FR-011..FR-016, FR-018, FR-019, FR-021.
- agent: react-vite-developer
- depends_on: [T-006]
- status: backlog
- size: M
```

#### Acceptance criteria

- [ ] Visiting `/` or `/settings?tab=members` without a session lands on `/login?redirectTo=%2Fsettings%3Ftab%3Dmembers` and never renders protected content
- [ ] With a stored session and `/me` → 200, a protected route renders and the full-screen loader is shown until then (never the login page)
- [ ] Visiting `/login` with a valid session redirects to `/`
- [ ] `/me` → 403 `MEMBER_DEACTIVATED` during the protected loader signs out and lands on `/login?reason=deactivated`
- [ ] A session-ended event clears the TanStack Query cache and navigates to `/login` within 2 s
- [ ] The not-found route renders without a session
- [ ] Existing route tests (`dashboard`, `settings`, `not-found`) still pass, updated to provide a signed-in fake session

#### Test cases (TDD contract)

```yaml
unit:
  - id: TC-U-035
    scenario: Signed-out user is redirected with the original location
    given: auth mock hasSession → false
    when: renderRoute('/settings?tab=members')
    then: login heading shown; location is /login?redirectTo=%2Fsettings%3Ftab%3Dmembers; "Settings" page heading absent
    test_data:
      input: "/settings?tab=members"
      expected: pathname "/login", search "?redirectTo=%2Fsettings%3Ftab%3Dmembers"
  - id: TC-U-036
    scenario: Signed-in active member reaches the page
    given: hasSession → true; fetch /api/v1/me → 200 active member
    when: renderRoute('/')
    then: Dashboard renders inside the sidebar shell
    test_data:
      input: me { name: "Charanchai", role: "admin", status: "active" }
      expected: heading "Dashboard" visible
  - id: TC-U-037
    scenario: Loader shows full-screen loader while /me is pending
    given: hasSession → true; /me never resolves
    when: renderRoute('/')
    then: role="status" "Loading Nestly…" visible; login form and dashboard absent
    test_data:
      input: pending promise
      expected: status element present
  - id: TC-U-038
    scenario: Signed-in user visiting /login
    given: hasSession → true; /me → 200
    when: renderRoute('/login')
    then: navigates to "/"
    test_data:
      input: "/login"
      expected: pathname "/"
  - id: TC-U-039
    scenario: Deactivated member during route load
    given: hasSession → true; /me → 403 MEMBER_DEACTIVATED
    when: renderRoute('/')
    then: auth.signOut called once; location /login?reason=deactivated
    test_data:
      input: 403 { code: "MEMBER_DEACTIVATED" }
      expected: search "?reason=deactivated"
  - id: TC-U-040
    scenario: Session ended elsewhere
    given: signed-in on "/settings"; the onSessionEnded callback fires
    when: callback runs
    then: queryClient cache is empty; location /login
    test_data:
      input: SIGNED_OUT event
      expected: queryClient.getQueryCache().getAll().length 0; pathname "/login"
  - id: TC-U-041
    scenario: useSignOut clears state
    given: signed in with cached me
    when: signOut mutation runs
    then: auth.signOut called; cache cleared; navigates to /login with no reason param
    test_data:
      input: none
      expected: pathname "/login", search ""
```

**Notes** — Add a `renderRoute` option (e.g. `{ session: 'signed-in' | 'signed-out', me }`) in
`src/test/render-route.tsx` so other features' route tests stay one-liners.

### T-008 — Make the login form interactive per the UX spec

```yaml
- title: Make the login form interactive per the UX spec
- description: >
  Rework src/features/auth/components/login-form.tsx exactly per ux-design.md §Login
  (all states: default, field errors, submitting, credential/service error, ?reason= banners,
  forgot-password hint) using React Hook Form + Zod and useSignIn from T-007. Add the shadcn
  alert and spinner primitives. Remove the Terms/Privacy line, rename the button "Sign in",
  navigate to safeRedirectPath(redirectTo) on success. Covers FR-001..FR-008, FR-010, FR-022,
  NFR-007.
- agent: react-vite-developer
- depends_on: [T-007]
- status: backlog
- size: M
```

#### Acceptance criteria

- [ ] All six login states in ux-design.md render with the specified components, copy and ARIA attributes
- [ ] Submitting twice quickly results in exactly one `signInWithPassword` call
- [ ] After a credential error the email is kept, the password is cleared and focused, and the alert has `role="alert"`
- [ ] Successful sign-in with `?redirectTo=/settings` lands on `/settings`; with `?redirectTo=https://evil.example` lands on `/`
- [ ] Each `?reason=` value shows the banner from the ux-design.md table; unknown values show none
- [ ] Light-mode destructive alert text contrast is measured and ≥ 4.5:1 (switch the alert to `bg-card` if not), result noted in the PR
- [ ] Keyboard-only run-through (Tab order Email → Forgot password? → Password → Sign in, Enter submits) works
- [ ] The existing `login.test.tsx` is updated for the new copy and passes

#### Test cases (TDD contract)

```yaml
unit:
  - id: TC-U-042
    scenario: Empty submit shows both field errors and focuses email
    given: empty form
    when: user clicks "Sign in"
    then: "Enter a valid email address." and "Enter your password." shown; email input focused; signInWithPassword not called
    test_data:
      input: { email: "", password: "" }
      expected: 2 field errors; calls 0
  - id: TC-U-043
    scenario: Malformed email
    given: email "charan@"
    when: submit with password "x"
    then: email field aria-invalid="true" and describedby points at its error
    test_data:
      input: { email: "charan@", password: "x" }
      expected: "Enter a valid email address."
  - id: TC-U-044
    scenario: Pending state
    given: signInWithPassword returns a pending promise
    when: user submits valid credentials
    then: button disabled, aria-busy="true", text "Signing in…"; second click makes no new call
    test_data:
      input: { email: "owner@example.com", password: "S3cure-pass!" }
      expected: calls 1
  - id: TC-U-045
    scenario: Invalid credentials
    given: signInWithPassword rejects with kind invalid_credentials
    when: user submits
    then: alert "Incorrect email or password."; email kept; password empty and focused
    test_data:
      input: { email: "owner@example.com", password: "wrong" }
      expected: alert text "Incorrect email or password."
  - id: TC-U-046
    scenario: Rate-limited and unreachable messages
    given: kinds rate_limited, unreachable
    when: user submits each time
    then: the matching copy from ux-design.md is shown
    test_data:
      input: [ "rate_limited", "unreachable" ]
      expected: [ "Too many sign-in attempts. Wait a moment and try again.", "Couldn't reach the sign-in service. Check your connection and try again." ]
  - id: TC-U-047
    scenario: Success honours a safe redirectTo
    given: sign-in ok; /me → 200 active
    when: user submits on /login?redirectTo=%2Fsettings
    then: location "/settings"
    test_data:
      input: redirectTo "/settings"
      expected: pathname "/settings"
  - id: TC-U-048
    scenario: Deactivated member at sign-in
    given: sign-in ok; /me → 403 MEMBER_DEACTIVATED
    when: user submits
    then: signOut called; banner "Your account has been deactivated." visible
    test_data:
      input: 403 MEMBER_DEACTIVATED
      expected: banner title "Your account has been deactivated."
  - id: TC-U-049
    scenario: Reason banner from URL
    given: /login?reason=session-expired
    when: page renders
    then: neutral alert "Your session has expired." shown; it disappears once a sign-in attempt starts
    test_data:
      input: "?reason=session-expired"
      expected: alert title "Your session has expired."
  - id: TC-U-050
    scenario: Forgot password hint toggles
    given: login page
    when: user clicks "Forgot password?"
    then: aria-expanded="true" and hint text "Ask your household admin to reset your password from Settings → Members." visible; no network call
    test_data:
      input: click
      expected: hint visible; fetch calls 0
```

### T-009 — Add the user menu with sign-out to the sidebar

```yaml
- title: Add the user menu with sign-out to the sidebar
- description: >
  Create src/features/auth/components/user-menu.tsx per ux-design.md §User menu (avatar
  initials, name, email, dropdown with "Sign out" via useSignOut) and render it in
  AppSidebar's footer after Settings. Add the shadcn avatar primitive. Covers FR-017, FR-018.
- agent: react-vite-developer
- depends_on: [T-007]
- status: backlog
- size: S
```

#### Acceptance criteria

- [ ] The sidebar footer shows the cached member's name and email; collapsed mode shows only the avatar with a name tooltip
- [ ] The trigger's accessible name is "Account menu for {name}"
- [ ] Choosing "Sign out" ends the session and lands on `/login` without a banner
- [ ] Keyboard: Enter opens the menu, Enter on "Sign out" signs out, Esc closes and refocuses the trigger

#### Test cases (TDD contract)

```yaml
unit:
  - id: TC-U-051
    scenario: Initials from name
    given: member names
    when: getInitials(name, email)
    then: first letters of the first two words, uppercased; falls back to email's first letter
    test_data:
      input: [ ["Charanchai Nutz", "c@x.com"], ["charanchai", "c@x.com"], ["  ", "owner@example.com"] ]
      expected: [ "CN", "C", "O" ]
  - id: TC-U-052
    scenario: Menu shows identity
    given: signed-in route with me { name: "Charanchai Nutz", email: "owner@example.com" }
    when: renderRoute('/')
    then: footer contains "Charanchai Nutz" and "owner@example.com"
    test_data:
      input: me as above
      expected: both texts visible
  - id: TC-U-053
    scenario: Sign out from the menu
    given: signed-in route
    when: user opens "Account menu for Charanchai Nutz" and selects "Sign out"
    then: auth.signOut called once; pathname "/login"; no alert shown
    test_data:
      input: click sequence
      expected: signOut calls 1; pathname "/login"
```

### T-010 — Design test cases — user authentication

```yaml
- title: Design test cases — user authentication
- description: >
  Using the software-tester-design skill, produce structured TC-xxx test cases covering all
  test levels: unit boundaries, API (happy path + error paths + auth for /api/v1/me and
  /api/v1/health, every error code in design.md §API Contracts), frontend component (all
  ux-design.md states), and E2E flows (sign in → dashboard → reload → sign out; protected
  deep link → login → back; deactivated member). Run Steps 0–4 (SUT definition → business flow
  → field specs → scenarios → test data). Include security cases: open redirect values,
  RLS isolation, secret-key bundle check, token not logged. Output must be in TC-xxx format for
  software-tester-automation. Save to docs/user-auth/v1.0/test-cases.md.
- agent: software-tester-design
- depends_on: []
- status: backlog
- size: M
```

#### Acceptance criteria

- [ ] SUT definition documented
- [ ] TC-xxx cases cover happy path, boundaries, error paths, and business rules
- [ ] Each TC includes Level, Input, Expected Output, Preconditions, and Mock needed
- [ ] Every FR-001..FR-029 and NFR-001..NFR-003, NFR-007 maps to ≥ 1 TC (traceability table)

**Notes** — Runs in parallel with engineering tasks; depends only on requirements/design, not on
code. TC-U-001..053 above are the engineers' TDD contract; this task adds the cross-level and
E2E cases and must not renumber them.

### T-011 — Automate tests — user authentication

```yaml
- title: Automate tests — user authentication
- description: >
  Using the software-tester-automation skill, convert the TC-xxx cases from T-010 into
  runnable scripts at the appropriate levels: backend unit/component (Vitest or Jest per T-002's
  choice, local Supabase for RLS/repository cases), API (Supertest or Bruno against the local
  stack), frontend component (Vitest + RTL via renderRoute), and E2E (Playwright — add it to
  frontend/ devDependencies; seed users with the T-005 script). Run the full suite against the
  implementation.
- agent: software-tester-automation
- depends_on: [T-001, T-002, T-003, T-004, T-005, T-006, T-007, T-008, T-009, T-010]
- status: backlog
- size: L
```

#### Acceptance criteria

- [ ] All TC-* from T-010 automated and passing
- [ ] Coverage >= 80% lines on `backend/src/common/auth/`, `backend/src/modules/members/`, `frontend/src/lib/auth.ts`, `frontend/src/lib/api-client.ts` and `frontend/src/features/auth/`
- [ ] Test report produced with pass/fail per TC-id
- [ ] E2E suite runs with one command from a clean checkout (documented in `backend/README.md`)

**Notes** — Report "T-011 done" with the full test report when all TCs pass. E2E needs the local
Supabase stack, migrations, a seeded admin plus a deactivated member, the backend on :3000 and
the frontend on :5173.

## Status Legend

| Status | Changed By | Meaning |
|--------|-----------|---------|
| `backlog` | Orchestrator | Ready, waiting to be picked up |
| `doing` | Orchestrator / Agent | Agent actively working |
| `blocked` | Agent | Stuck, needs human intervention |
| `test` | Agent | Dev done, needs testing |
| `review` | Agent / Tester | Human must review before advancing |
| `done` | Human | Approved and complete |
