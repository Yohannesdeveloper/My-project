import React from "react";

export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-10 pt-8">
      <div className="mb-8 flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-white/[0.04] animate-pulse" />
        <div className="flex flex-col gap-2">
          <div className="h-4 w-24 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-3 w-40 rounded bg-white/[0.04] animate-pulse" />
        </div>
      </div>
      <div className="h-20 w-full rounded-3xl bg-white/[0.03] animate-pulse mb-8" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-32 rounded-3xl bg-white/[0.03] animate-pulse"
          />
        ))}
      </div>
    </main>
  );
}

