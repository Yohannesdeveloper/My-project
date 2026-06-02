"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Tables } from "@/lib/supabase/database.types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  FolderOpen,
  Layers,
  ArrowRight,
  Command,
} from "lucide-react";

type CommandItem =
  | {
      type: "workspace";
      id: string;
      name: string;
      subtitle: string;
      href: string;
    }
  | {
      type: "project";
      id: string;
      name: string;
      subtitle: string;
      href: string;
    }
  | {
      type: "action";
      id: string;
      name: string;
      subtitle: string;
      href?: string;
      action?: () => void;
    };

const ICON_MAP: Record<string, typeof Layers> = {
  workspace: FolderOpen,
  project: Layers,
  action: ArrowRight,
};

function useKeyboardShortcut(key: string, modifier: boolean, callback: () => void): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (modifier && (e.metaKey || e.ctrlKey) && e.key === key) {
        e.preventDefault();
        callback();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, modifier, callback]);
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CommandItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  useKeyboardShortcut("k", true, toggle);
  useKeyboardShortcut("Escape", false, close);

  // Fetch items when opened
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const fetchItems = async () => {
      setLoading(true);
      const supabase = supabaseBrowser;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user || cancelled) {
        setLoading(false);
        return;
      }

      const { data: memberships } = await supabase
        .from("workspace_members")
        .select("workspace_id,role,display_name")
        .eq("user_id", userData.user.id);

      if (!memberships || cancelled) {
        setLoading(false);
        return;
      }

      const workspaceIds = memberships.map((m: Pick<Tables<"workspace_members">, "workspace_id" | "role" | "display_name">) => m.workspace_id);
      if (workspaceIds.length === 0) {
        if (!cancelled) setItems([]);
        setLoading(false);
        return;
      }

      const { data: workspaces } = await supabase
        .from("workspaces")
        .select("id,name")
        .in("id", workspaceIds);

      const { data: projects } = await supabase
        .from("projects")
        .select("id,name,workspace_id")
        .in("workspace_id", workspaceIds);

      if (cancelled) return;

      const commandItems: CommandItem[] = [];

      for (const ws of workspaces ?? []) {
        const membership = memberships.find((m: Pick<Tables<"workspace_members">, "workspace_id" | "role">) => m.workspace_id === ws.id);
        commandItems.push({
          type: "workspace",
          id: ws.id,
          name: ws.name,
          subtitle: `${membership?.role ?? "member"}`,
          href: `/dashboard?workspaceId=${ws.id}`,
        });
      }

      for (const proj of projects ?? []) {
        const ws = workspaces?.find((w: Pick<Tables<"workspaces">, "id" | "name">) => w.id === proj.workspace_id);
        commandItems.push({
          type: "project",
          id: proj.id,
          name: proj.name,
          subtitle: ws?.name ?? "",
          href: `/workspaces/${proj.workspace_id}/projects/${proj.id}`,
        });
      }

      setItems(commandItems);
      setLoading(false);
    };

    fetchItems();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q),
    );
  }, [items, query]);

  const executeItem = (item: CommandItem) => {
    close();
    if (item.href) {
      router.push(item.href);
    }
    if (item.type === "action" && item.action) {
      item.action();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      executeItem(filteredItems[selectedIndex]);
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-[9998] flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[15vh]"
            onClick={close}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.12] shadow-2xl"
              style={{ background: "rgba(10, 14, 39, 0.98)", backdropFilter: "blur(40px)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-white/[0.08] px-4">
                <Search className="h-5 w-5 shrink-0 text-white/30" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search workspaces, projects..."
                  className="h-14 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                />
                <kbd className="hidden shrink-0 rounded-md border border-white/[0.1] bg-white/[0.05] px-1.5 py-0.5 text-xs text-white/30 sm:inline-block">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div
                ref={listRef}
                className="max-h-[320px] overflow-y-auto py-2"
              >
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="py-8 text-center text-sm text-white/30">
                    {query ? "No results found" : "No items available"}
                  </div>
                ) : (
                  filteredItems.map((item, idx) => {
                    const Icon = ICON_MAP[item.type] ?? Layers;
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        onClick={() => executeItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isSelected ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                            item.type === "workspace"
                              ? "bg-indigo/10 border-indigo/20"
                              : "bg-white/[0.04] border-white/[0.08]"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 ${
                              item.type === "workspace"
                                ? "text-electric-blue"
                                : "text-white/50"
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {item.name}
                          </p>
                          <p className="truncate text-xs text-white/35">
                            {item.subtitle}
                          </p>
                        </div>
                        {isSelected && (
                          <kbd className="shrink-0 rounded bg-white/[0.06] px-2 py-0.5 text-xs text-white/30">
                            ↵
                          </kbd>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 border-t border-white/[0.06] px-4 py-2.5 text-xs text-white/25">
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5">↑↓</kbd> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5">↵</kbd> Open
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5">esc</kbd> Close
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Small button that shows the Cmd+K shortcut hint */
export function CommandPaletteTrigger() {
  return (
    <button
      onClick={() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
      }}
      className="btn-glass flex items-center gap-2 !py-2 !px-3 !text-xs"
      title="Open command palette (Ctrl+K)"
    >
      <Command className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] text-white/30 sm:inline-block">
        ⌘K
      </kbd>
    </button>
  );
}
