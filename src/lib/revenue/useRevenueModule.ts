"use client";

import { useEffect, useState, useCallback } from "react";

export interface RevenuePrefs {
  enabled: boolean;
  hourlyRate: number; // KRW per teaching hour
  tuitionPerStudent: number; // KRW per student per month
}

const KEY = "welc:revenue:prefs:v1";

const DEFAULTS: RevenuePrefs = {
  enabled: false,
  hourlyRate: 30000,
  tuitionPerStudent: 200000,
};

/**
 * Owner-controlled, browser-local revenue settings. Nothing is sent to the
 * server or DB — the owner can preview, enable, tweak, or fully disable the
 * payroll/revenue projection without committing any financial data.
 */
export function useRevenueModule() {
  const [prefs, setPrefs] = useState<RevenuePrefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  const update = useCallback((patch: Partial<RevenuePrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { prefs, update, loaded };
}

/** Read-only check of the enabled flag (used by nav). */
export function useRevenueEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setEnabled(Boolean(JSON.parse(raw).enabled));
    } catch {
      /* ignore */
    }
    const onStorage = () => {
      try {
        const raw = localStorage.getItem(KEY);
        setEnabled(raw ? Boolean(JSON.parse(raw).enabled) : false);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return enabled;
}
