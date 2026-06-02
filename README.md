## Take-Home Assignment: Aspio Task Manager

### Time window
- Start: `2026-06-02 14:48 UTC+3`
- End: `2026-06-03 12:00 UTC+3`

## What is complete and working

### Core requirements (R1–R8)
- **R1 — RLS**: Full schema in `schema.sql` with SELECT/INSERT/UPDATE/DELETE policies on all four tables (`workspaces`, `workspace_members`, `projects`, `tasks`). Workspace isolation is driven by `workspace_members`.
- **R2 — Generated types**: Supabase types in `src/lib/supabase/database.types.ts` (from `npx supabase gen types`). Typed clients used throughout — no `any`.
- **R3 — Realtime**: Task status changes sync instantly via Supabase channels. Subscriptions are cleaned up on unmount (`useRealtimeTasks`, `useRealtimeProjectCounts`).
- **R4 — URL filters**: Project view filters by `status` AND `assignee` simultaneously via query params (`?status=todo&assignee=...`). Sharing the URL restores filter state.
- **R5 — Inline editing**: Task detail panel fields are always editable inline (no separate page/modal). Save/Cancel appear when there are unsaved changes.
- **R6 — Loading/empty/error**: Skeleton loaders on dashboard, project, and auth routes. Empty states include CTAs. Errors show messages, not broken layouts.
- **R7 — Optimistic UI**: Task status changes update locally immediately; failed API calls roll back with toast feedback.
- **R8 — Edge Function**: `supabase/functions/overdue-tasks` accepts `project_id`, returns overdue tasks with assignee names. UI button invokes it via `supabase.functions.invoke` with the user's JWT — RLS enforced server-side.

### Screens
- Auth: `/auth/sign-in`, `/auth/sign-up`, sign-out from dashboard
- Workspace dashboard: `/dashboard` — project overview with task counts by status + realtime updates
- Project view: `/workspaces/[workspaceId]/projects/[projectId]` — task list, filters, inline detail panel, list/board toggle
- Task detail panel: right-side inline edit with save/cancel

### Seed data
`schema.sql` includes 2 workspaces, 4 projects, 15 tasks across statuses and assignees.

Seed users:
- `seed1@aspio.io` / `SeedPass123!`
- `seed2@aspio.io` / `SeedPass123!`
- `seed3@aspio.io` / `SeedPass123!`
- `seed4@aspio.io` / `SeedPass123!`

## Design decisions

- **Next.js 16 `proxy.ts`**: Session refresh runs in `src/proxy.ts` (Next.js 16 middleware convention), keeping Supabase SSR cookies fresh.
- **Per-project realtime**: Subscriptions scoped to the active project (and dashboard counts per project) to limit bandwidth while still syncing instantly where it matters.
- **Edge Function auth**: Uses the caller's JWT with the anon key — not the service role — so RLS applies to overdue task queries.
- **Inline edit UX**: Fields are always visible/editable; Save/Cancel only appear when the form is dirty, avoiding accidental saves.

## Environment variables

```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (seed scripts only — never exposed to the client)

Optional:
- `SUPABASE_DB_URL` — local seed helper

## How to run locally (≤ 5 commands)

1. `npm install`
2. `cp .env.example .env.local` and fill in Supabase values
3. Apply schema: `psql "$SUPABASE_DB_URL" -f schema.sql` (or paste into Supabase SQL editor)
4. Deploy edge function: `SUPABASE_PROJECT_REF=YOUR_REF bash supabase/deploy-edge-functions.sh`
5. `npm run dev`

## Edge function deploy

```bash
SUPABASE_PROJECT_REF=YOUR_PROJECT_REF bash supabase/deploy-edge-functions.sh
```

The function must be deployed to Supabase for the Overdue button to work on the live URL.

## Database seed helper

```bash
SUPABASE_DB_URL="your-postgres-connection-string" npm run seed
```

If seed users cannot sign in (missing `auth.identities`):

```bash
SUPABASE_DB_URL="your-postgres-connection-string" npm run seed:auth
```

## Known limitations (honest)

- No pagination — all tasks load at once
- Search is client-side title/description only (filters remain URL-synced for status + assignee)
- Board view uses quick-move buttons, not drag-and-drop
- No presence/collaboration indicators when multiple users edit the same task

## What I'd do with more time

- Cursor-based pagination and virtualized task lists
- Full-text search with saved filter presets
- Drag-and-drop kanban with `@dnd-kit`
- Realtime presence via Supabase Presence
- E2E tests (Playwright) and CI pipeline

## Submission checklist

- [ ] Public GitHub repo with `abel-aspio` as collaborator
- [ ] Live Vercel URL (env vars + edge function deployed)
- [ ] Email to abel@aspio.io with repo URL, Vercel URL, start time, and notes
