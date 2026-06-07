"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createClass } from "@/app/(dashboard)/owner/classes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LEVELS, MEETING_PLATFORMS } from "@/lib/constants";
import type { Dictionary } from "@/lib/i18n";
import type { Profile } from "@/types/database";

export function CreateClassDialog({
  teachers,
  dict,
}: {
  teachers: Pick<Profile, "id" | "full_name">[];
  dict: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    const payload = {
      name: String(formData.get("name") ?? ""),
      level: String(formData.get("level") ?? ""),
      teacher_id: String(formData.get("teacher_id") ?? ""),
      start_date: String(formData.get("start_date") ?? ""),
      duration_minutes: String(formData.get("duration_minutes") ?? ""),
      meeting_platform: formData.get("meeting_platform")
        ? String(formData.get("meeting_platform"))
        : null,
      meeting_link: formData.get("meeting_link")
        ? String(formData.get("meeting_link"))
        : null,
      description: formData.get("description")
        ? String(formData.get("description"))
        : null,
    };

    startTransition(async () => {
      const result = await createClass(payload);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(dict.owner.create);
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {dict.owner.newClass}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dict.owner.newClass}</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">{dict.owner.className}</Label>
            <Input id="name" name="name" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="level">{dict.owner.level}</Label>
              <Select id="level" name="level" required defaultValue="beginner">
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="teacher_id">{dict.owner.teacher}</Label>
              <Select id="teacher_id" name="teacher_id" required>
                <option value="">—</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">{dict.owner.startDate}</Label>
              <Input id="start_date" name="start_date" type="datetime-local" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duration_minutes">{dict.owner.duration}</Label>
              <Input
                id="duration_minutes"
                name="duration_minutes"
                type="number"
                min={30}
                max={240}
                defaultValue={60}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="meeting_platform">{dict.owner.platform}</Label>
              <Select id="meeting_platform" name="meeting_platform" defaultValue="">
                <option value="">{dict.common.none}</option>
                {MEETING_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meeting_link">{dict.owner.meetingLink}</Label>
              <Input
                id="meeting_link"
                name="meeting_link"
                type="url"
                placeholder="https://"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">{dict.owner.description}</Label>
            <Input id="description" name="description" />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? dict.common.loading : dict.owner.create}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
