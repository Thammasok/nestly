# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

Greenfield. No application code, package manifest, or build/test tooling exists yet — the only source of truth is `personal-home-platform-project-spec.md` (read it before any major change). Once the NestJS project is scaffolded, add the real build/lint/test/single-test commands to this file.

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
