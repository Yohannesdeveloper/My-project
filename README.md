## Take-Home Assignment: Aspio Task Manager

### Time window
- Start: `2026-06-02 14:48 UTC+3`
- End: `2026-06-02 15:55 UTC+3`

## What’s implemented
- Next.js (App Router) UI scaffold
- Auth screens:
  - `/auth/sign-in`
  - `/auth/sign-up`
  - Supabase sign-out button
- Workspace dashboard (`/dashboard`)
  - project list with task counts by status
  - realtime count updates via Supabase channels
  - empty state with call-to-action (create workspace/project)
- Project view (`/workspaces/[workspaceId]/projects/[projectId]`)
  - task list filtering by `status` AND `assignee` via URL query params
  - right-side task detail panel with inline edit + Save/Cancel
  - optimistic UI rollback on Save failure
  - realtime status syncing
  - Edge Function button that displays overdue tasks (with assignee names)
- Database schema + RLS + seed data (`schema.sql`)
  - 2 workspaces, 4 projects, 15 tasks across multiple statuses and assignees
  - RLS policies cover SELECT/INSERT/UPDATE/DELETE for all tables
- Edge Function source committed
  - `supabase/functions/overdue-tasks/index.ts`

## Design Decisions & Tradeoffs
- **Supabase TypeScript Schema & Cast Hardening**: Fully integrated generated Supabase TypeScript types (`database.types.ts`). Hardened all row-shape casting and removed unsafe/redundant assertions from server pages and client UI components.
- **Next.js 16 Compatibility**: Awaited dynamic `params` and `searchParams` in server-side page components to align with Next.js 16 Promise-based parameters.
- **Realtime Scope**: Subscribes to changes per-project rather than workspace-wide. This minimizes unnecessary bandwidth/message routing on the client side, while ensuring instant updates within the active project view.
- **Robust UI Feedback**: Built with loading/empty/error states and optimistic UI rollback for task edits, ensuring instant feedback and graceful failure recovery.

## Schema / seed details
`schema.sql` includes:
- Enums:
  - `task_status`: `todo | in_progress | done`
  - `workspace_role`: `owner | member`
- Tables:
  - `workspaces`
  - `workspace_members` (drives all workspace isolation in RLS)
  - `projects`
  - `tasks`
- Seed auth users for UI evaluation:
  - `seed1@aspio.io` / `SeedPass123!`
  - `seed2@aspio.io` / `SeedPass123!`
  - `seed3@aspio.io` / `SeedPass123!`
  - `seed4@aspio.io` / `SeedPass123!`

## Environment variables
Copy env example:
```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Edge function deploy
After you link your Supabase project:
```bash
SUPABASE_PROJECT_REF=YOUR_PROJECT_REF bash supabase/deploy-edge-functions.sh
```

## How to run locally (<= 5 commands)
1. `npm install`
2. `npx supabase login`
3. Apply the DB schema: `psql "$SUPABASE_DB_URL" -f schema.sql` (or run `schema.sql` in the Supabase SQL editor)
4. Generate types: `npx supabase gen types typescript --project-ref "$SUPABASE_PROJECT_REF"`
5. `npm run dev`
