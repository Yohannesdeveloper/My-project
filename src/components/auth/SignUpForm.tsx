"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useToast } from "@/components/ui/ToastProvider";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, Check, X } from "lucide-react";

type PasswordStrength = {
  score: number; // 0-4
  label: string;
  color: string;
};

function getPasswordStrength(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  score = Math.min(score, 4);

  const labels: Record<number, { label: string; color: string }> = {
    0: { label: "Very weak", color: "bg-red-500" },
    1: { label: "Weak", color: "bg-orange-500" },
    2: { label: "Fair", color: "bg-yellow-500" },
    3: { label: "Good", color: "bg-electric-blue" },
    4: { label: "Strong", color: "bg-mint" },
  };

  return { score, ...labels[score] };
}

const PASSWORD_RULES = [
  { label: "At least 6 characters", check: (pw: string) => pw.length >= 6 },
  { label: "Contains uppercase & lowercase", check: (pw: string) => /[A-Z]/.test(pw) && /[a-z]/.test(pw) },
  { label: "Contains a number", check: (pw: string) => /\d/.test(pw) },
];

export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ variant: "error", title: "Password too short", description: "Minimum 6 characters required." });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: signUpError } = await supabaseBrowser.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        toast({ variant: "error", title: "Sign up failed", description: signUpError.message });
        return;
      }

      if (data.session) {
        toast({ variant: "success", title: "Account created!", description: "Welcome to Aspio." });
        router.replace("/dashboard");
        return;
      }

      toast({ variant: "info", title: "Check your email", description: "Confirmation link sent." });
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
      <h2 className="text-xl font-bold tracking-tight text-white">Create account</h2>
      <p className="mt-2 text-sm text-white/40">Start building your dream workspace.</p>

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
              autoComplete="new-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              className="glass-input h-12 w-full text-sm"
              style={{ paddingLeft: "2.75rem", paddingRight: "2.75rem" }}
              placeholder="At least 6 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white/60"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Password strength indicator */}
          {password && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      i < strength.score ? strength.color : "bg-white/[0.08]"
                    }`}
                  />
                ))}
              </div>
              <p className={`mt-1.5 text-xs ${strength.score >= 3 ? "text-mint" : strength.score >= 2 ? "text-yellow-400" : "text-white/40"}`}>
                {strength.label}
              </p>
            </div>
          )}

          {/* Password rules */}
          {password && (
            <div className="mt-1 space-y-1.5">
              {PASSWORD_RULES.map((rule) => {
                const passed = rule.check(password);
                return (
                  <div key={rule.label} className="flex items-center gap-2 text-xs">
                    {passed ? (
                      <Check className="h-3.5 w-3.5 text-mint" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-white/20" />
                    )}
                    <span className={passed ? "text-white/50" : "text-white/30"}>{rule.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-glow w-full !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating..." : "Create account"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-white/35">
        Already have an account?{" "}
        <Link className="font-semibold text-cyan/80 transition-colors hover:text-cyan" href="/auth/sign-in">
          Sign in
        </Link>
      </div>
    </motion.div>
  );
}
