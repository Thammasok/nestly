# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

Early stage. `personal-home-platform-project-spec.md` is the source of truth (read it before any major change). The `frontend/` SPA is scaffolded; the NestJS backend is not yet — add its commands here once it exists.

## Frontend (`frontend/`)

Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui (radix-nova style, lucide icons), React Router v8 (data mode) + TanStack Query, Zustand, React Hook Form + Zod, Vitest + RTL. Client-only SPA — no SSR/Next.js.

Run from `frontend/` with **pnpm** (the only lockfile is `pnpm-lock.yaml`; don't use npm/yarn):

- `pnpm dev` — dev server on :5173; `/api` is proxied to the backend on :3000
- `pnpm build` — `tsc -b && vite build`
- `pnpm lint` — oxlint
- `pnpm test:run` — all tests once; single file: `pnpm vitest run src/routes/login.test.tsx`; by name: `pnpm vitest run -t "<test name>"`
- `pnpm dlx shadcn@latest add <component>` — adds a primitive to `src/components/ui/` (blocks also drop files in `src/components/`; move them per the layout below)

Conventions:
- Routes are declared in one place, `src/router.tsx` (`createBrowserRouter`), each lazy-loading a page component from `src/routes/`. Pages that need the sidebar are children of the pathless `AppLayout` route; full-screen pages (e.g. `/login`) sit beside it. v8 note: `RouterProvider` is imported from `react-router/dom`, everything else from `react-router`; there is no `react-router-dom`.
- Route tests render the real route table via `renderRoute(path)` from `src/test/render-route.tsx` (memory router). Server state still belongs in TanStack Query, not in route loaders' own caches.
- Use `Link`/`NavLink` from `react-router` for in-app navigation, not `<a href>`.
- `src/components/` holds only `ui/` (shadcn primitives, edit freely), `layout/` (app shell, sidebar, nav) and `brand/` (logo). Domain UI such as the login form lives in `src/features/<domain>/components/`.
- Backend calls go through `apiRequest(path, zodSchema, init)` in `src/lib/api-client.ts` (prefixes `/api`, validates the response, throws `ApiError` with `status`; status 0 = backend unreachable). The frontend assumes a Members API (not yet built): `GET/POST /api/v1/members` (member = `{ id, name, email, role: 'admin'|'member', status: 'active'|'deactivated', createdAt, lastSignInAt|null }`; 409 on duplicate email), `GET /api/v1/members/:id/activity` (`[{ id, at, description }]`), `POST /api/v1/members/:id/reset-password` with `{ password }` (admin sets the new password directly via the Supabase admin API — no email link) and `POST /api/v1/members/:id/deactivate` (returns the member). All must run server-side with the Supabase service key. Member reads are currently served from `src/features/members/static-members.ts`.
- The Food inventory page (`/food/inventory`) likewise assumes an Inventory API (not yet built): `GET /api/v1/inventory` returns lots joined with their food item (`{ id, foodItemId, foodName, category|null, unit, quantity, location: 'refrigerator'|'freezer'|'pantry'|'other', purchasedAt|null, expirationDate|null (YYYY-MM-DD), createdAt, updatedAt }`, no status field); `POST /api/v1/inventory` with `{ foodName, quantity, unit, location, expirationDate|null }` (backend finds or creates the food item by name, case-insensitive); `POST /api/v1/inventory/:id/consume` and `/discard` with `{ quantity }` (each writes a `food_transactions` row atomically and returns the lot). Reads are served from `src/features/food/static-inventory.ts` (dates relative to today). Expiry status and FEFO live in `src/features/food/inventory-rules.ts` and are always derived on the client, never stored.
- Feature code goes in `src/features/<domain>/` (api.ts with Zod schemas → queries.ts → components/); features don't import from each other. All file names kebab-case.
- `cn()` comes from shadcn's `cn` package (re-exported by `src/lib/utils.ts`), not clsx/tailwind-merge.
- Theme tokens live in `src/index.css` (shadcn CSS variables mapped via `@theme inline`); use semantic classes (`bg-background`, `text-muted-foreground`), not raw palette colours.
- Only `VITE_`-prefixed env vars reach the client and they are public — never put Supabase service keys or Panasonic credentials there.

`.claude/skills/` holds project-specific skills (solution-planner, orchestrator, backend, tester, etc.) and `.claude/knowledges/` holds shared engineering-practice references (TDD, test pyramid, interface-first, migration workflow, conventional commits…) those skills draw on.

## What is being built

"Nestly" — a personal home management platform with three domains:

- **Climate** — control/monitor a Panasonic CS-XU9XKT AC via Panasonic Comfort Cloud (unofficial/community client; automatic data).
- **Food** — manually entered fridge/freezer/pantry inventory.
- **Electricity** — manually entered bills and meter readings.

Stack: Node.js + TypeScript, NestJS (business logic, integrations, polling, scheduler, validation, authorization), Supabase (managed Postgres, Auth, Realtime, optional Storage), Swagger/OpenAPI, Docker. Pick one ORM/DB-access approach and keep migrations consistent with it.

## Architecture rules (from the spec)

- **Modular monolith.** No microservices, Kubernetes, Redis, or event bus unless a real requirement appears. Domain modules live under `src/modules/{climate,food,electricity,automations,notifications}`; shared concerns under `src/infrastructure/` and `src/common/`; migrations under `database/migrations/`.
- **Domain separation.** Keep Climate/Food/Electricity logic in their own modules — no generic household CRUD module. Domains share only auth, API conventions, DB, notifications, and dashboard infra.
- **Vendor isolation.** Business logic depends on a `ClimateAdapter` interface and a canonical `SmartDevice` model; Panasonic is one implementation under `climate/integrations/panasonic/`. Never leak Panasonic types into general logic.
- **Commands are async.** An accepted device command ≠ device changed state. Persist command status in `device_commands` and verify resulting state where possible.
- **External data may be stale.** Store provider timestamp separately from DB-received timestamp; keep last known state and a stale indicator.
- **Energy:** label readings `actual` vs `estimated`; never present averaged/extrapolated power as measured. Device (AC) energy is separate from whole-home electricity; only compare them over aligned periods.
- **Food inventory:** `food_items` (definitions) are separate from `food_inventory` (physical lots with quantity/location/expiry). Every quantity change writes a `food_transactions` row (add/consume/discard/adjustment) in the same DB transaction. Recommend consumption via FEFO. Compute expiration status from current date + expiry + remaining quantity — don't persist a status that goes stale.
- **Automation (later phase):** rule-based only (no AI in V1); needs duplicate-execution protection, retry policy, execution history, and loop guards.
- **Security:** RLS on all user-owned tables. Panasonic credentials and Supabase service keys are server-side only. Device commands must go through NestJS — the frontend must not bypass backend validation.
- **API:** REST under `/api/v1/...` (endpoint tables in spec §5.4, §6.6, §7.4).
- **V1 scope limits:** no barcode/OCR/AI for food; no tariff breakdown for bills.

## Delivery order

Phase 0 foundation (NestJS, env config, Supabase connection, migration workflow, health check, Swagger, Docker) → **Phase 1 Panasonic connectivity POC as an isolated module** (login, discover device, read status, send commands, energy history) → Climate V1 → Food V1 → Electricity V1 → Automation → Unified dashboard.

Do not build the full Climate API until the Panasonic POC succeeds; it is the highest technical risk. Document assumptions whenever a Panasonic API or device capability can't be verified.

## Testing priorities

Automated tests are required for: food quantity changes, inventory transactions, FEFO selection, expiration calculations, and automation duplicate prevention.
