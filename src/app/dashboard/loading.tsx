import React from "react";

export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
      <div className="mb-6 h-10 w-full rounded-2xl bg-zinc-100 animate-pulse dark:bg-zinc-800" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-28 rounded-2xl bg-zinc-100 animate-pulse dark:bg-zinc-800"
          />
        ))}
      </div>
    </main>
  );
}

