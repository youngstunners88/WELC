"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  History,
  Presentation,
  ClipboardList,
  FolderOpen,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { WelcMark } from "@/components/brand/WelcMark";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(dashboard)/actions";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";
import type { Role } from "@/lib/constants";
import type { Profile } from "@/types/database";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

function itemsForRole(role: Role, dict: Dictionary): NavItem[] {
  if (role === "owner") {
    return [
      { href: "/owner", label: dict.nav.dashboard, icon: LayoutDashboard },
      { href: "/owner/classes", label: dict.nav.classes, icon: BookOpen },
      { href: "/owner/people", label: dict.nav.people, icon: Users },
      { href: "/owner/attendance", label: dict.nav.attendance, icon: ClipboardList },
      { href: "/owner/revenue", label: dict.nav.revenue, icon: Wallet },
      { href: "/teacher", label: dict.nav.teaching, icon: Presentation },
    ];
  }
  if (role === "teacher") {
    return [
      { href: "/teacher", label: dict.nav.dashboard, icon: LayoutDashboard },
      { href: "/teacher/classes", label: dict.nav.materials, icon: FolderOpen },
    ];
  }
  return [
    { href: "/student/classes", label: dict.nav.classes, icon: BookOpen },
    { href: "/student/history", label: dict.nav.history, icon: History },
  ];
}

function roleLabel(role: Role, dict: Dictionary) {
  return dict.roles[role];
}

export function DashboardNav({
  role,
  dict,
  profile,
}: {
  role: Role;
  dict: Dictionary;
  profile: Profile;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = itemsForRole(role, dict);

  const initials = (profile.full_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b bg-[#0f1e4a] px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <WelcMark className="h-8" />
          <span className="font-bold text-white">WELC</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white/80 hover:bg-white/10 hover:text-white"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <nav
        className={cn(
          "flex-col gap-0.5 bg-[#0f1e4a] p-4 md:flex md:w-64 md:min-h-screen",
          open ? "flex" : "hidden"
        )}
      >
        {/* Logo */}
        <div className="mb-6 hidden items-center gap-3 md:flex">
          <WelcMark className="h-10" />
          <div className="leading-tight">
            <p className="font-bold text-white">WELC Academy</p>
            <p className="text-[11px] text-white/50">영어 라이프 컨설팅</p>
          </div>
        </div>

        {/* Profile chip — links to settings */}
        <Link
          href="/settings"
          onClick={() => setOpen(false)}
          className="mb-5 flex items-center gap-3 rounded-xl bg-white/10 px-3 py-3 transition-colors hover:bg-white/[0.16]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7C905] text-sm font-bold text-[#0f1e4a]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {profile.full_name}
            </p>
            <p className="text-xs text-white/50">{roleLabel(role, dict)}</p>
          </div>
          <Settings className="h-4 w-4 shrink-0 text-white/40" />
        </Link>

        {/* Nav links */}
        <div className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#F7C905] text-[#0f1e4a]"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Sign out */}
        <form action={signOut} className="mt-auto pt-6">
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            {dict.nav.logout}
          </Button>
        </form>
      </nav>
    </>
  );
}
