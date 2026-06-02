-- Task Manager (Supabase) schema + RLS + seed data
-- Run this file as a single script against your Supabase Postgres database.

begin;

-- Extensions
create extension if not exists pgcrypto;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('todo', 'in_progress', 'done');
  end if;

  if not exists (select 1 from pg_type where typname = 'workspace_role') then
    create type public.workspace_role as enum ('owner', 'member');
  end if;
exception
  when duplicate_object then null;
end $$;

-- Drop tables (order matters due to FKs)
drop table if exists public.tasks cascade;
drop table if exists public.projects cascade;
drop table if exists public.workspace_members cascade;
drop table if exists public.workspaces cascade;

-- Tables
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  status public.task_status not null,
  assignee_id uuid references auth.users(id) on delete set null,
  due_date timestamptz,
  created_at timestamptz not null default now()
);

-- Permissions
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.workspaces to authenticated;
grant select, insert, update, delete on table public.workspace_members to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;

-- Helper function to check workspace membership (bypasses RLS to avoid recursion)
create or replace function public.is_workspace_member(p_workspace_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = p_user_id
  );
$$;

create or replace function public.is_workspace_owner(p_workspace_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = p_workspace_id
      and user_id = p_user_id
      and role = 'owner'::public.workspace_role
  );
$$;

-- RLS: workspaces
alter table public.workspaces enable row level security;

drop policy if exists "workspaces_select_members" on public.workspaces;
create policy "workspaces_select_members"
on public.workspaces
for select
to authenticated
using (public.is_workspace_member(id, auth.uid()));

drop policy if exists "workspaces_insert_authenticated" on public.workspaces;
create policy "workspaces_insert_authenticated"
on public.workspaces
for insert
to authenticated
with check (true);

drop policy if exists "workspaces_update_owner" on public.workspaces;
create policy "workspaces_update_owner"
on public.workspaces
for update
to authenticated
using (public.is_workspace_owner(id, auth.uid()))
with check (public.is_workspace_owner(id, auth.uid()));

drop policy if exists "workspaces_delete_owner" on public.workspaces;
create policy "workspaces_delete_owner"
on public.workspaces
for delete
to authenticated
using (public.is_workspace_owner(id, auth.uid()));

-- RLS: workspace_members
alter table public.workspace_members enable row level security;

drop policy if exists "workspace_members_select" on public.workspace_members;
create policy "workspace_members_select"
on public.workspace_members
for select
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

drop policy if exists "workspace_members_insert" on public.workspace_members;
create policy "workspace_members_insert"
on public.workspace_members
for insert
to authenticated
with check (
  (
    workspace_members.user_id = auth.uid()
    and workspace_members.role = 'owner'::public.workspace_role
    and not public.is_workspace_member(workspace_members.workspace_id, auth.uid())
  )
  or
  (
    workspace_members.role = 'member'::public.workspace_role
    and public.is_workspace_owner(workspace_members.workspace_id, auth.uid())
  )
);

drop policy if exists "workspace_members_update_owner" on public.workspace_members;
create policy "workspace_members_update_owner"
on public.workspace_members
for update
to authenticated
using (public.is_workspace_owner(workspace_id, auth.uid()))
with check (public.is_workspace_owner(workspace_id, auth.uid()));

drop policy if exists "workspace_members_delete_owner" on public.workspace_members;
create policy "workspace_members_delete_owner"
on public.workspace_members
for delete
to authenticated
using (public.is_workspace_owner(workspace_id, auth.uid()));

-- RLS: projects
alter table public.projects enable row level security;

drop policy if exists "projects_select_members" on public.projects;
create policy "projects_select_members"
on public.projects
for select
to authenticated
using (public.is_workspace_member(workspace_id, auth.uid()));

drop policy if exists "projects_insert_members" on public.projects;
create policy "projects_insert_members"
on public.projects
for insert
to authenticated
with check (public.is_workspace_member(workspace_id, auth.uid()));

drop policy if exists "projects_update_owner" on public.projects;
create policy "projects_update_owner"
on public.projects
for update
to authenticated
using (public.is_workspace_owner(workspace_id, auth.uid()))
with check (public.is_workspace_owner(workspace_id, auth.uid()));

drop policy if exists "projects_delete_owner" on public.projects;
create policy "projects_delete_owner"
on public.projects
for delete
to authenticated
using (public.is_workspace_owner(workspace_id, auth.uid()));

-- RLS: tasks
alter table public.tasks enable row level security;
alter table public.tasks replica identity full;

-- Helper for task membership check
create or replace function public.is_task_member(p_task_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.tasks t
    join public.projects p on p.id = t.project_id
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where t.id = p_task_id
      and wm.user_id = p_user_id
  );
$$;

drop policy if exists "tasks_select_members" on public.tasks;
create policy "tasks_select_members"
on public.tasks
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = tasks.project_id
      and public.is_workspace_member(p.workspace_id, auth.uid())
  )
);

drop policy if exists "tasks_insert_members" on public.tasks;
create policy "tasks_insert_members"
on public.tasks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects p
    where p.id = tasks.project_id
      and public.is_workspace_member(p.workspace_id, auth.uid())
  )
);

drop policy if exists "tasks_update_members" on public.tasks;
create policy "tasks_update_members"
on public.tasks
for update
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = tasks.project_id
      and public.is_workspace_member(p.workspace_id, auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = tasks.project_id
      and public.is_workspace_member(p.workspace_id, auth.uid())
  )
);

drop policy if exists "tasks_delete_members" on public.tasks;
create policy "tasks_delete_members"
on public.tasks
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = tasks.project_id
      and public.is_workspace_member(p.workspace_id, auth.uid())
  )
);

-- Realtime publication (safe no-op if publication doesn't exist)
do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception
  when undefined_object then null;
end $$;

-- Seed data (2 workspaces, 4 projects, 15 tasks)
-- Seed users (4). These are for UI evaluation convenience.
-- Credentials (document in README):
--   seed1@aspio.io / SeedPass123!
--   seed2@aspio.io / SeedPass123!
--   seed3@aspio.io / SeedPass123!
--   seed4@aspio.io / SeedPass123!

-- Deterministic UUIDs so the seed is stable.
-- NOTE: These inserts assume you are running this as a Supabase admin/service role.
do $$
declare
  pw text := 'SeedPass123!';
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  values
    ('11111111-1111-1111-1111-111111111111', 'seed1@aspio.io', crypt(pw, gen_salt('bf')), now(), now(), now()),
    ('22222222-2222-2222-2222-222222222222', 'seed2@aspio.io', crypt(pw, gen_salt('bf')), now(), now(), now()),
    ('33333333-3333-3333-3333-333333333333', 'seed3@aspio.io', crypt(pw, gen_salt('bf')), now(), now(), now()),
    ('44444444-4444-4444-4444-444444444444', 'seed4@aspio.io', crypt(pw, gen_salt('bf')), now(), now(), now())
  on conflict (id) do nothing;
end $$;

insert into public.workspaces (id, name, created_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Aspio Ops', now() - interval '30 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Design Studio', now() - interval '30 days')
on conflict (id) do nothing;

insert into public.workspace_members (workspace_id, user_id, role, display_name, created_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner',  'Seed One',  now() - interval '25 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member', 'Seed Two',  now() - interval '25 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'owner',  'Seed Three', now() - interval '25 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'member', 'Seed Four',  now() - interval '25 days')
on conflict (workspace_id, user_id) do nothing;

insert into public.projects (id, workspace_id, name, created_at) values
  ('11111111-2222-3333-4444-555555555501', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Backlog', now() - interval '20 days'),
  ('11111111-2222-3333-4444-555555555502', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Website', now() - interval '20 days'),
  ('11111111-2222-3333-4444-555555555503', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Mobile', now() - interval '20 days'),
  ('11111111-2222-3333-4444-555555555504', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'QA', now() - interval '20 days')
on conflict (id) do nothing;

-- Tasks for Aspio Ops (Workspace A)
-- Project: Backlog
insert into public.tasks (id, project_id, title, description, status, assignee_id, due_date, created_at) values
  ('00000000-0000-0000-0000-000000000001', '11111111-2222-3333-4444-555555555501', 'Draft requirements', 'Write initial requirements and acceptance criteria.', 'todo', '11111111-1111-1111-1111-111111111111', now() - interval '5 days', now() - interval '18 days'),
  ('00000000-0000-0000-0000-000000000002', '11111111-2222-3333-4444-555555555501', 'Implement auth', 'Supabase Auth flows (sign up, sign in, sign out).', 'in_progress', '22222222-2222-2222-2222-222222222222', now() - interval '1 days', now() - interval '16 days'),
  ('00000000-0000-0000-0000-000000000003', '11111111-2222-3333-4444-555555555501', 'RLS policies', 'Ensure SELECT/INSERT/UPDATE/DELETE with workspace isolation.', 'done', '22222222-2222-2222-2222-222222222222', now() - interval '10 days', now() - interval '14 days'),
  ('00000000-0000-0000-0000-000000000004', '11111111-2222-3333-4444-555555555501', 'Realtime updates', 'Use Supabase channels to sync status changes instantly.', 'todo', '11111111-1111-1111-1111-111111111111', now() + interval '2 days', now() - interval '12 days'),
  ('00000000-0000-0000-0000-000000000005', '11111111-2222-3333-4444-555555555501', 'Optimistic UI', 'Rollback with feedback on API failure.', 'in_progress', '11111111-1111-1111-1111-111111111111', now() + interval '4 days', now() - interval '11 days'),
  ('00000000-0000-0000-0000-000000000006', '11111111-2222-3333-4444-555555555501', 'URL synced filters', 'Status + assignee in query params.', 'todo', '22222222-2222-2222-2222-222222222222', now() + interval '1 days', now() - interval '9 days'),

-- Project: Website
  ('00000000-0000-0000-0000-000000000007', '11111111-2222-3333-4444-555555555502', 'Inline editing UX', 'Edit all task fields inline with save/cancel.', 'in_progress', '22222222-2222-2222-2222-222222222222', now() - interval '2 days', now() - interval '13 days'),
  ('00000000-0000-0000-0000-000000000008', '11111111-2222-3333-4444-555555555502', 'Loading/empty/error states', 'No blank screens; clear feedback everywhere.', 'done', '11111111-1111-1111-1111-111111111111', now() - interval '7 days', now() - interval '10 days'),
  ('00000000-0000-0000-0000-000000000009', '11111111-2222-3333-4444-555555555502', 'Task detail panel polish', 'Typography hierarchy and spacing consistency.', 'todo', '11111111-1111-1111-1111-111111111111', now() + interval '3 days', now() - interval '8 days'),

-- Tasks for Design Studio (Workspace B)
-- Project: Mobile
  ('00000000-0000-0000-0000-000000000010', '11111111-2222-3333-4444-555555555503', 'Component layout pass', 'Make it feel native on mobile and desktop.', 'todo', '33333333-3333-3333-3333-333333333333', now() - interval '3 days', now() - interval '15 days'),
  ('00000000-0000-0000-0000-000000000011', '11111111-2222-3333-4444-555555555503', 'Status dropdown', 'Intentional status update affordance.', 'in_progress', '44444444-4444-4444-4444-444444444444', now() + interval '2 days', now() - interval '12 days'),
  ('00000000-0000-0000-0000-000000000012', '11111111-2222-3333-4444-555555555503', 'Bulk edge function test', 'Verify overdue tasks endpoint with RLS.', 'done', '44444444-4444-4444-4444-444444444444', now() - interval '6 days', now() - interval '9 days'),

-- Project: QA
  ('00000000-0000-0000-0000-000000000013', '11111111-2222-3333-4444-555555555504', 'RLS leak check', 'Test with second account; no cross-workspace access.', 'in_progress', '33333333-3333-3333-3333-333333333333', now() - interval '1 days', now() - interval '13 days'),
  ('00000000-0000-0000-0000-000000000014', '11111111-2222-3333-4444-555555555504', 'Edge function button UI', 'Overdue list with assignee names.', 'todo', '44444444-4444-4444-4444-444444444444', now() + interval '5 days', now() - interval '10 days'),
  ('00000000-0000-0000-0000-000000000015', '11111111-2222-3333-4444-555555555504', 'Final UI pass', 'Make empty states actionable and errors helpful.', 'done', '33333333-3333-3333-3333-333333333333', now() - interval '2 days', now() - interval '6 days')
on conflict (id) do nothing;

commit;

