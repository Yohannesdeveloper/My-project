import React from "react";

export default function ProjectLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-10 pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-9 w-48 rounded-2xl bg-white/[0.04] animate-pulse" />
        <div className="h-10 w-40 rounded-xl bg-white/[0.04] animate-pulse" />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-10 rounded-xl bg-white/[0.04] animate-pulse" />
            <div className="h-10 rounded-xl bg-white/[0.04] animate-pulse" />
          </div>
          <div className="mt-5 space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-20 rounded-2xl bg-white/[0.03] animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="h-8 w-40 rounded-xl bg-white/[0.04] animate-pulse" />
          <div className="mt-4 space-y-4">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="h-10 rounded-xl bg-white/[0.03] animate-pulse"
              />
            ))}
          </div>
          <div className="mt-5 h-10 w-full rounded-xl bg-white/[0.04] animate-pulse" />
        </div>
      </div>
    </main>
  );
}

