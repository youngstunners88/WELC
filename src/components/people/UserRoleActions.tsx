"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setUserRole, rejectTeacher } from "@/app/(dashboard)/owner/people/actions";
import type { Dictionary } from "@/lib/i18n";
import type { Role } from "@/lib/constants";

export function UserRoleActions({
  userId,
  role,
  pending,
  dict,
}: {
  userId: string;
  role: Role;
  pending: boolean;
  dict: Dictionary;
}) {
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error?: string }>, okMsg: string) {
    startTransition(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      else toast.success(okMsg);
    });
  }

  if (pending) {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={isPending}
          onClick={() =>
            run(() => setUserRole(userId, "teacher"), dict.manage.approved)
          }
        >
          {dict.manage.approve}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => run(() => rejectTeacher(userId), dict.manage.denied)}
        >
          {dict.manage.deny}
        </Button>
      </div>
    );
  }

  // Owners are not demotable from this UI (avoid locking out the account).
  if (role === "owner") return null;

  function promoteToOwner() {
    if (typeof window !== "undefined" && !window.confirm(dict.manage.confirmOwner))
      return;
    run(() => setUserRole(userId, "owner"), dict.manage.roleChanged);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {role === "teacher" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            run(() => setUserRole(userId, "student"), dict.manage.roleChanged)
          }
        >
          {dict.manage.makeStudent}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            run(() => setUserRole(userId, "teacher"), dict.manage.roleChanged)
          }
        >
          {dict.manage.makeTeacher}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="text-[#0f1e4a]"
        disabled={isPending}
        onClick={promoteToOwner}
      >
        {dict.manage.makeOwner}
      </Button>
    </div>
  );
}
