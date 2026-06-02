"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Tables } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TaskStatus = "todo" | "in_progress" | "done";

type WorkspaceMember = Pick<Tables<"workspace_members">, "user_id" | "display_name">;
type Task = Pick<
  Tables<"tasks">,
  "id" | "title" | "description" | "status" | "assignee_id" | "due_date"
>;

type OverdueTask = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  due_date: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
};

type Props = {
  workspaceId: string;
  projectId: string;
  projectName: string;
  members: WorkspaceMember[];
  initialTasks: Task[];
};

function formatDueDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fromDateInputValue(value: string): string | null {
  if (!value) return null;
  // Store as ISO timestamp at local midnight; Supabase will persist as timestamptz.
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "todo" || value === "in_progress" || value === "done";
}

export function ProjectViewClient({
  workspaceId,
  projectId,
  projectName,
  members,
  initialTasks,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    initialTasks[0]?.id ?? null,
  );

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  const [editing, setEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("todo");
  const [editAssigneeId, setEditAssigneeId] = useState<string>("");
  const [editDueDate, setEditDueDate] = useState<string>("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const [overdueLoading, setOverdueLoading] = useState<boolean>(false);
  const [overdueError, setOverdueError] = useState<string | null>(null);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);

  const [createMode, setCreateMode] = useState<boolean>(false);
  const [createTitle, setCreateTitle] = useState<string>("");
  const [createDescription, setCreateDescription] = useState<string>("");
  const [createStatus, setCreateStatus] = useState<TaskStatus>("todo");
  const [createAssigneeId, setCreateAssigneeId] = useState<string>("");
  const [createDueDate, setCreateDueDate] = useState<string>("");
  const [createSaving, setCreateSaving] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const channel = supabaseBrowser
      .channel(`project-tasks-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${projectId}`,
        },
        (payload: { old?: Partial<Task> | null; new?: Partial<Task> | null }) => {
          const oldId = payload.old?.id;
          const newId = payload.new?.id;
          const id = (typeof newId === "string" ? newId : oldId) ?? null;
          if (!id) return;
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;
          setTasks((prev) =>
            prev.map((t) => {
              if (t.id !== id) return t;
              const next: Task = {
                ...t,
                status: newStatus ?? t.status,
                title: typeof payload.new?.title === "string" ? payload.new.title : t.title,
                description:
                  typeof payload.new?.description === "string" ? payload.new.description : t.description,
                assignee_id:
                  typeof payload.new?.assignee_id === "string" ? payload.new.assignee_id : t.assignee_id,
                due_date:
                  typeof payload.new?.due_date === "string" ? payload.new.due_date : t.due_date,
              };

              return next;
            }),
          );

          // If someone else changed the selected task, close edit mode to prevent confusing conflicts.
          if (selectedTaskId && id === selectedTaskId && oldStatus && newStatus && oldStatus !== newStatus) {
            setEditing(false);
            setSaveError(null);
          }
        },
      );
    channel.subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [projectId, selectedTaskId]);

  const statusParam = searchParams.get("status");
  const assigneeParam = searchParams.get("assignee");

  const statusFilter: TaskStatus | "all" = useMemo(() => {
    if (statusParam === "todo" || statusParam === "in_progress" || statusParam === "done") return statusParam;
    return "all";
  }, [statusParam]);

  const assigneeFilter: string | "all" = useMemo(() => {
    if (assigneeParam === null || assigneeParam === "all") return "all";
    if (assigneeParam === "unassigned") return "unassigned";
    return assigneeParam;
  }, [assigneeParam]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const statusOk = statusFilter === "all" ? true : t.status === statusFilter;
      const assigneeOk =
        assigneeFilter === "all"
          ? true
          : assigneeFilter === "unassigned"
            ? t.assignee_id === null
            : t.assignee_id === assigneeFilter;
      return statusOk && assigneeOk;
    });
  }, [tasks, statusFilter, assigneeFilter]);

  const updateFiltersInUrl = (next: {
    status?: TaskStatus | "all";
    assignee?: string | "all" | "unassigned";
  }): void => {
    const params = new URLSearchParams(searchParams.toString());

    if (next.status !== undefined) {
      if (next.status === "all") params.delete("status");
      else params.set("status", next.status);
    }
    if (next.assignee !== undefined) {
      if (next.assignee === "all") params.delete("assignee");
      else params.set("assignee", next.assignee);
    }

    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
  };

  const openEdit = () => {
    if (!selectedTask) return;
    setSaveError(null);
    setEditing(true);
    setEditTitle(selectedTask.title);
    setEditDescription(selectedTask.description);
    setEditStatus(selectedTask.status);
    setEditAssigneeId(selectedTask.assignee_id ?? "");
    setEditDueDate(toDateInputValue(selectedTask.due_date));
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError(null);
  };

  const startCreate = () => {
    setCreateMode(true);
    setCreateError(null);
    setCreateTitle("");
    setCreateDescription("");
    setCreateStatus("todo");
    setCreateAssigneeId("");
    setCreateDueDate("");
  };

  const cancelCreate = () => {
    setCreateMode(false);
    setCreateError(null);
  };

  const onCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateSaving(true);
    setCreateError(null);

    try {
      const { data: inserted, error: insertError } = await supabaseBrowser
        .from("tasks")
        .insert({
          project_id: projectId,
          title: createTitle,
          description: createDescription,
          status: createStatus,
          assignee_id: createAssigneeId ? createAssigneeId : null,
          due_date: fromDateInputValue(createDueDate),
        })
        .select("id,title,description,status,assignee_id,due_date")
        .single();

      if (insertError || !inserted) {
        setCreateError(insertError?.message ?? "Failed to create task.");
        return;
      }

      const newTask: Task = {
        id: inserted.id,
        title: inserted.title,
        description: inserted.description,
        status: inserted.status,
        assignee_id: inserted.assignee_id,
        due_date: inserted.due_date,
      };

      if (!newTask.id) {
        setCreateError("Task created but was missing an id.");
        return;
      }

      setTasks((prev) => [...prev, newTask]);
      setSelectedTaskId(newTask.id);
      setCreateMode(false);
    } finally {
      setCreateSaving(false);
    }
  };

  const onSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTask) return;
    setSaving(true);
    setSaveError(null);

    const prevTasks = tasks;

    const optimistic: Task = {
      ...selectedTask,
      title: editTitle,
      description: editDescription,
      status: editStatus,
      assignee_id: editAssigneeId ? editAssigneeId : null,
      due_date: fromDateInputValue(editDueDate),
    };

    // Optimistic UI: update local state immediately.
    setTasks((prev) => prev.map((t) => (t.id === optimistic.id ? optimistic : t)));
    setEditing(false);

    try {
      const { error } = await supabaseBrowser
        .from("tasks")
        .update({
          title: editTitle,
          description: editDescription,
          status: editStatus,
          assignee_id: editAssigneeId ? editAssigneeId : null,
          due_date: fromDateInputValue(editDueDate),
        })
        .eq("id", selectedTask.id);

      if (error) {
        // Rollback if the API update failed.
        setTasks(prevTasks);
        setEditing(true);
        setSaveError(`Save failed: ${error.message}`);
        return;
      }
    } finally {
      setSaving(false);
    }
  };

  const invokeOverdue = async () => {
    setOverdueLoading(true);
    setOverdueError(null);
    try {
      const { data, error } = await supabaseBrowser.functions.invoke("overdue-tasks", {
        body: { project_id: projectId },
      });

      if (error) {
        setOverdueError(error.message);
        setOverdueTasks([]);
        return;
      }

      setOverdueTasks((data as OverdueTask[]) ?? []);
    } catch {
      setOverdueError("Failed to load overdue tasks.");
      setOverdueTasks([]);
    } finally {
      setOverdueLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <Link className="underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-50" href={`/dashboard?workspaceId=${encodeURIComponent(workspaceId)}`}>
              Back to dashboard
            </Link>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {projectName}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Update task status instantly across all connected users.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={invokeOverdue} disabled={overdueLoading}>
            {overdueLoading ? "Loading..." : "Overdue tasks"}
          </Button>
        </div>
      </div>

      {overdueError ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {overdueError}
        </div>
      ) : null}

      {overdueTasks.length > 0 ? (
        <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Overdue (due date passed, not done)
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-[520px] w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-600 dark:text-zinc-300">
                  <th className="py-2 pr-4 font-medium">Task</th>
                  <th className="py-2 pr-4 font-medium">Assignee</th>
                  <th className="py-2 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {overdueTasks.map((t) => (
                  <tr key={t.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">{t.title}</div>
                      <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                        {t.status.replace("_", " ")}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-zinc-700 dark:text-zinc-200">
                      {t.assignee_name ?? "—"}
                    </td>
                    <td className="py-3 text-zinc-700 dark:text-zinc-200">{formatDueDate(t.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-1 flex-col gap-1">
              <Label>Status</Label>
              <select
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-black/15 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                value={statusFilter}
                onChange={(ev) => updateFiltersInUrl({ status: ev.target.value as TaskStatus | "all" })}
              >
                <option value="all">All</option>
                <option value="todo">Todo</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div className="flex flex-1 flex-col gap-1">
              <Label>Assignee</Label>
              <select
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-black/15 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                value={assigneeFilter}
                onChange={(ev) =>
                  updateFiltersInUrl({ assignee: ev.target.value as string | "all" | "unassigned" })
                }
              >
                <option value="all">All</option>
                <option value="unassigned">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
              No tasks yet in this project.
              <div className="mt-3">
                <Button variant="secondary" onClick={startCreate}>
                  Add your first task
                </Button>
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
              No tasks match the current filters.
              <div className="mt-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    updateFiltersInUrl({ status: "all", assignee: "all" });
                  }}
                >
                  Clear filters
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredTasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`w-full rounded-xl px-3 py-3 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40 ${
                    selectedTaskId === t.id
                      ? "bg-zinc-50 dark:bg-zinc-900/40"
                      : "bg-transparent"
                  }`}
                  onClick={() => {
                    setSelectedTaskId(t.id);
                    setEditing(false);
                    setSaveError(null);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-zinc-950 dark:text-zinc-50">
                        {t.title}
                      </div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                        Due {formatDueDate(t.due_date)}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <TaskStatusBadge status={t.status} />
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                        {t.assignee_id
                          ? members.find((m) => m.user_id === t.assignee_id)?.display_name ?? "—"
                          : "Unassigned"}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Task detail
              </h2>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                Edit fields inline. Changes are synced in realtime.
              </p>
            </div>
            {selectedTask ? (
              <div className="flex items-center gap-2">
                {!editing ? (
                  <Button variant="secondary" onClick={openEdit}>
                    Edit
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
                    Cancel
                  </Button>
                )}
              </div>
            ) : null}
          </div>

          {!selectedTask ? (
            tasks.length === 0 ? (
              <div className="mt-4">
                {!createMode ? (
                  <>
                    <div className="text-sm text-zinc-600 dark:text-zinc-300">
                      This project doesn’t have tasks yet.
                    </div>
                    <div className="mt-3">
                      <Button variant="secondary" onClick={startCreate}>
                        Add your first task
                      </Button>
                    </div>
                  </>
                ) : (
                  <form className="flex flex-col gap-4" onSubmit={onCreate}>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="create-title">Title</Label>
                      <Input
                        id="create-title"
                        value={createTitle}
                        onChange={(ev) => setCreateTitle(ev.target.value)}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="create-description">Description</Label>
                      <Textarea
                        id="create-description"
                        value={createDescription}
                        onChange={(ev) => setCreateDescription(ev.target.value)}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="create-status">Status</Label>
                        <select
                          id="create-status"
                          className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-black/15 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                          value={createStatus}
                          onChange={(ev) => setCreateStatus(ev.target.value as TaskStatus)}
                        >
                          <option value="todo">Todo</option>
                          <option value="in_progress">In progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="create-assignee">Assignee</Label>
                        <select
                          id="create-assignee"
                          className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-black/15 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                          value={createAssigneeId}
                          onChange={(ev) => setCreateAssigneeId(ev.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {members.map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                              {m.display_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="create-due_date">Due date</Label>
                      <Input
                        id="create-due_date"
                        type="date"
                        value={createDueDate}
                        onChange={(ev) => setCreateDueDate(ev.target.value)}
                      />
                    </div>

                    {createError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                        {createError}
                      </div>
                    ) : null}

                    <div className="flex items-center gap-2">
                      <Button type="submit" disabled={createSaving}>
                        {createSaving ? "Creating..." : "Create task"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={cancelCreate}
                        disabled={createSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
                Pick a task from the list.
              </div>
            )
          ) : (
            <form className="mt-4" onSubmit={onSave}>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="title">Title</Label>
                  {editing ? (
                    <Input
                      id="title"
                      value={editTitle}
                      onChange={(ev) => setEditTitle(ev.target.value)}
                      required
                    />
                  ) : (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
                      {selectedTask.title}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="description">Description</Label>
                  {editing ? (
                    <Textarea
                      id="description"
                      value={editDescription}
                      onChange={(ev) => setEditDescription(ev.target.value)}
                    />
                  ) : (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
                      {selectedTask.description || "—"}
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="status">Status</Label>
                    {editing ? (
                      <select
                        id="status"
                        className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-black/15 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                        value={editStatus}
                        onChange={(ev) => setEditStatus(ev.target.value as TaskStatus)}
                      >
                        <option value="todo">Todo</option>
                        <option value="in_progress">In progress</option>
                        <option value="done">Done</option>
                      </select>
                    ) : (
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
                        <TaskStatusBadge status={selectedTask.status} inline />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="assignee">Assignee</Label>
                    {editing ? (
                      <select
                        id="assignee"
                        className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-black/15 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                        value={editAssigneeId}
                        onChange={(ev) => setEditAssigneeId(ev.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.user_id} value={m.user_id}>
                            {m.display_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
                        {selectedTask.assignee_id
                          ? members.find((m) => m.user_id === selectedTask.assignee_id)?.display_name ??
                            "—"
                          : "Unassigned"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="due_date">Due date</Label>
                  {editing ? (
                    <Input
                      id="due_date"
                      type="date"
                      value={editDueDate}
                      onChange={(ev) => setEditDueDate(ev.target.value)}
                    />
                  ) : (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
                      {formatDueDate(selectedTask.due_date)}
                    </div>
                  )}
                </div>

                {saveError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                    {saveError}
                  </div>
                ) : null}

                {editing ? (
                  <div className="flex items-center gap-2">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Save changes"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={cancelEdit} disabled={saving}>
                      Discard
                    </Button>
                  </div>
                ) : null}
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function TaskStatusBadge({
  status,
  inline,
}: {
  status: TaskStatus;
  inline?: boolean;
}) {
  const classesByStatus: Record<TaskStatus, string> = {
    todo: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50",
    in_progress: "bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100",
    done: "bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100",
  };

  const label =
    status === "todo" ? "Todo" : status === "in_progress" ? "In progress" : "Done";

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-medium ${
        classesByStatus[status]
      } ${inline ? "w-fit" : ""}`}
    >
      {label}
    </div>
  );
}

