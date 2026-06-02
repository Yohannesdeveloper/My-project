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

  // If Supabase isn't configured, show error message
  if (!supabase) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 pb-10 pt-8">
        <div className="glass-card border-yellow-500/20 bg-yellow-500/5 p-5 text-sm text-yellow-300">
          Supabase environment variables not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
        </div>
      </main>
    );
  }

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
      <main className="mx-auto w-full max-w-6xl px-6 pb-10 pt-8">
        <div className="glass-card border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">
          You don&apos;t have access to this workspace.
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
      <main className="mx-auto w-full max-w-6xl px-6 pb-10 pt-8">
        <div className="glass-card border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">
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
      <main className="mx-auto w-full max-w-6xl px-6 pb-10 pt-8">
        <div className="glass-card border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">
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
      <main className="mx-auto w-full max-w-6xl px-6 pb-10 pt-8">
        <div className="glass-card border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">
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
      key={resolvedParams.projectId}
      workspaceId={resolvedParams.workspaceId}
      projectId={resolvedParams.projectId}
      projectName={projectRow.name}
      members={members}
      initialTasks={initialTasks}
    />
  );
}


