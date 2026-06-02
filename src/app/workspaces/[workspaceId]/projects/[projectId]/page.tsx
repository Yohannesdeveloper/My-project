import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProjectViewClient } from "@/components/project/ProjectViewClient";
import { redirect } from "next/navigation";

type RouteParams = {
  workspaceId: string;
  projectId: string;
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const resolvedParams = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/sign-in");
  }

  const { data: membershipRow, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", resolvedParams.workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membershipRow) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          You don’t have access to this workspace.
        </div>
      </main>
    );
  }

  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .select("id,name")
    .eq("id", resolvedParams.projectId)
    .maybeSingle();

  if (projectError || !projectRow) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          Failed to load project.
        </div>
      </main>
    );
  }

  const { data: membersRows, error: membersError } = await supabase
    .from("workspace_members")
    .select("user_id,display_name")
    .eq("workspace_id", resolvedParams.workspaceId);

  if (membersError) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          Failed to load workspace members.
        </div>
      </main>
    );
  }

  const { data: tasksRows, error: tasksError } = await supabase
    .from("tasks")
    .select("id,title,description,status,assignee_id,due_date")
    .eq("project_id", resolvedParams.projectId)
    .order("created_at", { ascending: true });

  if (tasksError) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          Failed to load tasks.
        </div>
      </main>
    );
  }

  const members = (membersRows ?? []).map((m) => ({
    user_id: m.user_id,
    display_name: m.display_name,
  }));

  const initialTasks = (tasksRows ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    assignee_id: t.assignee_id,
    due_date: t.due_date,
  }));

  return (
    <ProjectViewClient
      workspaceId={resolvedParams.workspaceId}
      projectId={resolvedParams.projectId}
      projectName={projectRow.name}
      members={members}
      initialTasks={initialTasks}
    />
  );
}


