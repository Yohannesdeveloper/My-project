"use client";

import { useMemo, useState, type FormEvent, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Database, Tables } from "@/lib/supabase/database.types";
import { useRealtimeProjectCounts } from "@/hooks/useRealtimeTasks";
import { useToast } from "@/components/ui/ToastProvider";
import { CommandPaletteTrigger } from "@/components/ui/CommandPalette";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  LogOut,
  FolderOpen,
  CheckCircle2,
  Clock,
  Circle,
  Trash2,
  ChevronDown,
  X,
  Layers,
  Activity,
  Users,
} from "lucide-react";

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

const STATUS_META: Record<
  TaskStatus,
  { label: string; bg: string; text: string; icon: typeof Circle }
> = {
  todo: {
    label: "Todo",
    bg: "bg-white/[0.04] border-white/[0.08]",
    text: "text-white/60",
    icon: Circle,
  },
  in_progress: {
    label: "In Progress",
    bg: "bg-indigo/10 border-indigo/20",
    text: "text-electric-blue",
    icon: Clock,
  },
  done: {
    label: "Done",
    bg: "bg-mint/10 border-mint/20",
    text: "text-mint",
    icon: CheckCircle2,
  },
};

function StatusPill({ status, count }: { status: TaskStatus; count: number }) {
  const { label, bg, text, icon: Icon } = STATUS_META[status];
  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${bg} ${text}`}>
      <Icon className="h-3 w-3" />
      <span className="font-medium">{label}:</span> {count}
    </div>
  );
}

// Custom dropdown workspace switcher
function WorkspaceSwitcher({
  workspaces,
  selectedId,
  onChange,
}: {
  workspaces: WorkspaceSummary[];
  selectedId: string | null;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = workspaces.find((w) => w.id === selectedId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-left transition-all hover:bg-white/[0.07] hover:border-white/[0.15]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo/30 to-purple/20 border border-indigo/20">
            <FolderOpen className="h-4 w-4 text-electric-blue" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{selected?.name ?? "Select workspace"}</p>
            <p className="text-xs text-white/40 capitalize">{selected?.role ?? "—"}</p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/[0.1] shadow-xl"
            style={{ background: "rgba(10, 14, 39, 0.97)", backdropFilter: "blur(20px)" }}
          >
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  onChange(w.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  w.id === selectedId
                    ? "bg-white/[0.08]"
                    : "hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo/20 to-purple/10 border border-indigo/10">
                  <FolderOpen className="h-3.5 w-3.5 text-electric-blue" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{w.name}</p>
                  <p className="text-xs text-white/40 capitalize">{w.role}</p>
                </div>
                {w.id === selectedId && (
                  <CheckCircle2 className="ml-auto h-4 w-4 text-cyan" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function WorkspaceDashboardClient({
  workspaces,
  selectedWorkspaceId,
  projects,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const initialCountsMap = useMemo(() => {
    const map: Record<string, ProjectCounts> = {};
    for (const p of projects) {
      map[p.id] = p.counts;
    }
    return map;
  }, [projects]);

  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);
  const liveCounts = useRealtimeProjectCounts(projectIds, initialCountsMap);

  const [saving, setSaving] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const projectSummaries: ProjectSummary[] = useMemo(
    () =>
      projects.map((p) => ({
        ...p,
        counts: liveCounts[p.id] ?? p.counts,
      })),
    [projects, liveCounts],
  );

  // Aggregate stats across all projects in current workspace
  const totalStats = useMemo(() => {
    let todo = 0;
    let inProgress = 0;
    let done = 0;
    for (const p of projectSummaries) {
      todo += p.counts.todo;
      inProgress += p.counts.in_progress;
      done += p.counts.done;
    }
    return { todo, inProgress, done, total: todo + inProgress + done };
  }, [projectSummaries]);

  const onWorkspaceChange = (workspaceId: string) => {
    router.replace(`/dashboard?workspaceId=${encodeURIComponent(workspaceId)}`);
  };

  const signOut = async () => {
    setSaving(true);
    try {
      await supabaseBrowser.auth.signOut();
      router.replace("/auth/sign-in");
    } catch {
      toast({ variant: "error", title: "Sign out failed" });
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    setConfirmDeleteId(null);
    const { error } = await supabaseBrowser
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      toast({ variant: "error", title: "Delete failed", description: error.message });
    } else {
      toast({ variant: "success", title: "Project deleted" });
      // Reload to reflect changes
      const currentWs = selectedWorkspaceId ?? workspaces[0]?.id ?? "";
      router.replace(`/dashboard?workspaceId=${encodeURIComponent(currentWs)}`);
    }
  };

  if (workspaces.length === 0) {
    return (
      <main className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6">
        <HeaderBar saving={saving} onSignOut={signOut} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card mt-10 p-8"
        >
          <h2 className="text-lg font-bold text-white">No workspaces yet</h2>
          <p className="mt-2 text-sm text-white/40">
            Create a workspace to start organizing projects and tasks.
          </p>
          <div className="mt-6">
            <CreateWorkspaceForm
              onCreated={(id) => onWorkspaceChange(id)}
              toast={toast}
            />
          </div>
        </motion.div>
      </main>
    );
  }

  const safeSelectedId = selectedWorkspaceId ?? workspaces[0]?.id ?? null;
  const selectedWorkspace = workspaces.find((w) => w.id === safeSelectedId) ?? null;

  return (
    <main className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6">
      <HeaderBar saving={saving} onSignOut={signOut} />

      {/* Top section: workspace switcher + stats */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.5fr]"
      >
        {/* Workspace switcher */}
        <div className="glass-card p-4">
          <p className="text-xs font-medium text-white/40 mb-3 tracking-wide uppercase">Workspace</p>
          <WorkspaceSwitcher
            workspaces={workspaces}
            selectedId={safeSelectedId}
            onChange={onWorkspaceChange}
          />
          {selectedWorkspace && (
            <div className="mt-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-white/30" />
              <span className="text-xs text-white/40">
                <span className="text-cyan capitalize">{selectedWorkspace.role}</span>
              </span>
            </div>
          )}
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Tasks", value: totalStats.total, gradient: "from-indigo/20 to-blue/10", icon: Activity },
            { label: "To Do", value: totalStats.todo, gradient: "from-white/5 to-white/[0.02]", icon: Circle },
            { label: "In Progress", value: totalStats.inProgress, gradient: "from-electric-blue/15 to-indigo/10", icon: Clock },
            { label: "Completed", value: totalStats.done, gradient: "from-mint/15 to-mint/5", icon: CheckCircle2 },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`glass-card bg-gradient-to-br ${stat.gradient} p-4`}
            >
              <stat.icon className="h-5 w-5 text-white/40" />
              <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/40">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Projects grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mt-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Projects</h2>
          {safeSelectedId && (
            <CreateProjectInline
              workspaceId={safeSelectedId}
              onCreated={() => {
                router.replace(`/dashboard?workspaceId=${encodeURIComponent(safeSelectedId)}`);
              }}
              toast={toast}
            />
          )}
        </div>

        {projectSummaries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 text-center"
          >
            <Layers className="mx-auto h-10 w-10 text-white/20" />
            <h3 className="mt-4 text-base font-semibold text-white">No projects yet</h3>
            <p className="mt-1.5 text-sm text-white/40">Create your first project to get started.</p>
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {projectSummaries.map((project, idx) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group relative"
                >
                  <Link
                    href={`/workspaces/${encodeURIComponent(safeSelectedId ?? "")}/projects/${encodeURIComponent(project.id)}`}
                    className="block"
                  >
                    <div className="glass-card glass-card-hover h-full p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo/25 to-purple/15 border border-indigo/20">
                          <FolderOpen className="h-5 w-5 text-electric-blue" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-bold text-white group-hover:text-cyan transition-colors">
                            {project.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-white/35">
                            {project.counts.todo + project.counts.in_progress + project.counts.done} tasks
                          </p>
                        </div>
                      </div>
                      {/* Progress bar */}
                      {(() => {
                        const total = project.counts.todo + project.counts.in_progress + project.counts.done;
                        if (total === 0) return null;
                        const donePct = Math.round((project.counts.done / total) * 100);
                        return (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
                              <span>{donePct}% complete</span>
                              <span>{project.counts.done}/{total}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${donePct}%` }}
                                transition={{ duration: 0.6, delay: 0.1 }}
                                className="h-full rounded-full bg-gradient-to-r from-mint to-cyan"
                              />
                            </div>
                          </div>
                        );
                      })()}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <StatusPill status="todo" count={project.counts.todo} />
                        <StatusPill status="in_progress" count={project.counts.in_progress} />
                        <StatusPill status="done" count={project.counts.done} />
                      </div>
                    </div>
                  </Link>

                  {/* Delete button (top right) */}
                  {confirmDeleteId === project.id ? (
                    <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-[#0a0e27]/95 p-1.5 backdrop-blur-lg">
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="rounded-lg bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/30"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg bg-white/10 px-2 py-1 text-xs text-white/60 hover:bg-white/20"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(project.id)}
                      className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-white/20 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </main>
  );
}

function HeaderBar({
  saving,
  onSignOut,
}: {
  saving: boolean;
  onSignOut: () => Promise<void>;
}) {
  return (
    <header className="flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo to-cyan">
          <Layers className="h-4 w-4 text-white" />
        </div>
        <span className="text-base font-bold text-white tracking-tight">Aspio</span>
      </Link>
      <div className="flex items-center gap-2">
        <CommandPaletteTrigger />
        <button
          onClick={onSignOut}
          disabled={saving}
          className="btn-glass flex items-center gap-2 !py-2 !px-4 !text-sm disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {saving ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </header>
  );
}

function CreateWorkspaceForm({
  onCreated,
  toast,
}: {
  onCreated: (workspaceId: string) => void;
  toast: (input: { variant: "success" | "error" | "info" | "warning"; title: string; description?: string }) => void;
}) {
  const [name, setName] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data: userData, error: userError } = await supabaseBrowser.auth.getUser();
      if (userError || !userData.user) {
        toast({ variant: "error", title: "Not authenticated" });
        return;
      }
      const userId = userData.user.id;
      const newWorkspaceId = crypto.randomUUID();

      const { error: workspaceError } = await supabaseBrowser
        .from("workspaces")
        .insert({ id: newWorkspaceId, name: name || "My Workspace" });

      if (workspaceError) {
        toast({ variant: "error", title: "Failed to create workspace", description: workspaceError.message });
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
        toast({ variant: "error", title: "Failed to add membership", description: membershipError.message });
        return;
      }

      toast({ variant: "success", title: "Workspace created", description: name });
      onCreated(newWorkspaceId);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="workspace-name" className="text-xs font-medium tracking-wide text-white/50">
          Workspace name
        </label>
        <input
          id="workspace-name"
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          placeholder="My Workspace"
          required
          className="glass-input mt-1.5 h-11 w-full text-sm"
        />
      </div>
      <button type="submit" disabled={submitting} className="btn-glow flex items-center gap-2 !py-2.5 disabled:opacity-50">
        <Plus className="h-4 w-4" /> {submitting ? "Creating..." : "Create workspace"}
      </button>
    </form>
  );
}

function CreateProjectInline({
  workspaceId,
  onCreated,
  toast,
}: {
  workspaceId: string;
  onCreated: () => void;
  toast: (input: { variant: "success" | "error" | "info" | "warning"; title: string; description?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabaseBrowser
      .from("projects")
      .insert({ id: crypto.randomUUID(), workspace_id: workspaceId, name: name || "New Project" });

    if (error) {
      toast({ variant: "error", title: "Failed to create project", description: error.message });
    } else {
      toast({ variant: "success", title: "Project created", description: name });
      setOpen(false);
      setName("");
      onCreated();
    }
    setSubmitting(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-glass flex items-center gap-2 !py-2 !px-4 !text-sm"
      >
        <Plus className="h-4 w-4" /> New project
      </button>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      onSubmit={onSubmit}
      className="flex items-center gap-2"
    >
      <input
        value={name}
        onChange={(ev) => setName(ev.target.value)}
        placeholder="Project name"
        required
        autoFocus
        className="glass-input h-9 w-40 text-sm !py-1.5"
      />
      <button type="submit" disabled={submitting} className="btn-glow !py-1.5 !px-3 !text-xs disabled:opacity-50">
        {submitting ? "..." : "Create"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="btn-glass !py-1.5 !px-2 !text-xs">
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.form>
  );
}
