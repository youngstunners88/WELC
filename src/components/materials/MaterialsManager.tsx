"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, LinkIcon, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addFileMaterial,
  addLinkMaterial,
  deleteMaterial,
} from "@/app/(dashboard)/teacher/classes/actions";
import { safeUrl } from "@/lib/safeUrl";
import type { Dictionary } from "@/lib/i18n";

export interface MaterialItem {
  id: string;
  title: string;
  kind: "file" | "link";
  href: string;
}

export function MaterialsManager({
  classId,
  items,
  dict,
}: {
  classId: string;
  items: MaterialItem[];
  dict: Dictionary;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function done(msg: string) {
    toast.success(msg);
    setTitle("");
    setLink("");
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  async function onUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    if (!title.trim()) {
      toast.error(dict.materials.titleLabel + " ?");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${classId}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("class-materials")
        .upload(path, file);
      if (upErr) {
        toast.error(upErr.message);
        return;
      }
      const res = await addFileMaterial(classId, title, path);
      if (res?.error) toast.error(res.error);
      else done(dict.materials.added);
    } finally {
      setUploading(false);
    }
  }

  function onAddLink() {
    startTransition(async () => {
      const res = await addLinkMaterial(classId, title, link);
      if (res?.error) toast.error(res.error);
      else done(dict.materials.added);
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const res = await deleteMaterial(id);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(dict.materials.deleted);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{dict.materials.none}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <a
                href={safeUrl(m.href)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-2 text-sm hover:underline"
              >
                {m.kind === "file" ? (
                  <FileText className="h-4 w-4 shrink-0" />
                ) : (
                  <LinkIcon className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">{m.title}</span>
              </a>
              <Button
                size="icon"
                variant="ghost"
                disabled={isPending}
                onClick={() => onDelete(m.id)}
                aria-label={dict.materials.delete}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-md bg-muted/40 p-3">
        <Input
          placeholder={dict.materials.titleLabel}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={fileRef}
            type="file"
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
          />
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            disabled={uploading}
            onClick={onUpload}
          >
            <Upload className="h-4 w-4" />
            {uploading ? dict.materials.uploading : dict.materials.addFile}
          </Button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder={dict.materials.link}
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            disabled={isPending || !link}
            onClick={onAddLink}
          >
            <LinkIcon className="h-4 w-4" />
            {dict.materials.addLink}
          </Button>
        </div>
      </div>
    </div>
  );
}
