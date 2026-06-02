export default function SignUpLoading() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden p-6">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white/[0.04] animate-pulse" />
          <div className="h-5 w-24 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-4 w-48 rounded bg-white/[0.04] animate-pulse" />
        </div>
        <div className="glass-card p-8 space-y-5">
          <div className="h-6 w-36 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-4 w-64 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-12 w-full rounded-xl bg-white/[0.04] animate-pulse" />
          <div className="h-12 w-full rounded-xl bg-white/[0.04] animate-pulse" />
          <div className="h-12 w-full rounded-xl bg-white/[0.04] animate-pulse" />
        </div>
      </div>
    </main>
  );
}
