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

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Use POST" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(500, { error: "Missing env vars" });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const projectId =
    typeof body === "object" && body !== null && "project_id" in body
      ? (body as { project_id?: unknown }).project_id
      : undefined;

  if (typeof projectId !== "string") {
    return jsonResponse(400, { error: "project_id is required" });
  }

  const nowIso = new Date().toISOString();

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id,title,description,status,due_date,assignee_id,projects:project_id(workspace_id)")
    .eq("project_id", projectId)
    .neq("status", "done")
    .lt("due_date", nowIso);

  if (tasksError) {
    return jsonResponse(400, { error: tasksError.message });
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

  const { data: members, error: membersError } =
    workspaceId && assigneeIds.length > 0
      ? await supabase
          .from("workspace_members")
          .select("user_id,display_name")
          .eq("workspace_id", workspaceId)
          .in("user_id", assigneeIds)
      : { data: [], error: null as unknown };

  if (membersError) {
    return jsonResponse(400, { error: membersError.message });
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

  return jsonResponse(200, result);
});
