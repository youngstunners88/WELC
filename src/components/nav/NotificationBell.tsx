"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";
import type { Notification } from "@/types/database";

export function NotificationBell({
  userId,
  initial,
  dict,
}: {
  userId: string;
  initial: Notification[];
  dict: Dictionary;
}) {
  const [items, setItems] = useState<Notification[]>(initial);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const incoming = payload.new as Notification;
          // Guard against duplicates: realtime can re-deliver a row that's
          // already in the initial server-rendered list (or on reconnect).
          setItems((prev) =>
            prev.some((n) => n.id === incoming.id)
              ? prev
              : [incoming, ...prev]
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  // Close the dropdown when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markAllRead() {
    const supabase = createClient();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 hover:bg-accent"
        aria-label={dict.notif.title}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="text-sm font-semibold">{dict.notif.title}</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {dict.notif.markAllRead}
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                {dict.notif.noNew}
              </li>
            ) : (
              items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "border-b px-4 py-3 text-sm last:border-b-0",
                    !n.read && "bg-accent/30"
                  )}
                >
                  {n.message}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
