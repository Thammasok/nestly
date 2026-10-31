# Nestly — frontend

Client-only SPA for the Nestly home platform: Vite, React, TypeScript, Tailwind v4, shadcn/ui, React Router, TanStack Query.

```bash
pnpm install
pnpm dev          # http://localhost:5173 — /api is proxied to the backend on :3000
pnpm build
pnpm lint
pnpm test:run
```

Copy `.env.example` to `.env.local` for local settings. `VITE_` variables are bundled into the client and are public.
