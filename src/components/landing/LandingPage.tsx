"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Layers,
  Zap,
  Shield,
  Users,
  LayoutGrid,
  Bell,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Globe,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const FEATURES = [
  {
    icon: LayoutGrid,
    title: "Multi-Workspace",
    description: "Switch between teams and projects effortlessly. Keep work and life organized in separate spaces.",
    gradient: "from-indigo/20 to-blue/10",
    iconColor: "text-electric-blue",
  },
  {
    icon: Zap,
    title: "Realtime Sync",
    description: "See every change the moment it happens. No refreshing, no delays — just live collaboration.",
    gradient: "from-cyan/20 to-mint/10",
    iconColor: "text-cyan",
  },
  {
    icon: Shield,
    title: "Workspace Isolation",
    description: "Row-level security ensures your data stays private. Members only see what they're allowed to.",
    gradient: "from-purple/20 to-pink/10",
    iconColor: "text-purple",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Assign tasks, track owners, and keep everyone aligned with clear roles and responsibilities.",
    gradient: "from-mint/20 to-cyan/10",
    iconColor: "text-mint",
  },
  {
    icon: Bell,
    title: "Smart Overdue Alerts",
    description: "Instantly surface overdue tasks across your project so nothing slips through the cracks.",
    gradient: "from-pink/20 to-purple/10",
    iconColor: "text-pink",
  },
  {
    icon: Globe,
    title: "Command Palette",
    description: "Jump anywhere in seconds with ⌘K. Search workspaces, projects, and actions without leaving your flow.",
    gradient: "from-blue/20 to-indigo/10",
    iconColor: "text-electric-blue",
  },
];

const STATS = [
  { value: "∞", label: "Workspaces" },
  { value: "0ms", label: "Sync latency" },
  { value: "100%", label: "RLS coverage" },
  { value: "⌘K", label: "Command palette" },
];

export function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* Background orbs */}
      <div className="orb orb-1" style={{ top: "-10%", left: "-10%" }} />
      <div className="orb orb-2" style={{ top: "30%", right: "-15%" }} />
      <div className="orb orb-3" style={{ bottom: "5%", left: "20%" }} />
      <div className="orb orb-4" style={{ top: "60%", right: "30%" }} />

      {/* ── Navbar ── */}
      <nav className="glass-nav sticky top-0 z-50 flex items-center justify-between px-6 py-4 sm:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo to-cyan shadow-lg shadow-indigo/20">
            <Layers className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">Aspio</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/sign-in"
            className="rounded-xl px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            className="btn-glow !py-2 !px-5 !text-sm"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pt-24 pb-20 text-center sm:pt-32 sm:pb-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-white/60 backdrop-blur-sm"
        >
          <Sparkles className="h-3.5 w-3.5 text-cyan" />
          Now with realtime collaboration
        </motion.div>

        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl"
        >
          Organize work.{" "}
          <span className="gradient-text-hero">Ship faster.</span>
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 max-w-2xl text-base leading-relaxed text-white/50 sm:text-lg"
        >
          Aspio is the multi-workspace task manager built for modern teams.
          Realtime sync, workspace isolation, and a UI that gets out of your way.
        </motion.p>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Link
            href="/auth/sign-up"
            className="btn-glow flex items-center gap-2 !py-3.5 !px-8 !text-base"
          >
            Start for free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/auth/sign-in"
            className="btn-glass flex items-center gap-2 !py-3.5 !px-8 !text-base"
          >
            Sign in
          </Link>
        </motion.div>

        {/* Hero preview mock */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-16 w-full max-w-4xl"
        >
          <div className="glass-card overflow-hidden p-1.5">
            <div className="rounded-2xl border border-white/[0.06] bg-[#050a18] p-6">
              {/* Fake app UI */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo to-cyan">
                  <Layers className="h-4 w-4 text-white" />
                </div>
                <div className="h-3 w-24 rounded-full bg-white/10" />
                <div className="ml-auto flex gap-2">
                  <div className="h-7 w-20 rounded-lg bg-white/[0.06]" />
                  <div className="h-7 w-20 rounded-lg bg-indigo/20" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {["To Do", "In Progress", "Done"].map((col, i) => (
                  <div key={col} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="mb-3 flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${i === 0 ? "bg-white/40" : i === 1 ? "bg-electric-blue" : "bg-mint"}`} />
                      <span className={`text-xs font-semibold ${i === 0 ? "text-white/50" : i === 1 ? "text-electric-blue" : "text-mint"}`}>{col}</span>
                      <span className="ml-auto rounded-full bg-white/[0.06] px-1.5 text-[10px] text-white/30">{3 - i}</span>
                    </div>
                    {Array.from({ length: 3 - i }).map((_, j) => (
                      <div key={j} className="mb-2 rounded-lg border border-white/[0.05] bg-white/[0.03] p-2.5">
                        <div className="h-2.5 w-3/4 rounded-full bg-white/10" />
                        <div className="mt-2 flex gap-2">
                          <div className="h-2 w-10 rounded-full bg-white/[0.06]" />
                          <div className="h-2 w-10 rounded-full bg-white/[0.06]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          className="mb-14 text-center"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Everything you need to{" "}
            <span className="gradient-text">stay on track</span>
          </h2>
          <p className="mt-4 text-base text-white/45">
            Built for teams who care about speed, clarity, and security.
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-60px" }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="glass-card glass-card-hover p-6"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} border border-white/[0.08]`}>
                <f.icon className={`h-5 w-5 ${f.iconColor}`} />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/45">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Stats ── */}
      <section className="relative mx-auto max-w-4xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="glass-card p-8 sm:p-10"
        >
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold gradient-text-primary sm:text-4xl">{s.value}</p>
                <p className="mt-1 text-xs text-white/40">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Checklist ── */}
      <section className="relative mx-auto max-w-3xl px-6 py-16 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Built with <span className="gradient-text">best practices</span>
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {[
              "Next.js 16 App Router",
              "Supabase RLS",
              "Realtime subscriptions",
              "Optimistic UI",
              "Type-safe queries",
              "Row-level security",
              "Command palette",
              "Glassmorphism UI",
            ].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 text-sm text-white/55">
                <CheckCircle2 className="h-4 w-4 text-mint" />
                {item}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          className="glass-card p-10 sm:p-14"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ready to get organized?
          </h2>
          <p className="mt-4 text-base text-white/45">
            Create a workspace in seconds. No credit card required.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth/sign-up"
              className="btn-glow flex items-center gap-2 !py-3.5 !px-8 !text-base"
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/sign-in"
              className="btn-glass flex items-center gap-2 !py-3.5 !px-8 !text-base"
            >
              I have an account
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.05] px-6 py-8 text-center text-xs text-white/25">
        <div className="flex items-center justify-center gap-2">
          <Layers className="h-3.5 w-3.5" />
          <span>Aspio — Built with Next.js & Supabase</span>
        </div>
      </footer>
    </div>
  );
}
