"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Database, Tables } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TaskStatus = "todo" | "in_progress" | "done";
type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

type WorkspaceSummary = {
  id: Tables<"workspaces">["id"];
  name: Tables<"workspaces">["name"];
  role: WorkspaceRole;
};

type ProjectCounts = Record<TaskStatus, number>;

type ProjectSummary = {
  id: string;
  name: string;
  counts: ProjectCounts;
};

type Props = {
  workspaces: WorkspaceSummary[];
  selectedWorkspaceId: string | null;
  projects: ProjectSummary[];
};

function StatusPill({
  status,
  count,
}: {
  status: TaskStatus;
  count: number;
}) {
  const stylesByStatus: Record<TaskStatus, string> = {
    todo: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50",
    in_progress:
      "bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100",
    done: "bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100",
  };

  const label =
    status === "todo" ? "Todo" : status === "in_progress" ? "In progress" : "Done";

  return (
    <div className={`rounded-full px-2.5 py-1 text-xs ${stylesByStatus[status]}`}>
      <span className="font-medium">{label}:</span> {count}
    </div>
  );
}

export function WorkspaceDashboardClient({
  workspaces,
  selectedWorkspaceId,
  projects,
}: Props) {
  const router = useRouter();

  const [projectState, setProjectState] = useState<ProjectSummary[]>(projects);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const projectIds = useMemo(() => projectState.map((p) => p.id), [projectState]);

  useEffect(() => {
    if (projectIds.length === 0) return;

    const channels = projectIds.map((projectId) => {
      const channel = supabaseBrowser.channel(`dashboard-tasks-${projectId}`);
      channel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${projectId}`,
        },
        (payload: {
          old?: { status?: TaskStatus } | null;
          new?: { status?: TaskStatus } | null;
        }) => {
          const oldStatus = payload.old?.status ?? undefined;
          const newStatus = payload.new?.status ?? undefined;
          if (!oldStatus || !newStatus || oldStatus === newStatus) return;

          setProjectState((prev) =>
            prev.map((p) => {
              if (p.id !== projectId) return p;
              return {
                ...p,
                counts: {
                  ...p.counts,
                  [oldStatus]: Math.max(0, p.counts[oldStatus] - 1),
                  [newStatus]: p.counts[newStatus] + 1,
                },
              };
            }),
          );
        },
      );
      channel.subscribe();
      return channel;
    });

    return () => {
      for (const ch of channels) {
        supabaseBrowser.removeChannel(ch);
      }
    };
  }, [projectIds]);

  const onWorkspaceChange = (workspaceId: string) => {
    router.replace(`/dashboard?workspaceId=${encodeURIComponent(workspaceId)}`);
  };

  const signOut = async () => {
    setError(null);
    setSaving(true);
    try {
      await supabaseBrowser.auth.signOut();
      router.replace("/auth/sign-in");
    } catch {
      setError("Sign out failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (workspaces.length === 0) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
        <HeaderBar saving={saving} error={error} onSignOut={signOut} />
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            No workspaces yet
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Create a workspace to start organizing projects and tasks.
          </p>
          <div className="mt-4">
            <CreateWorkspaceForm
              onCreated={(workspaceId) => onWorkspaceChange(workspaceId)}
              setError={setError}
              setSaving={setSaving}
            />
          </div>
        </div>
      </main>
    );
  }

  const safeSelectedId = selectedWorkspaceId ?? workspaces[0]?.id ?? null;
  const selectedWorkspace = workspaces.find((w) => w.id === safeSelectedId) ?? null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
      <HeaderBar saving={saving} error={error} onSignOut={signOut} />

      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Workspace dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {selectedWorkspace ? (
              <>
                Signed in as a <span className="font-medium">{selectedWorkspace.role}</span> in{" "}
                <span className="font-medium">{selectedWorkspace.name}</span>.
              </>
            ) : (
              "Choose a workspace to view projects."
            )}
          </p>
        </div>

        <div className="flex flex-col gap-1.5 sm:min-w-[280px]">
          <Label htmlFor="workspace-select">Workspace</Label>
          <select
            id="workspace-select"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus-visible:ring-2 focus-visible:ring-black/15 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            value={safeSelectedId ?? ""}
            onChange={(ev) => onWorkspaceChange(ev.target.value)}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {projectState.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            No projects in this workspace
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Create a project to start adding tasks.
          </p>
          <div className="mt-4">
            {safeSelectedId ? (
              <CreateProjectForm
                workspaceId={safeSelectedId}
                setError={setError}
                setSaving={setSaving}
                onCreated={() =>
                  router.replace(`/dashboard?workspaceId=${encodeURIComponent(safeSelectedId)}`)
                }
              />
            ) : null}
          </div>
        </div>
      ) : (
        <section className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projectState.map((project) => (
              <Link
                key={project.id}
                href={`/workspaces/${encodeURIComponent(safeSelectedId ?? "")}/projects/${encodeURIComponent(project.id)}`}
                className="group"
              >
                <div className="h-full rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold tracking-tight text-zinc-950 group-hover:underline dark:text-zinc-50">
                        {project.name}
                      </h2>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                        {project.counts.todo + project.counts.in_progress + project.counts.done} tasks
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusPill status="todo" count={project.counts.todo} />
                    <StatusPill status="in_progress" count={project.counts.in_progress} />
                    <StatusPill status="done" count={project.counts.done} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}
    </main>
  );
}

function HeaderBar({
  saving,
  error,
  onSignOut,
}: {
  saving: boolean;
  error: string | null;
  onSignOut: () => Promise<void>;
}) {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white dark:bg-zinc-50 dark:text-zinc-950">
          A
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Aspio
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-300">
            Realtime workspace task manager
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {error ? (
          <div className="hidden text-xs text-red-700 dark:text-red-200 sm:block">
            {error}
          </div>
        ) : null}
        <Button variant="secondary" onClick={onSignOut} disabled={saving}>
          {saving ? "Signing out..." : "Sign out"}
        </Button>
      </div>
    </header>
  );
}

function CreateWorkspaceForm({
  onCreated,
  setError,
  setSaving,
}: {
  onCreated: (workspaceId: string) => void;
  setError: (msg: string | null) => void;
  setSaving: (v: boolean) => void;
}) {
  const [name, setName] = useState<string>("My workspace");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { data: userData, error: userError } = await supabaseBrowser.auth.getUser();
      if (userError || !userData.user) {
        setError("You need to be authenticated to create a workspace.");
        return;
      }
      const userId = userData.user.id;
      const newWorkspaceId = crypto.randomUUID();

      const { error: workspaceError } = await supabaseBrowser
        .from("workspaces")
        .insert({ id: newWorkspaceId, name });

      if (workspaceError) {
        setError(workspaceError.message);
        return;
      }

      const { error: membershipError } = await supabaseBrowser
        .from("workspace_members")
        .insert({
          workspace_id: newWorkspaceId,
          user_id: userId,
          role: "owner",
          display_name: "You",
        });

      if (membershipError) {
        setError(membershipError.message);
        return;
      }

      onCreated(newWorkspaceId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Label htmlFor="workspace-name">Workspace name</Label>
        <Input
          id="workspace-name"
          name="workspace-name"
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          required
        />
      </div>
      <Button type="submit">Create workspace</Button>
    </form>
  );
}

function CreateProjectForm({
  workspaceId,
  setError,
  setSaving,
  onCreated,
}: {
  workspaceId: string;
  setError: (msg: string | null) => void;
  setSaving: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState<string>("New project");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const newProjectId = crypto.randomUUID();
      const { error: projectError } = await supabaseBrowser
        .from("projects")
        .insert({ id: newProjectId, workspace_id: workspaceId, name });

      if (projectError) {
        setError(projectError.message);
        return;
      }

      void newProjectId;
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Label htmlFor="project-name">Project name</Label>
        <Input
          id="project-name"
          name="project-name"
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          required
        />
      </div>
      <Button type="submit">Create project</Button>
    </form>
  );
}

