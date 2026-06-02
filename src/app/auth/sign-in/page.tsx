import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full">
        <div className="mb-4 text-center">
          <div className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Aspio
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            Task management, scoped by workspaces.
          </div>
        </div>
        <SignInForm />
      </div>
    </main>
  );
}

