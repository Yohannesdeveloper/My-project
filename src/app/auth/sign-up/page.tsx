import { SignUpForm } from "@/components/auth/SignUpForm";
import { Layers } from "lucide-react";

export default function SignUpPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden p-6">
      {/* Background orbs */}
      <div className="orb orb-2" style={{ top: "5%", right: "-5%" }} />
      <div className="orb orb-3" style={{ bottom: "15%", left: "-5%" }} />
      <div className="orb orb-1" style={{ top: "60%", right: "30%" }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple to-pink shadow-lg shadow-purple/20">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Aspio</h1>
          <p className="text-sm text-white/40">
            Create your account
          </p>
        </div>
        <SignUpForm />
      </div>
    </main>
  );
}

