"use client";

import { Circle, Clock, CheckCircle2 } from "lucide-react";
import type { TaskStatus } from "./shared";

const ICON_MAP = { Circle, Clock, CheckCircle2 } as const;

// ── Field ────────────────────────────────────────────────────────────────────

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium tracking-wide text-white/50">{label}</label>
      {children}
    </div>
  );
}

// ── DetailPill ───────────────────────────────────────────────────────────────

export function DetailPill({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-xs text-white/35 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

// ── StatusDot ────────────────────────────────────────────────────────────────

export function StatusDot({
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

// ── TaskStatusBadge ──────────────────────────────────────────────────────────

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
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

// ── StatusIcon helper (for STATUS_OPTIONS that store icon as string) ─────────

export function StatusIcon({ name, className }: { name: "Circle" | "Clock" | "CheckCircle2"; className?: string }) {
  const Icon = ICON_MAP[name];
  return <Icon className={className} />;
}
