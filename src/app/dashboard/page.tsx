import { redirect } from "next/navigation";
import { WorkspaceDashboardClient } from "@/components/workspace/WorkspaceDashboardClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

type DashboardSearchParams = {
  workspaceId?: string | string[] | undefined;
};

type TaskStatus = "todo" | "in_progress" | "done";

type ProjectWithCounts = {
  id: string;
  name: string;
  counts: Record<TaskStatus, number>;
};

type WorkspaceWithRole = {
  id: string;
  name: string;
  role: "owner" | "member";
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
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

  const { data: memberships, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id,role")
    .eq("user_id", user.id);

  if (membershipError) {
    return (
      <main className="mx-auto w-full max-w-6xl px-6 pb-10 pt-8">
        <div className="glass-card border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">
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
      <main className="mx-auto w-full max-w-6xl px-6 pb-10 pt-8">
        <div className="glass-card border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">
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
      <main className="mx-auto w-full max-w-6xl px-6 pb-10 pt-8">
        <div className="glass-card border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">
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
          id: project.id,
          name: project.name,
          counts: { todo: 0, in_progress: 0, done: 0 } satisfies Record<TaskStatus, number>,
        } satisfies ProjectWithCounts;
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
        id: project.id,
        name: project.name,
        counts,
      } satisfies ProjectWithCounts;
    }),
  );

  const workspaceSummaries: WorkspaceWithRole[] = workspaceRows.map((w: Pick<Tables<"workspaces">, "id" | "name">) => ({
    id: w.id,
    name: w.name,
    role: roleByWorkspaceId.get(w.id) ?? "member",
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

