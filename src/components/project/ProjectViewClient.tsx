"use client";

import { useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { parseOverdueTasksResponse } from "@/lib/overdue";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/ToastProvider";
import { CommandPaletteTrigger } from "@/components/ui/CommandPalette";
import {
  useRealtimeTasks,
  useDeleteTask,
  type TaskRow,
} from "@/hooks/useRealtimeTasks";
import {
  formatDueDate,
  fromDateInputValue,
  getAssigneeName,
  isOverdue,
  toDateInputValue,
  type OverdueTask,
  type TaskStatus,
  type WorkspaceMember,
} from "@/components/project/shared";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Pencil,
  X,
  Save,
  AlertTriangle,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  Circle,
  Calendar,
  User,
  ChevronDown,
  LayoutList,
  LayoutGrid,
} from "lucide-react";

type Props = {
  workspaceId: string;
  projectId: string;
  projectName: string;
  members: WorkspaceMember[];
  initialTasks: TaskRow[];
};

const STATUS_OPTIONS: { value: TaskStatus; label: string; icon: typeof Circle; color: string }[] = [
  { value: "todo", label: "Todo", icon: Circle, color: "text-white/60" },
  { value: "in_progress", label: "In Progress", icon: Clock, color: "text-electric-blue" },
  { value: "done", label: "Done", icon: CheckCircle2, color: "text-mint" },
];

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
  const { toast } = useToast();

  const { tasks, setTasks } = useRealtimeTasks(projectId, initialTasks);
  const deleteTask = useDeleteTask(setTasks);

  const initialSelectedTask = initialTasks[0] ?? null;

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    initialSelectedTask?.id ?? null,
  );

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  // Inline edit state (always editable when a task is selected)
  const [editTitle, setEditTitle] = useState<string>(initialSelectedTask?.title ?? "");
  const [editDescription, setEditDescription] = useState<string>(initialSelectedTask?.description ?? "");
  const [editStatus, setEditStatus] = useState<TaskStatus>(initialSelectedTask?.status ?? "todo");
  const [editAssigneeId, setEditAssigneeId] = useState<string>(initialSelectedTask?.assignee_id ?? "");
  const [editDueDate, setEditDueDate] = useState<string>(toDateInputValue(initialSelectedTask?.due_date ?? null));
  const [saving, setSaving] = useState<boolean>(false);

  const syncEditFormFromTask = (task: TaskRow): void => {
    setEditTitle(task.title);
    setEditDescription(task.description);
    setEditStatus(task.status);
    setEditAssigneeId(task.assignee_id ?? "");
    setEditDueDate(toDateInputValue(task.due_date));
  };

  const isEditDirty = useMemo(() => {
    if (!selectedTask) return false;
    return (
      editTitle !== selectedTask.title ||
      editDescription !== selectedTask.description ||
      editStatus !== selectedTask.status ||
      (editAssigneeId || null) !== selectedTask.assignee_id ||
      fromDateInputValue(editDueDate) !== selectedTask.due_date
    );
  }, [selectedTask, editTitle, editDescription, editStatus, editAssigneeId, editDueDate]);

  // Create state
  const [createMode, setCreateMode] = useState<boolean>(false);
  const [createTitle, setCreateTitle] = useState<string>("");
  const [createDescription, setCreateDescription] = useState<string>("");
  const [createStatus, setCreateStatus] = useState<TaskStatus>("todo");
  const [createAssigneeId, setCreateAssigneeId] = useState<string>("");
  const [createDueDate, setCreateDueDate] = useState<string>("");
  const [createSaving, setCreateSaving] = useState<boolean>(false);

  const selectTask = (id: string): void => {
    setSelectedTaskId(id);
    setCreateMode(false);
    const task = tasks.find((t) => t.id === id);
    if (task) syncEditFormFromTask(task);
  };

  // Overdue state
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [overdueOpen, setOverdueOpen] = useState<boolean>(false);
  const [overdueLoading, setOverdueLoading] = useState<boolean>(false);
  const [overdueError, setOverdueError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>("");

  // View mode
  const [viewMode, setViewMode] = useState<"list" | "board">("list");

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter state from URL
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
    const q = searchQuery.toLowerCase().trim();
    return tasks.filter((t) => {
      const statusOk = statusFilter === "all" || t.status === statusFilter;
      const assigneeOk =
        assigneeFilter === "all"
          ? true
          : assigneeFilter === "unassigned"
            ? t.assignee_id === null
            : t.assignee_id === assigneeFilter;
      const searchOk = !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
      return statusOk && assigneeOk && searchOk;
    });
  }, [tasks, statusFilter, assigneeFilter, searchQuery]);

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

  const resetEditForm = (): void => {
    if (selectedTask) syncEditFormFromTask(selectedTask);
  };

  const onSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTask) return;
    setSaving(true);

    const prevTasks = tasks;
    const optimistic: TaskRow = {
      ...selectedTask,
      title: editTitle,
      description: editDescription,
      status: editStatus,
      assignee_id: editAssigneeId ? editAssigneeId : null,
      due_date: fromDateInputValue(editDueDate),
    };

    setTasks((prev) => prev.map((t) => (t.id === optimistic.id ? optimistic : t)));

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
      setTasks(prevTasks);
      syncEditFormFromTask(prevTasks.find((t) => t.id === selectedTask.id) ?? selectedTask);
      toast({
        variant: "error",
        title: "Save failed",
        description: error.message,
      });
    } else {
      toast({ variant: "success", title: "Task updated" });
    }
    setSaving(false);
  };

  const onCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateSaving(true);

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
      toast({
        variant: "error",
        title: "Failed to create task",
        description: insertError?.message ?? "Unknown error",
      });
      setCreateSaving(false);
      return;
    }

    const newTask: TaskRow = {
      id: inserted.id,
      title: inserted.title,
      description: inserted.description,
      status: inserted.status,
      assignee_id: inserted.assignee_id,
      due_date: inserted.due_date,
    };

    setTasks((prev) => [...prev, newTask]);
    setSelectedTaskId(newTask.id);
    syncEditFormFromTask(newTask);
    setCreateMode(false);
    setCreateSaving(false);
    toast({ variant: "success", title: "Task created", description: createTitle });
  };

  const handleDelete = async (taskId: string) => {
    setConfirmDeleteId(null);
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
    const success = await deleteTask(taskId);
    if (success) {
      toast({ variant: "success", title: "Task deleted" });
    } else {
      toast({ variant: "error", title: "Delete failed", description: "Could not delete task. Rolled back." });
    }
  };

  const handleQuickStatusChange = async (task: TaskRow, newStatus: TaskStatus) => {
    const prevTasks = tasks;
    // Optimistic
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    if (selectedTaskId === task.id) {
      setEditStatus(newStatus);
    }

    const { error } = await supabaseBrowser
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", task.id);

    if (error) {
      setTasks(prevTasks);
      toast({ variant: "error", title: "Status update failed", description: error.message });
    } else {
      toast({
        variant: "success",
        title: `Moved to ${newStatus === "todo" ? "Todo" : newStatus === "in_progress" ? "In Progress" : "Done"}`,
        description: task.title,
      });
    }
  };

  const invokeOverdue = async (): Promise<void> => {
    setOverdueOpen(true);
    setOverdueLoading(true);
    setOverdueError(null);
    setOverdueTasks([]);

    const { data, error } = await supabaseBrowser.functions.invoke("overdue-tasks", {
      body: { project_id: projectId },
    });

    setOverdueLoading(false);

    if (error) {
      setOverdueError(error.message);
      toast({
        variant: "error",
        title: "Overdue check failed",
        description: error.message,
      });
      return;
    }

    const parsed = parseOverdueTasksResponse(data);
    setOverdueTasks(parsed);

    if (parsed.length === 0) {
      toast({ variant: "success", title: "All on track!", description: "No overdue tasks found." });
    } else {
      toast({
        variant: "warning",
        title: `${parsed.length} overdue task${parsed.length > 1 ? "s" : ""}`,
        description: "Results from the Edge Function (RLS enforced).",
      });
    }
  };

  const startCreate = () => {
    setCreateMode(true);
    setCreateTitle("");
    setCreateDescription("");
    setCreateStatus("todo");
    setCreateAssigneeId("");
    setCreateDueDate("");
  };

  const cancelCreate = () => setCreateMode(false);

  // Stats
  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <Link
            className="inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-cyan"
            href={`/dashboard?workspaceId=${encodeURIComponent(workspaceId)}`}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
            {projectName}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CommandPaletteTrigger />
          {/* View mode toggle */}
          <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.03] p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                viewMode === "list"
                  ? "bg-white/[0.1] text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" /> List
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                viewMode === "board"
                  ? "bg-white/[0.1] text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Board
            </button>
          </div>
          <button
            onClick={startCreate}
            disabled={createMode}
            className="btn-glow flex items-center gap-2 !py-2.5 !px-4 !text-sm disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> New task
          </button>
          <button
            onClick={() => void invokeOverdue()}
            disabled={overdueLoading}
            className="btn-glass flex items-center gap-2 !py-2.5 !px-4 !text-sm disabled:opacity-50"
          >
            <AlertTriangle className="h-4 w-4" />
            {overdueLoading ? "Checking..." : "Overdue"}
          </button>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {[
          { label: "Todo", count: todoCount, color: "from-white/5 to-white/[0.02]", icon: Circle, iconColor: "text-white/50" },
          { label: "In Progress", count: inProgressCount, color: "from-indigo/10 to-indigo/5", icon: Clock, iconColor: "text-electric-blue" },
          { label: "Done", count: doneCount, color: "from-mint/10 to-mint/5", icon: CheckCircle2, iconColor: "text-mint" },
        ].map((stat) => (
          <div key={stat.label} className={`glass-card flex items-center gap-3 p-4 bg-gradient-to-br ${stat.color}`}>
            <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
            <div>
              <p className="text-2xl font-bold text-white">{stat.count}</p>
              <p className="text-xs text-white/40">{stat.label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Overdue panel */}
      <AnimatePresence>
        {overdueOpen && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card mt-4 p-5 border-yellow-500/20">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  Overdue Tasks
                </h2>
                <button onClick={() => setOverdueOpen(false)} className="text-white/30 hover:text-white/60">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {overdueLoading ? (
                <div className="mt-3 space-y-2">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />
                  ))}
                </div>
              ) : overdueError ? (
                <p className="mt-3 text-sm text-red-300">{overdueError}</p>
              ) : overdueTasks.length === 0 ? (
                <p className="mt-3 text-sm text-white/40">
                  No overdue tasks — all on track!
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {overdueTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <div>
                        <p className="text-sm font-medium text-white">{t.title}</p>
                        <p className="text-xs text-white/40">
                          Due {formatDueDate(t.due_date)} · {t.assignee_name ?? "Unassigned"}
                        </p>
                      </div>
                      <TaskStatusBadge status={t.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Main content: task list + detail */}
      <section className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Task list panel */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card overflow-hidden"
        >
          {/* Filters */}
          <div className="border-b border-white/[0.06] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="glass-input h-10 w-full !py-2 text-sm"
                  style={{ paddingLeft: "2.25rem" }}
                />
              </div>

              {/* Status filter */}
              <div className="relative">
                <select
                  className="glass-input h-10 w-full cursor-pointer appearance-none pr-8 text-sm sm:w-36"
                  value={statusFilter}
                  onChange={(ev) => updateFiltersInUrl({ status: ev.target.value as TaskStatus | "all" })}
                >
                  <option value="all" className="bg-[#0a0e27]">All Status</option>
                  <option value="todo" className="bg-[#0a0e27]">Todo</option>
                  <option value="in_progress" className="bg-[#0a0e27]">In Progress</option>
                  <option value="done" className="bg-[#0a0e27]">Done</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              </div>

              {/* Assignee filter */}
              <div className="relative">
                <select
                  className="glass-input h-10 w-full cursor-pointer appearance-none pr-8 text-sm sm:w-40"
                  value={assigneeFilter}
                  onChange={(ev) => updateFiltersInUrl({ assignee: ev.target.value as string | "all" | "unassigned" })}
                >
                  <option value="all" className="bg-[#0a0e27]">All People</option>
                  <option value="unassigned" className="bg-[#0a0e27]">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id} className="bg-[#0a0e27]">
                      {m.display_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              </div>
            </div>
            {(statusFilter !== "all" || assigneeFilter !== "all" || searchQuery) && (
              <button
                onClick={() => {
                  updateFiltersInUrl({ status: "all", assignee: "all" });
                  setSearchQuery("");
                }}
                className="mt-2 text-xs text-cyan/70 hover:text-cyan transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Task list */}
          <div className="max-h-[520px] overflow-y-auto">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                  <Plus className="h-7 w-7 text-white/30" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">No tasks yet</h3>
                <p className="mt-1.5 text-sm text-white/40">Create your first task to get started.</p>
                <button onClick={startCreate} className="btn-glow mt-5 !py-2.5 !px-5 !text-sm">
                  <Plus className="h-4 w-4 inline mr-1.5" /> Create task
                </button>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <Search className="h-8 w-8 text-white/20" />
                <h3 className="mt-3 text-base font-semibold text-white">No matches</h3>
                <p className="mt-1 text-sm text-white/40">Try adjusting your filters or search.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                <AnimatePresence mode="popLayout">
                  {filteredTasks.map((t) => (
                    <motion.div
                      key={t.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      transition={{ duration: 0.15 }}
                      className={`group relative flex items-start gap-3 p-4 transition-colors cursor-pointer ${
                        selectedTaskId === t.id
                          ? "bg-white/[0.05]"
                          : "hover:bg-white/[0.03]"
                      }`}
                      onClick={() => selectTask(t.id)}
                    >
                      {/* Status quick-toggle */}
                      <StatusDot
                        status={t.status}
                        onClick={(e) => {
                          e.stopPropagation();
                          const next: TaskStatus =
                            t.status === "todo" ? "in_progress" : t.status === "in_progress" ? "done" : "todo";
                          handleQuickStatusChange(t, next);
                        }}
                      />

                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${t.status === "done" ? "text-white/50 line-through" : "text-white"}`}>
                          {t.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/35">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDueDate(t.due_date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {getAssigneeName(t.assignee_id, members)}
                          </span>
                          {isOverdue(t.due_date, t.status) && (
                            <span className="flex items-center gap-1 text-red-400">
                              <AlertTriangle className="h-3 w-3" /> Overdue
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <TaskStatusBadge status={t.status} />
                        {/* Delete button - appears on hover */}
                        {confirmDeleteId === t.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="rounded-lg bg-red-500/20 p-1.5 text-red-400 hover:bg-red-500/30"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-lg bg-white/10 p-1.5 text-white/50 hover:bg-white/20"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(t.id);
                            }}
                            className="rounded-lg p-1.5 text-white/20 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
          <div className="border-t border-white/[0.06] px-4 py-3 text-xs text-white/30">
            {filteredTasks.length} of {tasks.length} tasks
          </div>
        </motion.div>

        {/* Task detail panel */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
            <div>
              <h2 className="text-sm font-bold text-white">Task Detail</h2>
              <p className="text-xs text-white/35 mt-0.5">
                {selectedTask
                  ? isEditDirty
                    ? "Unsaved changes — save or discard"
                    : "All fields editable inline"
                  : "Select a task to view details"}
              </p>
            </div>
          </div>

          <div className="p-5">
            <AnimatePresence mode="wait">
              {!selectedTask ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-10 text-center"
                >
                  {!createMode ? (
                    <>
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                        <Pencil className="h-6 w-6 text-white/20" />
                      </div>
                      <p className="mt-4 text-sm text-white/40">
                        {tasks.length === 0 ? "No tasks yet" : "Select a task from the list"}
                      </p>
                      {tasks.length === 0 && (
                        <button onClick={startCreate} className="btn-glass mt-4 !py-2 !px-4 !text-xs">
                          <Plus className="h-3.5 w-3.5 inline mr-1" /> Add task
                        </button>
                      )}
                    </>
                  ) : (
                    <CreateTaskForm
                      createTitle={createTitle}
                      setCreateTitle={setCreateTitle}
                      createDescription={createDescription}
                      setCreateDescription={setCreateDescription}
                      createStatus={createStatus}
                      setCreateStatus={setCreateStatus}
                      createAssigneeId={createAssigneeId}
                      setCreateAssigneeId={setCreateAssigneeId}
                      createDueDate={createDueDate}
                      setCreateDueDate={setCreateDueDate}
                      createSaving={createSaving}
                      members={members}
                      onSubmit={onCreate}
                      onCancel={cancelCreate}
                    />
                  )}
                </motion.div>
              ) : (
                <motion.form
                  key={selectedTask.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  onSubmit={onSave}
                  className="flex flex-col gap-4"
                >
                  <Field label="Title">
                    <input
                      value={editTitle}
                      onChange={(ev) => setEditTitle(ev.target.value)}
                      required
                      className="glass-input h-11 w-full text-sm"
                    />
                  </Field>
                  <Field label="Description">
                    <Textarea
                      value={editDescription}
                      onChange={(ev) => setEditDescription(ev.target.value)}
                    />
                  </Field>
                  <div className="grid gap-3 grid-cols-2">
                    <Field label="Status">
                      <select
                        className="glass-input h-10 w-full cursor-pointer text-sm"
                        value={editStatus}
                        onChange={(ev) => setEditStatus(ev.target.value as TaskStatus)}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value} className="bg-[#0a0e27]">{o.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Assignee">
                      <select
                        className="glass-input h-10 w-full cursor-pointer text-sm"
                        value={editAssigneeId}
                        onChange={(ev) => setEditAssigneeId(ev.target.value)}
                      >
                        <option value="" className="bg-[#0a0e27]">Unassigned</option>
                        {members.map((m) => (
                          <option key={m.user_id} value={m.user_id} className="bg-[#0a0e27]">{m.display_name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Due date">
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(ev) => setEditDueDate(ev.target.value)}
                      className="glass-input h-11 w-full text-sm"
                    />
                  </Field>
                  {isEditDirty && (
                    <div className="flex items-center gap-2 pt-2">
                      <button type="submit" disabled={saving} className="btn-glow flex items-center gap-2 !py-2.5 !text-sm disabled:opacity-50">
                        <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
                      </button>
                      <button type="button" onClick={resetEditForm} disabled={saving} className="btn-glass !py-2.5 !text-sm disabled:opacity-50">
                        Cancel
                      </button>
                    </div>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </section>

      {/* Board view */}
      {viewMode === "board" && (
        <KanbanBoard
          tasks={filteredTasks}
          members={members}
          onSelectTask={(id: string) => {
            selectTask(id);
            setViewMode("list");
          }}
          onStatusChange={handleQuickStatusChange}
        />
      )}
    </main>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium tracking-wide text-white/50">{label}</label>
      {children}
    </div>
  );
}

function StatusDot({
  status,
  onClick,
}: {
  status: TaskStatus;
  onClick: (e: React.MouseEvent) => void;
}) {
  const colors: Record<TaskStatus, string> = {
    todo: "bg-white/20 border-white/30",
    in_progress: "bg-electric-blue border-electric-blue/50",
    done: "bg-mint border-mint/50",
  };

  return (
    <button
      onClick={onClick}
      className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 transition-all hover:scale-125 ${colors[status]}`}
      title={`Status: ${status}. Click to cycle.`}
    />
  );
}

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config: Record<TaskStatus, { bg: string; text: string; label: string }> = {
    todo: { bg: "bg-white/[0.06] border-white/[0.1]", text: "text-white/60", label: "Todo" },
    in_progress: { bg: "bg-indigo/15 border-indigo/25", text: "text-electric-blue", label: "In Progress" },
    done: { bg: "bg-mint/15 border-mint/25", text: "text-mint", label: "Done" },
  };
  const { bg, text, label } = config[status];

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}

type CreateFormProps = {
  createTitle: string;
  setCreateTitle: (v: string) => void;
  createDescription: string;
  setCreateDescription: (v: string) => void;
  createStatus: TaskStatus;
  setCreateStatus: (v: TaskStatus) => void;
  createAssigneeId: string;
  setCreateAssigneeId: (v: string) => void;
  createDueDate: string;
  setCreateDueDate: (v: string) => void;
  createSaving: boolean;
  members: WorkspaceMember[];
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

function CreateTaskForm({
  createTitle,
  setCreateTitle,
  createDescription,
  setCreateDescription,
  createStatus,
  setCreateStatus,
  createAssigneeId,
  setCreateAssigneeId,
  createDueDate,
  setCreateDueDate,
  createSaving,
  members,
  onSubmit,
  onCancel,
}: CreateFormProps) {
  return (
    <form className="w-full flex flex-col gap-4 text-left" onSubmit={onSubmit}>
      <h3 className="text-base font-bold text-white">New Task</h3>
      <Field label="Title">
        <input
          value={createTitle}
          onChange={(ev) => setCreateTitle(ev.target.value)}
          required
          className="glass-input h-11 w-full text-sm"
          placeholder="What needs to be done?"
          autoFocus
        />
      </Field>
      <Field label="Description">
        <Textarea
          value={createDescription}
          onChange={(ev) => setCreateDescription(ev.target.value)}
          placeholder="Add details..."
        />
      </Field>
      <div className="grid gap-3 grid-cols-2">
        <Field label="Status">
          <select
            className="glass-input h-10 w-full cursor-pointer text-sm"
            value={createStatus}
            onChange={(ev) => setCreateStatus(ev.target.value as TaskStatus)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#0a0e27]">{o.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Assignee">
          <select
            className="glass-input h-10 w-full cursor-pointer text-sm"
            value={createAssigneeId}
            onChange={(ev) => setCreateAssigneeId(ev.target.value)}
          >
            <option value="" className="bg-[#0a0e27]">Unassigned</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id} className="bg-[#0a0e27]">{m.display_name}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Due date">
        <input
          type="date"
          value={createDueDate}
          onChange={(ev) => setCreateDueDate(ev.target.value)}
          className="glass-input h-11 w-full text-sm"
        />
      </Field>
      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={createSaving} className="btn-glow flex items-center gap-2 !py-2.5 !text-sm disabled:opacity-50">
          <Plus className="h-4 w-4" /> {createSaving ? "Creating..." : "Create"}
        </button>
        <button type="button" onClick={onCancel} disabled={createSaving} className="btn-glass !py-2.5 !text-sm disabled:opacity-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

type KanbanBoardProps = {
  tasks: TaskRow[];
  members: WorkspaceMember[];
  onSelectTask: (id: string) => void;
  onStatusChange: (task: TaskRow, newStatus: TaskStatus) => void;
};

function KanbanBoard({ tasks, members, onSelectTask, onStatusChange }: KanbanBoardProps) {
  const columns: { status: TaskStatus; label: string; color: string; dotColor: string }[] = [
    { status: "todo", label: "To Do", color: "text-white/60", dotColor: "bg-white/30" },
    { status: "in_progress", label: "In Progress", color: "text-electric-blue", dotColor: "bg-electric-blue" },
    { status: "done", label: "Done", color: "text-mint", dotColor: "bg-mint" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 grid gap-4 lg:grid-cols-3"
    >
      {columns.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.status);
        return (
          <div key={col.status} className="glass-card overflow-hidden p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${col.dotColor}`} />
                <h3 className={`text-sm font-bold ${col.color}`}>{col.label}</h3>
              </div>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-white/40">
                {columnTasks.length}
              </span>
            </div>
            <div className="space-y-2.5">
              <AnimatePresence mode="popLayout">
                {columnTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => onSelectTask(task.id)}
                    className="group cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 transition-all hover:border-white/[0.15] hover:bg-white/[0.06]"
                  >
                    <p className={`text-sm font-medium ${task.status === "done" ? "text-white/50 line-through" : "text-white"}`}>
                      {task.title}
                    </p>
                    <div className="mt-2.5 flex items-center gap-3 text-xs text-white/35">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDueDate(task.due_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {getAssigneeName(task.assignee_id, members)}
                      </span>
                    </div>
                    {isOverdue(task.due_date, task.status) && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                        <AlertTriangle className="h-3 w-3" /> Overdue
                      </div>
                    )}
                    {col.status !== "done" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const next: TaskStatus = col.status === "todo" ? "in_progress" : "done";
                          onStatusChange(task, next);
                        }}
                        className="mt-2.5 w-full rounded-lg border border-white/[0.06] bg-white/[0.03] py-1.5 text-xs text-white/40 opacity-0 transition-all hover:bg-white/[0.08] hover:text-white/70 group-hover:opacity-100"
                      >
                        Move to {col.status === "todo" ? "In Progress" : "Done"} →
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {columnTasks.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/[0.06] py-8 text-center text-xs text-white/20">
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
