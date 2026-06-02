"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useToast } from "@/components/ui/ToastProvider";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

export function SignInForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error: signInError } =
        await supabaseBrowser.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        console.error("Supabase sign-in error:", signInError, data);
        toast({ variant: "error", title: "Sign in failed", description: signInError.message });
        return;
      }

      if (data.session) {
        toast({ variant: "success", title: "Welcome back!" });
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      toast({ variant: "info", title: "Check your email", description: "Confirmation link required." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-8"
    >
      <h2 className="text-xl font-bold tracking-tight text-white">Sign in</h2>
      <p className="mt-2 text-sm text-white/40">Access your workspace and projects.</p>

      <form className="mt-6 flex flex-col gap-5" onSubmit={onSubmit}>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-xs font-medium tracking-wide text-white/50">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
              className="glass-input h-12 w-full text-sm"
              style={{ paddingLeft: "2.75rem" }}
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-xs font-medium tracking-wide text-white/50">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              className="glass-input h-12 w-full text-sm"
              style={{ paddingLeft: "2.75rem", paddingRight: "2.75rem" }}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-glow w-full !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-white/35">
        New here?{" "}
        <Link className="font-semibold text-cyan/80 transition-colors hover:text-cyan" href="/auth/sign-up">
          Create an account
        </Link>
      </div>
    </motion.div>
  );
}
