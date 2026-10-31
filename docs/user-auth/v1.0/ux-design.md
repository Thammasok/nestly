---
version: 1.0
status: approved
date: 2026-10-31
requires: design.md
---

# UX/UI Design: User Authentication (Supabase Login)

**Design source.** `.claude/design/` does not exist in this repo, so the baseline is the shipped
code: `frontend/src/features/auth/components/login-form.tsx` (layout, copy, logo), the shadcn
primitives in `frontend/src/components/ui/`, and the theme tokens in `frontend/src/index.css`
(black primary button in light mode, mint primary in dark mode, `--radius: 1rem`). No new colours,
radii or tokens are introduced.

**New shadcn primitives to add** (`pnpm dlx shadcn@latest add alert spinner avatar`): `Alert`
(form-level error and `?reason=` banners), `Spinner` (pending button + session-restore loader),
`Avatar` (user menu). `DropdownMenu`, `Field*`, `Input`, `Button`, `Sidebar*`, `Tooltip` already
exist.

## Screens in Scope

- **Login** — `/login`; the existing card-less centred form, now interactive: validation, pending,
  error, reason banners and a forgot-password hint (FR-001..FR-008, FR-022).
- **Session restore** — full-screen loader shown as the protected route's `HydrateFallback` while
  the stored session and `/me` resolve (FR-012).
- **User menu** — sidebar footer block with the member's name/email and "Sign out", in expanded
  and icon-collapsed sidebar states (FR-017, FR-018).

## Lo-fi Wireframes

### Login — default

```
┌──────────────────────────────────────────────┐
│                                              │
│                 [ Nestly logo ]              │
│              Welcome to Nestly               │   <h1>
│  Private access only. Sign in with your      │
│  account.                                    │
│                                              │
│  Email                                       │
│  [ m@example.com                          ]  │
│                                              │
│  Password                 Forgot password?   │   ← link-style button (toggles hint)
│  [ ••••••••                               ]  │
│                                              │
│  [               Sign in                  ]  │   ← primary, full width
│                                              │
└──────────────────────────────────────────────┘
        max-w-sm column, vertically centred
```

- **Layout notes** — Keeps the current page (`routes/login.tsx`) and header block unchanged. The
  Terms/Privacy footer line is removed (OQ-001). Button label changes from "Login" to "Sign in"
  to match "Sign out" in the sidebar.
- **User flow** — Type email → Tab → password → Enter or click Sign in.
- **Annotations** — Email field gets autofocus on first render (desktop only, see Accessibility).

### Login — field validation error (FR-001)

```
│  Email                                       │
│  [ charan@                                ]  │   ← aria-invalid, destructive ring
│  ⚠ Enter a valid email address.              │   ← FieldError
│                                              │
│  Password                 Forgot password?   │
│  [                                        ]  │   ← aria-invalid
│  ⚠ Enter your password.                      │
│                                              │
│  [               Sign in                  ]  │
```

- **User flow** — Validation runs on submit, then re-validates a field on change once it has
  been shown invalid (RHF `mode: 'onSubmit'`, `reValidateMode: 'onChange'`). Focus moves to the
  first invalid field.

### Login — submitting (FR-003)

```
│  Email     [ owner@example.com            ]  │   ← inputs readOnly
│  Password  [ ••••••••                     ]  │
│  [        (spinner) Signing in…           ]  │   ← disabled, aria-busy
```

### Login — credential / service error (FR-004, FR-005, FR-006)

```
│  ┌────────────────────────────────────────┐  │
│  │ (!) Incorrect email or password.       │  │   ← Alert variant=destructive, role=alert
│  └────────────────────────────────────────┘  │
│                                              │
│  Email     [ owner@example.com            ]  │   ← email kept
│  Password  [                              ]  │   ← password cleared + focused
│  [               Sign in                  ]  │
```

- **Annotations** — The alert sits between the header block and the Email field. The same slot
  shows: "Too many sign-in attempts. Wait a moment and try again." / "Couldn't reach the sign-in
  service. Check your connection and try again." / "Something went wrong. Try again." The alert
  clears when the user edits either field or submits again.

### Login — arrived with a reason (FR-021, FR-022, ADR-009)

```
│  ┌────────────────────────────────────────┐  │
│  │ (i) Your session has expired.          │  │   ← Alert default (neutral)
│  │     Sign in again to continue.         │  │
│  └────────────────────────────────────────┘  │
```

| `?reason=` | Alert variant | Title | Description |
|------------|---------------|-------|-------------|
| `session-expired` | `default` | Your session has expired. | Sign in again to continue. |
| `deactivated` | `destructive` | Your account has been deactivated. | Contact your household admin. |
| `not-provisioned` | `destructive` | Your account isn't set up for Nestly. | Contact your household admin. |
| `signed-out` | *(none)* | — | Normal sign-out shows no banner. |
| unknown value | *(none)* | — | Ignored. |

- **User flow** — The reason banner stays until a sign-in attempt starts; a credential error then
  replaces it in the same slot (only one alert at a time).

### Login — forgot password hint (FR-007)

```
│  Password                 Forgot password?   │   ← aria-expanded=true
│  [ ••••••••                               ]  │
│  Ask your household admin to reset your      │   ← FieldDescription, id=forgot-hint
│  password from Settings → Members.           │
```

- **Annotations** — Inline disclosure, not a dialog or a page; toggles on click. No email is sent.

### Session restore (FR-012)

```
┌──────────────────────────────────────────────┐
│                                              │
│                                              │
│                [ Nestly logo ]               │
│                  (spinner)                   │
│                                              │
│                                              │
└──────────────────────────────────────────────┘
   full viewport, bg-background, no sidebar
```

- **Annotations** — Shown only while the protected loader is pending on first load (typically
  < 1 s). Later in-app navigations don't show it — the member is already cached.

### User menu — sidebar footer (FR-017, FR-018)

Expanded sidebar:

```
├────────────────────────────┤
│ ⚙ Settings                 │   ← existing
│ ┌────────────────────────┐ │
│ │ (CN) Charanchai     ⌄  │ │   ← SidebarMenuButton size=lg → DropdownMenu trigger
│ │      owner@example.com │ │
│ └────────────────────────┘ │
└────────────────────────────┘

   opens upward / to the right:
   ┌──────────────────────────┐
   │ (CN) Charanchai          │   ← DropdownMenuLabel (non-interactive)
   │      owner@example.com   │
   │ ──────────────────────── │
   │ ⎋ Sign out               │   ← DropdownMenuItem
   └──────────────────────────┘
```

Collapsed (icon) sidebar: only the avatar shows; tooltip = member name; same dropdown.

- **User flow** — Click/Enter on the trigger → menu → Sign out → session ends, cache clears,
  navigate to `/login` (no banner). No confirmation dialog: signing out is cheap to undo.
- **Loading / error** — The member is always resolved before `AppLayout` renders (loader), so the
  menu has no loading or empty state. Initials = first letters of the first two words of `name`,
  uppercased; falls back to the first letter of `email`.

## Hi-fi Component Specs

### Login

#### Layout

- **Wrapper** — unchanged `routes/login.tsx`: `flex min-h-svh flex-col items-center
  justify-center gap-6 bg-background p-6 md:p-10` → `w-full max-w-sm`.
- **Form** — `<form noValidate>` → `FieldGroup` (keeps current spacing). `noValidate` so Zod
  messages, not browser bubbles, are shown.
- **Responsive** — Single column at every width. `p-6` below `md`, `p-10` from `md`. At 360 px the
  column is 312 px wide; no horizontal scroll. Logo stays 128 px.

#### Components

| Element | shadcn/ui Component | Variant / Size | Tailwind Classes | States |
|---------|-------------------|---------------|-----------------|--------|
| Logo + heading + intro | `NestlyLogo`, `h1`, `FieldDescription` | — | existing (`text-xl font-bold`, centred) | static |
| Form alert (error / reason) | `Alert` + `AlertTitle` + `AlertDescription` | `destructive` (errors, deactivated, not-provisioned) / `default` (session-expired) | default classes; icon `CircleAlertIcon` / `InfoIcon` (lucide) | appears / replaced / cleared |
| Email field | `Field` + `FieldLabel` + `Input` + `FieldError` | Input default | `type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false}` | default, hover, focus (`ring` mint), invalid (`aria-invalid` → destructive border/ring), read-only while pending |
| Password label row | `div` with `FieldLabel` + `Button` | Button `link`, size `sm` | row: `flex items-center justify-between`; button: `h-auto p-0 text-muted-foreground hover:text-foreground` | default, hover (underline), focus-visible ring, `aria-expanded` |
| Password field | `Input` + `FieldError` | default | `type="password" autoComplete="current-password"` | as email; cleared after a credential error |
| Forgot hint | `FieldDescription` | — | `id="forgot-password-hint"`; rendered only when open | hidden / shown |
| Submit | `Button` | `default` / `default` | `w-full`; pending: `<Spinner data-icon="inline-start" />` + "Signing in…" | default (bg-primary), hover (`bg-primary/80`), focus-visible ring, disabled (`opacity-50`), loading (`aria-busy="true"`, disabled) |

#### Accessibility

- **Contrast** — Light: primary button text #FFFFFF on #121212 = 18.7:1; body text #121212 on
  #F5F6F8 ≈ 17:1; `muted-foreground` #5B6170 on #F5F6F8 ≈ 5.8:1; `destructive` #DC2626 on #F5F6F8
  ≈ 4.5:1 (error text is 14 px — passes AA at exactly the threshold; Alert uses the destructive
  colour on the page background, verify during implementation). Dark: primary #121212 on mint #60D2B8 =
  10.2:1; `muted-foreground` #A1A1AA on #000 ≈ 8:1; `destructive` #F26B5B on #000 ≈ 6.7:1.
  Focus ring mint #1F9C80 vs #F5F6F8 ≈ 3.2:1 (≥ 3:1 non-text).
- **ARIA roles** — `Alert` has `role="alert"` (announced when it appears). Invalid inputs get
  `aria-invalid="true"` and `aria-describedby` → their `FieldError` id. The forgot-password
  button has `aria-expanded` + `aria-controls="forgot-password-hint"`. The submit button has
  `aria-busy` while pending. The page has exactly one `h1`.
- **Keyboard navigation** — Tab order: Email → Forgot password? → Password → Sign in. Enter in
  either input submits. After failed validation focus goes to the first invalid field; after a
  credential error focus goes to the cleared Password field. Autofocus Email only when
  `matchMedia('(pointer: fine)')` (avoid popping the mobile keyboard).

### Session restore

#### Layout

- **Wrapper** — `src/components/layout/full-screen-loader.tsx`: `flex min-h-svh flex-col
  items-center justify-center gap-4 bg-background`, `role="status"`, `aria-live="polite"`.
- **Responsive** — Same at every width.

#### Components

| Element | shadcn/ui Component | Variant / Size | Tailwind Classes | States |
|---------|-------------------|---------------|-----------------|--------|
| Logo | `NestlyLogo` | size 64 | `aria-hidden` | static |
| Spinner | `Spinner` | — | `size-5 text-muted-foreground` | spinning; respects `motion-reduce:animate-none` |
| Label | `span` | — | `sr-only` → "Loading Nestly…" | — |

#### Accessibility

- **Contrast** — Spinner is decorative (non-text, label is screen-reader text).
- **ARIA roles** — `role="status"` with sr-only text.
- **Keyboard navigation** — No focusable elements.

### User menu

#### Layout

- **Wrapper** — `src/features/auth/components/user-menu.tsx` rendered as a second
  `SidebarMenuItem` inside the existing `SidebarFooter` `SidebarMenu`, after Settings.
- **Responsive** — Desktop: dropdown `side="right" align="end"`; mobile (sidebar is a sheet,
  `useIsMobile()`): `side="top" align="end"`. Collapsed icon sidebar: text hidden by the sidebar's
  own `group-data-[collapsible=icon]` rules; `tooltip={member.name}`.

#### Components

| Element | shadcn/ui Component | Variant / Size | Tailwind Classes | States |
|---------|-------------------|---------------|-----------------|--------|
| Trigger | `DropdownMenuTrigger asChild` → `SidebarMenuButton` | size `lg` | `data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground` | default, hover (sidebar-accent), focus-visible ring, open |
| Avatar | `Avatar` + `AvatarFallback` | — | `size-8 rounded-lg`; fallback `rounded-lg bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium` | static (initials, no image in V1) |
| Name / email | `div` > `span` ×2 | — | `grid flex-1 text-left text-sm leading-tight`; name `truncate font-medium`; email `truncate text-xs text-muted-foreground` | truncates long values |
| Chevron | `ChevronsUpDownIcon` | — | `ml-auto size-4` | — |
| Menu content | `DropdownMenuContent` | — | `min-w-56 rounded-lg` | open / closed |
| Menu header | `DropdownMenuLabel` | — | `p-0 font-normal` with the avatar + name/email block | static |
| Sign out | `DropdownMenuItem` | default | `LogOutIcon` + "Sign out"; `onSelect` → `useSignOut()` | default, highlighted, disabled while pending |

#### Accessibility

- **Contrast** — `sidebar-foreground` #121212 on #FFFFFF = 18.7:1; email `muted-foreground`
  #5B6170 on #FFFFFF = 6.2:1; hover `sidebar-accent-foreground` #0F5C4B on #E8F8F3 ≈ 7:1.
- **ARIA roles** — Radix supplies `aria-haspopup="menu"`, `aria-expanded`, `role="menu"` /
  `menuitem`. Trigger accessible name: "Account menu for {name}" (`aria-label`).
- **Keyboard navigation** — Tab to trigger → Enter/Space/↓ opens and focuses "Sign out" → Enter
  signs out; Esc closes and returns focus to the trigger. Focus is trapped in the menu while open
  (Radix).

## Design Review

### Heuristics (Nielsen)

| # | Heuristic | Issues Found | Score (1–4) | Resolution |
|---|-----------|--------------|-------------|------------|
| 1 | Visibility of system status | No feedback during sign-in or session restore | 3 | Pending button + spinner; full-screen loader; reason banners after forced sign-out |
| 2 | Match with real world | "Login" vs "Sign out" mixed wording | 1 | Use "Sign in" / "Sign out" everywhere |
| 3 | User control and freedom | Sign-out has no undo | 1 | Accepted: signing back in is cheap; no confirm dialog |
| 5 | Error prevention | Browser bubbles inconsistent with app styling | 1 | `noValidate` + Zod inline messages |
| 6 | Recognition over recall | User may not know who can reset a password | 2 | Hint names the admin and the exact location (Settings → Members) |
| 7 | Flexibility and efficiency | — | 1 | Enter submits; password managers supported via correct `autoComplete` |
| 8 | Aesthetic and minimalist | Terms/Privacy placeholder links | 1 | Removed (OQ-001) |
| 9 | Help users recover from errors | Generic messages could confuse a deactivated user | 3 | Distinct `?reason=` banners for deactivated / not provisioned / expired |

No unresolved score 3–4 issues.

### Accessibility Audit

- **WCAG AA** — Pass for all text pairs above in both themes. One borderline pair: light-mode
  `destructive` text on the page background (~4.5:1) — the frontend task must confirm with a contrast tool;
  if it fails, render the Alert on `bg-card` (white, ≈ 4.8:1) instead.
- **Keyboard flow** — Confirmed for login (Email → hint → Password → Sign in, Enter submits,
  focus management on error) and user menu (Radix menu semantics, Esc returns focus).
