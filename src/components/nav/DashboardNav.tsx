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
      // Owners who also teach reach their own sessions here (the /teacher
      // pages already scope to the logged-in user's assigned classes).
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

  return (
    <>
      {/* Mobile bar */}
      <div className="flex items-center justify-between border-b p-4 md:hidden">
        <WelcMark className="h-8" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <nav
        className={cn(
          "flex-col gap-1 border-r bg-card p-4 md:flex md:w-64",
          open ? "flex" : "hidden"
        )}
      >
        <div className="mb-6 hidden items-center gap-2 md:flex">
          <WelcMark className="h-9" />
          <span className="font-bold">{dict.brand.name}</span>
        </div>

        <div className="mb-4 rounded-md bg-muted/60 px-3 py-2">
          <p className="truncate text-sm font-medium">{profile.full_name}</p>
          <p className="text-xs text-muted-foreground">{dict.roles[role]}</p>
        </div>

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
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <form action={signOut} className="mt-auto pt-4">
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            {dict.nav.logout}
          </Button>
        </form>
      </nav>
    </>
  );
}
