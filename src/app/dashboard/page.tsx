import { redirect } from "next/navigation";
import { WorkspaceDashboardClient } from "@/components/workspace/WorkspaceDashboardClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DashboardSearchParams = {
  workspaceId?: string | string[] | undefined;
};

type TaskStatus = "todo" | "in_progress" | "done";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/sign-in");
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id,role")
    .eq("user_id", user.id);

  if (membershipError) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          Failed to load workspaces: {membershipError.message}
        </div>
      </main>
    );
  }

  const membershipRows = memberships ?? [];

  if (membershipRows.length === 0) {
    return (
      <WorkspaceDashboardClient
        key="no-workspaces"
        workspaces={[]}
        selectedWorkspaceId={null}
        projects={[]}
      />
    );
  }

  const workspaceIds = membershipRows.map((m) => m.workspace_id);

  const { data: workspaces, error: workspacesError } = await supabase
    .from("workspaces")
    .select("id,name")
    .in("id", workspaceIds);

  if (workspacesError) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          Failed to load workspace details: {workspacesError.message}
        </div>
      </main>
    );
  }

  const workspaceRows = workspaces ?? [];

  const roleByWorkspaceId = new Map<string, "owner" | "member">(
    membershipRows.map((m) => [m.workspace_id, m.role])
  );

  const selectedWorkspaceIdFromQuery =
    typeof resolvedSearchParams.workspaceId === "string" ? resolvedSearchParams.workspaceId : undefined;

  const selectedWorkspaceId =
    selectedWorkspaceIdFromQuery && workspaceIds.includes(selectedWorkspaceIdFromQuery)
      ? selectedWorkspaceIdFromQuery
      : workspaceIds[0];

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id,name")
    .eq("workspace_id", selectedWorkspaceId)
    .order("created_at", { ascending: false });

  if (projectsError) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          Failed to load projects: {projectsError.message}
        </div>
      </main>
    );
  }

  const projectRows = projects ?? [];

  const projectSummaries = await Promise.all(
    projectRows.map(async (project) => {
      const { data: taskRows, error: tasksError } = await supabase
        .from("tasks")
        .select("status")
        .eq("project_id", project.id);

      if (tasksError) {
        return {
          id: project.id as string,
          name: String(project.name),
          counts: { todo: 0, in_progress: 0, done: 0 } satisfies Record<TaskStatus, number>,
        };
      }

      const counts: Record<TaskStatus, number> = {
        todo: 0,
        in_progress: 0,
        done: 0,
      };

      for (const task of taskRows ?? []) {
        counts[task.status] += 1;
      }

      return {
        id: project.id as string,
        name: String(project.name),
        counts,
      };
    }),
  );

  const workspaceSummaries = workspaceRows.map((w) => ({
    id: w.id as string,
    name: String(w.name),
    role: roleByWorkspaceId.get(w.id as string) ?? "member",
  }));

  return (
    <WorkspaceDashboardClient
      key={selectedWorkspaceId}
      workspaces={workspaceSummaries}
      selectedWorkspaceId={selectedWorkspaceId}
      projects={projectSummaries}
    />
  );
}

