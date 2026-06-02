"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Tables } from "@/lib/supabase/database.types";

type TaskStatus = "todo" | "in_progress" | "done";

export type TaskRow = Pick<
  Tables<"tasks">,
  "id" | "title" | "description" | "status" | "assignee_id" | "due_date"
>;

type RealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  old: Partial<TaskRow> | null;
  new: Partial<TaskRow> | null;
};

/**
 * Subscribes to realtime changes for a given project's tasks.
 * Merges INSERT/UPDATE/DELETE events into local state.
 */
export function useRealtimeTasks(
  projectId: string,
  initialTasks: TaskRow[],
): {
  tasks: TaskRow[];
  setTasks: React.Dispatch<React.SetStateAction<TaskRow[]>>;
} {
  // State is initialized once per component mount.
  // Parent must use key={projectId} to ensure fresh state on navigation.
  const [tasks, setTasks] = useState<TaskRow[]>(initialTasks);

  useEffect(() => {
    const channel = supabaseBrowser
      .channel(`project-tasks-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${projectId}`,
        },
        (payload: RealtimePayload) => {
          const eventType = payload.eventType;

          if (eventType === "INSERT") {
            const newRow = payload.new;
            if (!newRow?.id) return;
            // Only add if not already present (avoid duplicates from optimistic insert)
            setTasks((prev) => {
              if (prev.some((t) => t.id === newRow.id)) return prev;
              return [
                ...prev,
                {
                  id: newRow.id!,
                  title: newRow.title ?? "",
                  description: newRow.description ?? "",
                  status: (newRow.status as TaskStatus) ?? "todo",
                  assignee_id: newRow.assignee_id ?? null,
                  due_date: newRow.due_date ?? null,
                },
              ];
            });
          } else if (eventType === "UPDATE") {
            const newId = payload.new?.id ?? payload.old?.id;
            if (!newId) return;
            setTasks((prev) =>
              prev.map((t) => {
                if (t.id !== newId) return t;
                return {
                  ...t,
                  title: payload.new?.title ?? t.title,
                  description: payload.new?.description ?? t.description,
                  status: (payload.new?.status as TaskStatus) ?? t.status,
                  assignee_id:
                    payload.new?.assignee_id !== undefined
                      ? payload.new.assignee_id
                      : t.assignee_id,
                  due_date:
                    payload.new?.due_date !== undefined
                      ? payload.new.due_date
                      : t.due_date,
                };
              }),
            );
          } else if (eventType === "DELETE") {
            const deletedId = payload.old?.id;
            if (!deletedId) return;
            setTasks((prev) => prev.filter((t) => t.id !== deletedId));
          }
        },
      );

    channel.subscribe();
    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [projectId]);

  return { tasks, setTasks };
}

/**
 * Subscribes to realtime task status changes for a list of project IDs.
 * Returns a live count map: projectId -> { todo, in_progress, done }.
 */
export function useRealtimeProjectCounts(
  projectIds: string[],
  initialCounts: Record<string, Record<TaskStatus, number>>,
): Record<string, Record<TaskStatus, number>> {
  // State is initialized once per component mount.
  // Parent must use key={workspaceId} to ensure fresh state on workspace change.
  const [counts, setCounts] =
    useState<Record<string, Record<TaskStatus, number>>>(initialCounts);

  useEffect(() => {
    if (projectIds.length === 0) return;

    const channels = projectIds.map((projectId) => {
      const channel = supabaseBrowser.channel(`dashboard-counts-${projectId}`);
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${projectId}`,
        },
        (payload: RealtimePayload) => {
          const eventType = payload.eventType;

          if (eventType === "INSERT") {
            const status = (payload.new?.status as TaskStatus) ?? "todo";
            setCounts((prev) => ({
              ...prev,
              [projectId]: {
                ...prev[projectId],
                [status]: (prev[projectId]?.[status] ?? 0) + 1,
              },
            }));
          } else if (eventType === "UPDATE") {
            const oldStatus = payload.old?.status as TaskStatus | undefined;
            const newStatus = payload.new?.status as TaskStatus | undefined;
            if (!oldStatus || !newStatus || oldStatus === newStatus) return;
            setCounts((prev) => ({
              ...prev,
              [projectId]: {
                ...prev[projectId],
                [oldStatus]: Math.max(0, (prev[projectId]?.[oldStatus] ?? 0) - 1),
                [newStatus]: (prev[projectId]?.[newStatus] ?? 0) + 1,
              },
            }));
          } else if (eventType === "DELETE") {
            const status = (payload.old?.status as TaskStatus) ?? "todo";
            setCounts((prev) => ({
              ...prev,
              [projectId]: {
                ...prev[projectId],
                [status]: Math.max(0, (prev[projectId]?.[status] ?? 0) - 1),
              },
            }));
          }
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

  return counts;
}

/**
 * Deletes a task optimistically: removes from local state immediately,
 * calls the API, and rolls back + calls onError if it fails.
 */
export function useDeleteTask(
  setTasks: React.Dispatch<React.SetStateAction<TaskRow[]>>,
): (taskId: string) => Promise<boolean> {
  const deleteTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      // Snapshot for rollback
      let rolledBack = false;
      let snapshot: TaskRow[] = [];

      setTasks((prev) => {
        snapshot = prev;
        return prev.filter((t) => t.id !== taskId);
      });

      const { error } = await supabaseBrowser
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) {
        // Rollback
        setTasks(snapshot);
        rolledBack = true;
      }

      return !rolledBack;
    },
    [setTasks],
  );

  return deleteTask;
}
