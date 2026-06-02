import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type OverdueTask = {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
};

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const projectId =
    typeof body === "object" && body !== null && "project_id" in body
      ? (body as { project_id?: unknown }).project_id
      : undefined;

  if (typeof projectId !== "string") {
    return new Response(JSON.stringify({ error: "project_id is required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const nowIso = new Date().toISOString();

  // Fetch tasks + their workspace_id (via the project relationship).
  // RLS is enforced because we create the client with the caller's JWT.
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id,title,description,status,due_date,assignee_id,projects:project_id(workspace_id)")
    .eq("project_id", projectId)
    .neq("status", "done")
    .lt("due_date", nowIso);

  if (tasksError) {
    return new Response(JSON.stringify({ error: tasksError.message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const typedTasks = (tasks ?? []) as Array<{
    id: string;
    title: string;
    description: string;
    status: "todo" | "in_progress" | "done";
    due_date: string | null;
    assignee_id: string | null;
    projects?: { workspace_id: string } | null;
  }>;

  const workspaceId = typedTasks[0]?.projects?.workspace_id ?? null;

  const assigneeIds = Array.from(
    new Set(
      typedTasks
        .map((t) => t.assignee_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  );

  const { data: members, error: membersError } = workspaceId && assigneeIds.length > 0
    ? await supabase
      .from("workspace_members")
      .select("user_id,display_name")
      .eq("workspace_id", workspaceId)
      .in("user_id", assigneeIds)
    : { data: [], error: null as unknown };

  if (membersError) {
    return new Response(JSON.stringify({ error: membersError.message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const memberByUserId = new Map<string, string>();
  for (const m of (members ?? []) as Array<{ user_id: string; display_name: string }>) {
    memberByUserId.set(m.user_id, m.display_name);
  }

  const result: OverdueTask[] = typedTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    due_date: t.due_date,
    assignee_id: t.assignee_id,
    assignee_name: t.assignee_id ? memberByUserId.get(t.assignee_id) ?? null : null,
  }));

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

