import { SignInForm } from "@/components/auth/SignInForm";
import { Layers } from "lucide-react";

export default function SignInPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden p-6">
      {/* Background orbs */}
      <div className="orb orb-1" style={{ top: "10%", left: "-5%" }} />
      <div className="orb orb-2" style={{ bottom: "10%", right: "-5%" }} />
      <div className="orb orb-4" style={{ top: "50%", left: "60%" }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo to-cyan shadow-lg shadow-indigo/20">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Aspio</h1>
          <p className="text-sm text-white/40">
            Sign in to your workspace
          </p>
        </div>
        <SignInForm />
      </div>
    </main>
  );
}

