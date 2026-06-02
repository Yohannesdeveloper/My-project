## Take-Home Assignment: Aspio Task Manager

### Time window
- Start: `2026-06-02 14:48 UTC+3`
- End: `2026-06-02 18:00 UTC+3`

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

## Notes for Reviewers

### Known Issues & Limitations
- **No pagination**: Task lists load all tasks at once. For production, cursor-based or offset pagination would be needed for projects with hundreds of tasks
- **No file attachments**: Tasks don't support file uploads or attachments
- **Basic search**: No full-text search across tasks; filtering is limited to status and assignee
- **No drag-and-drop**: Task status changes require editing the task detail panel rather than drag-and-drop between columns
- **Edge Function auth**: The overdue-tasks Edge Function uses service role key for simplicity; production should implement proper user context and authorization checks
- **No real-time collaboration indicators**: No presence detection or "user is typing" indicators when multiple users edit the same task

### Tradeoffs Made
- **Client-side filtering**: URL-based filtering (`?status=todo&assignee=xyz`) is simple and shareable but could become unwieldy with many filter combinations. A more robust solution might use POST-based filter queries
- **Optimistic UI only**: Task edits use optimistic updates without server-side validation before applying changes. This prioritizes UX speed but could lead to brief inconsistencies if the server rejects the update
- **Per-project subscriptions**: Realtime subscriptions are scoped to individual projects to reduce bandwidth, but users switching between projects frequently will experience subscription churn
- **No caching layer**: All data fetches hit the database directly. For production, implementing SWR/React Query with stale-while-revalidate would reduce database load
- **Seed users in schema**: Seed auth users are created via SQL for demo purposes. In production, auth users should be created through Supabase Auth API or invitation flow

### What I'd Do With More Time
1. **Kanban board view**: Add a drag-and-drop board layout for visual task management across statuses
2. **Advanced filtering & search**: Implement full-text search, date range filters, priority levels, and saved filter presets
3. **Real-time cursors/presence**: Show who's viewing/editing a task in real-time using Supabase presence
4. **Notifications system**: Email/in-app notifications for task assignments, due date reminders, and status changes
5. **Workspace settings**: Admin panel for managing workspace members, roles, and permissions
6. **Activity feed**: Audit log showing task history, who changed what, and when
7. **Performance optimization**: Implement virtualized lists for large task collections, pagination, and query result caching
8. **Mobile responsiveness**: Optimize layouts for mobile and tablet devices
9. **Comprehensive testing**: Add unit tests, integration tests, and E2E tests with Playwright
10. **CI/CD pipeline**: Set up automated testing, linting, and deployment workflows
11. **Analytics dashboard**: Charts and metrics for project velocity, task completion rates, and team workload
12. **Import/Export**: CSV import for bulk task creation and export capabilities for reporting
