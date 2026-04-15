import { create } from "zustand";

export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO";

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  createdAt: number;
  acknowledged: boolean;
  source?: string;
}

const STORAGE_KEY = "paintguard_ack_alerts";

function loadAcked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveAcked(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

const seed: AlertItem[] = [
  {
    id: "seed-crit-1",
    severity: "CRITICAL",
    title: "C조 불량률 급증",
    message: "2025-03-15 22:00 — ULN UL5 라인 C조 불량률 6.02% (평균 대비 +48%)",
    createdAt: Date.now() - 2 * 60 * 1000,
    acknowledged: false,
    source: "shift_monitor",
  },
  {
    id: "seed-warn-1",
    severity: "WARNING",
    title: "저습도 감지",
    message: "도장 부스 B3 습도 22% (임계 25%) — 불량률 상승 구간",
    createdAt: Date.now() - 7 * 60 * 1000,
    acknowledged: false,
    source: "env_monitor",
  },
  {
    id: "seed-info-1",
    severity: "INFO",
    title: "건조로 이벤트",
    message: "OVEN-07 Zone3 온도 편차 감지 (정상 복구)",
    createdAt: Date.now() - 15 * 60 * 1000,
    acknowledged: true,
    source: "oven_monitor",
  },
];

interface AlertState {
  alerts: AlertItem[];
  unreadCount: number;
  addAlert: (a: Omit<AlertItem, "id" | "createdAt" | "acknowledged"> & { id?: string }) => void;
  acknowledge: (id: string) => void;
  acknowledgeAll: () => void;
}

export const useAlertStore = create<AlertState>((set) => {
  const acked = loadAcked();
  const initial = seed.map((a) => ({ ...a, acknowledged: acked.has(a.id) || a.acknowledged }));
  return {
    alerts: initial,
    unreadCount: initial.filter((a) => !a.acknowledged).length,
    addAlert: (input) =>
      set((s) => {
        const next: AlertItem = {
          id: input.id ?? `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          severity: input.severity,
          title: input.title,
          message: input.message,
          source: input.source,
          createdAt: Date.now(),
          acknowledged: false,
        };
        const alerts = [next, ...s.alerts].slice(0, 50);
        return { alerts, unreadCount: alerts.filter((a) => !a.acknowledged).length };
      }),
    acknowledge: (id) =>
      set((s) => {
        const alerts = s.alerts.map((a) => (a.id === id ? { ...a, acknowledged: true } : a));
        const acked = loadAcked();
        acked.add(id);
        saveAcked(acked);
        return { alerts, unreadCount: alerts.filter((a) => !a.acknowledged).length };
      }),
    acknowledgeAll: () =>
      set((s) => {
        const alerts = s.alerts.map((a) => ({ ...a, acknowledged: true }));
        const acked = loadAcked();
        alerts.forEach((a) => acked.add(a.id));
        saveAcked(acked);
        return { alerts, unreadCount: 0 };
      }),
  };
});
