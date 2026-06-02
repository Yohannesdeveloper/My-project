import React from "react";

export default function ProjectLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-9 w-48 rounded-2xl bg-zinc-100 animate-pulse dark:bg-zinc-800" />
        <div className="h-10 w-40 rounded-lg bg-zinc-100 animate-pulse dark:bg-zinc-800" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-10 rounded-lg bg-zinc-100 animate-pulse dark:bg-zinc-800" />
            <div className="h-10 rounded-lg bg-zinc-100 animate-pulse dark:bg-zinc-800" />
          </div>
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-20 rounded-xl bg-zinc-100 animate-pulse dark:bg-zinc-800"
              />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="h-8 w-40 rounded-lg bg-zinc-100 animate-pulse dark:bg-zinc-800" />
          <div className="mt-3 space-y-4">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="h-10 rounded-lg bg-zinc-100 animate-pulse dark:bg-zinc-800"
              />
            ))}
          </div>
          <div className="mt-4 h-10 w-full rounded-lg bg-zinc-100 animate-pulse dark:bg-zinc-800" />
        </div>
      </div>
    </main>
  );
}

