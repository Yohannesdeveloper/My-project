import type { OverdueTask, TaskStatus } from "@/components/project/shared";

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "todo" || value === "in_progress" || value === "done";
}

function isOverdueTaskRow(value: unknown): value is OverdueTask {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.title === "string" &&
    typeof row.description === "string" &&
    isTaskStatus(row.status) &&
    (row.due_date === null || typeof row.due_date === "string") &&
    (row.assignee_id === null || typeof row.assignee_id === "string") &&
    (row.assignee_name === null || typeof row.assignee_name === "string")
  );
}

/** Parses the overdue-tasks Edge Function JSON response. */
export function parseOverdueTasksResponse(data: unknown): OverdueTask[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isOverdueTaskRow);
}
