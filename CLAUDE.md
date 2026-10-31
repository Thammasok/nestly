# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

Early stage. `personal-home-platform-project-spec.md` is the source of truth (read it before any major change). The `frontend/` SPA is scaffolded; the NestJS backend is not yet — add its commands here once it exists.

## Frontend (`frontend/`)

Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui (radix-nova style, lucide icons), TanStack Router (file-based) + TanStack Query, Zustand, React Hook Form + Zod, Vitest + RTL. Client-only SPA — no SSR/Next.js.

Run from `frontend/`:

- `npm run dev` — dev server on :5173; `/api` is proxied to the backend on :3000
- `npm run build` — `tsc -b && vite build`
- `npm run lint` — oxlint
- `npm run test:run` — all tests once; single file: `npx vitest run src/routes/index.test.tsx`; by name: `npx vitest run -t "<test name>"`
- `npx shadcn@latest add <component>` — adds a primitive to `src/components/ui/`

Conventions:
- Routes are files in `src/routes/`; the router plugin generates `src/routeTree.gen.ts` (committed — `tsc -b` needs it before Vite runs). `*.test.tsx` files in `src/routes/` are ignored by route generation.
- Router context carries the `queryClient`; route loaders should prefetch via TanStack Query rather than hold their own cache.
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
