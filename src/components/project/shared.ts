import type { Tables } from "@/lib/supabase/database.types";
import type { TaskRow } from "@/hooks/useRealtimeTasks";

// ── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = "todo" | "in_progress" | "done";

export type WorkspaceMember = Pick<Tables<"workspace_members">, "user_id" | "display_name">;

export type OverdueTask = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  due_date: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
};

// ── Constants ────────────────────────────────────────────────────────────────

export const STATUS_OPTIONS: { value: TaskStatus; label: string; icon: "Circle" | "Clock" | "CheckCircle2"; color: string }[] = [
  { value: "todo", label: "Todo", icon: "Circle", color: "text-white/60" },
  { value: "in_progress", label: "In Progress", icon: "Clock", color: "text-electric-blue" },
  { value: "done", label: "Done", icon: "CheckCircle2", color: "text-mint" },
];

// ── Utilities ────────────────────────────────────────────────────────────────
// Use fixed locale + UTC for dates so server render matches client hydration (React #418).

const UTC_DATE_DISPLAY: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "2-digit",
  timeZone: "UTC",
};

function utcDayStamp(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function formatDueDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", UTC_DATE_DISPLAY);
}

export function isOverdue(value: string | null, status: TaskStatus): boolean {
  if (!value || status === "done") return false;
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return false;
  return utcDayStamp(due) < utcDayStamp(new Date());
}

export function toDateInputValue(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function fromDateInputValue(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function getAssigneeName(id: string | null, members: WorkspaceMember[]): string {
  if (!id) return "Unassigned";
  return members.find((m) => m.user_id === id)?.display_name ?? "Unknown";
}

export function getNextStatus(current: TaskStatus): TaskStatus {
  return current === "todo" ? "in_progress" : current === "in_progress" ? "done" : "todo";
}

export type { TaskRow };
