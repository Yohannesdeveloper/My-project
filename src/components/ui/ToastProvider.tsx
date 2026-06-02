"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

type ToastVariant = "success" | "error" | "info" | "warning";

type Toast = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
};

type ToastContextValue = {
  toast: (input: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const VARIANT_CONFIG: Record<
  ToastVariant,
  { icon: typeof CheckCircle; border: string; bg: string; text: string }
> = {
  success: {
    icon: CheckCircle,
    border: "border-mint/30",
    bg: "bg-mint/10",
    text: "text-mint",
  },
  error: {
    icon: AlertCircle,
    border: "border-red-500/30",
    bg: "bg-red-500/10",
    text: "text-red-400",
  },
  info: {
    icon: Info,
    border: "border-electric-blue/30",
    bg: "bg-electric-blue/10",
    text: "text-electric-blue",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-yellow-400/30",
    bg: "bg-yellow-400/10",
    text: "text-yellow-400",
  },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const config = VARIANT_CONFIG[toast.variant];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-xl ${config.border} ${config.bg}`}
      style={{ background: "rgba(10, 14, 39, 0.92)" }}
    >
      <div className={`mt-0.5 shrink-0 ${config.text}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-xs text-white/50 line-clamp-2">
            {toast.description}
          </p>
        ) : null}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-lg p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white/60"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: Omit<Toast, "id">) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev.slice(-4), { ...input, id }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Portal-style fixed toast container */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
