"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronDown,
  Calendar,
  User,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  X,
  Plus,
} from "lucide-react";
import {
  formatDueDate,
  isOverdue,
  getAssigneeName,
  getNextStatus,
  type TaskRow,
  type TaskStatus,
  type WorkspaceMember,
} from "./shared";
import { StatusDot, TaskStatusBadge } from "./shared-ui";

type Props = {
  tasks: TaskRow[];
  totalCount: number;
  selectedTaskId: string | null;
  members: WorkspaceMember[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: TaskStatus | "all";
  assigneeFilter: string | "all";
  onFilterChange: (next: { status?: TaskStatus | "all"; assignee?: string | "all" | "unassigned" }) => void;
  onClearFilters: () => void;
  onSelectTask: (id: string) => void;
  onQuickStatusChange: (task: TaskRow, newStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onStartCreate: () => void;
};

export function TaskList({
  tasks,
  totalCount,
  selectedTaskId,
  members,
  searchQuery,
  onSearchChange,
  statusFilter,
  assigneeFilter,
  onFilterChange,
  onClearFilters,
  onSelectTask,
  onQuickStatusChange,
  onDeleteTask,
  onStartCreate,
}: Props) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const hasActiveFilters = statusFilter !== "all" || assigneeFilter !== "all" || !!searchQuery;

  return (
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
              onChange={(e) => onSearchChange(e.target.value)}
              className="glass-input h-10 w-full !py-2 text-sm"
              style={{ paddingLeft: "2.25rem" }}
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              className="glass-input h-10 w-full cursor-pointer appearance-none pr-8 text-sm sm:w-36"
              value={statusFilter}
              onChange={(ev) => onFilterChange({ status: ev.target.value as TaskStatus | "all" })}
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
              onChange={(ev) => onFilterChange({ assignee: ev.target.value as string | "all" | "unassigned" })}
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
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="mt-2 text-xs text-cyan/70 hover:text-cyan transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Task list */}
      <div className="max-h-[520px] overflow-y-auto">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08]">
              <Plus className="h-7 w-7 text-white/30" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">No tasks yet</h3>
            <p className="mt-1.5 text-sm text-white/40">Create your first task to get started.</p>
            <button onClick={onStartCreate} className="btn-glow mt-5 !py-2.5 !px-5 !text-sm">
              <Plus className="h-4 w-4 inline mr-1.5" /> Create task
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <Search className="h-8 w-8 text-white/20" />
            <h3 className="mt-3 text-base font-semibold text-white">No matches</h3>
            <p className="mt-1 text-sm text-white/40">Try adjusting your filters or search.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            <AnimatePresence mode="popLayout">
              {tasks.map((t) => (
                <TaskRowItem
                  key={t.id}
                  task={t}
                  isSelected={selectedTaskId === t.id}
                  isConfirmingDelete={confirmDeleteId === t.id}
                  members={members}
                  onSelect={() => {
                    onSelectTask(t.id);
                  }}
                  onQuickStatus={() => {
                    onQuickStatusChange(t, getNextStatus(t.status));
                  }}
                  onConfirmDelete={() => {
                    setConfirmDeleteId(null);
                    onDeleteTask(t.id);
                  }}
                  onCancelDelete={() => setConfirmDeleteId(null)}
                  onRequestDelete={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(t.id);
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      <div className="border-t border-white/[0.06] px-4 py-3 text-xs text-white/30">
        {tasks.length} of {totalCount} tasks
      </div>
    </motion.div>
  );
}

// ── TaskRow sub-component ────────────────────────────────────────────────────

function TaskRowItem({
  task,
  isSelected,
  isConfirmingDelete,
  members,
  onSelect,
  onQuickStatus,
  onConfirmDelete,
  onCancelDelete,
  onRequestDelete,
}: {
  task: TaskRow;
  isSelected: boolean;
  isConfirmingDelete: boolean;
  members: WorkspaceMember[];
  onSelect: () => void;
  onQuickStatus: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onRequestDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.15 }}
      className={`group relative flex items-start gap-3 p-4 transition-colors cursor-pointer ${
        isSelected ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
      }`}
      onClick={() => {
        onSelect();
      }}
    >
      {/* Status quick-toggle */}
      <StatusDot status={task.status} onClick={(e) => { e.stopPropagation(); onQuickStatus(); }} />

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${task.status === "done" ? "text-white/50 line-through" : "text-white"}`}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/35">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDueDate(task.due_date)}
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {getAssigneeName(task.assignee_id, members)}
          </span>
          {isOverdue(task.due_date, task.status) && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertTriangle className="h-3 w-3" /> Overdue
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        <TaskStatusBadge status={task.status} />
        {/* Delete button */}
        {isConfirmingDelete ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onConfirmDelete}
              className="rounded-lg bg-red-500/20 p-1.5 text-red-400 hover:bg-red-500/30"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onCancelDelete}
              className="rounded-lg bg-white/10 p-1.5 text-white/50 hover:bg-white/20"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onRequestDelete}
            className="rounded-lg p-1.5 text-white/20 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
