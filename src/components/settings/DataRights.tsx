"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { exportMyData, deleteMyAccount } from "@/app/(dashboard)/settings/actions";
import type { Dictionary } from "@/lib/i18n";

export function DataRights({ dict }: { dict: Dictionary }) {
  const d = dict.dataRights;
  const [isExporting, startExport] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  function onExport() {
    startExport(async () => {
      const res = await exportMyData();
      if (res?.error || !res?.json) {
        toast.error(res?.error ?? d.exportError);
        return;
      }
      // Build a downloadable file entirely client-side.
      const blob = new Blob([res.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `welc-academy-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(d.exportReady);
    });
  }

  function onDelete() {
    startDelete(async () => {
      const res = await deleteMyAccount();
      if (res?.error) {
        toast.error(res.error);
        setConfirming(false);
        return;
      }
      toast.success(d.deleted);
      router.replace("/login");
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{d.exportTitle}</p>
          <p className="text-xs text-muted-foreground">{d.exportHint}</p>
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {isExporting ? dict.common.loading : d.exportButton}
        </button>
      </div>

      <div className="flex items-start justify-between gap-4 border-t pt-5">
        <div>
          <p className="text-sm font-medium text-destructive">{d.deleteTitle}</p>
          <p className="text-xs text-muted-foreground">{d.deleteHint}</p>
        </div>
        {confirming ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting}
              className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {isDeleting ? dict.common.loading : d.confirmDelete}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isDeleting}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              {dict.common.cancel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            {d.deleteButton}
          </button>
        )}
      </div>
    </div>
  );
}
