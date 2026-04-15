import { useEffect, useState } from "react";

export const DEMO_START_SIM = "2025-03-15T06:00:00";
export const DEMO_SPEED = 60; // 1 real minute = 1 simulated hour

const DEMO_START_REAL_MS = Date.now();
const DEMO_START_SIM_MS = new Date(DEMO_START_SIM).getTime();

export function getCurrentSimTime(): Date {
  const elapsedReal = Date.now() - DEMO_START_REAL_MS;
  const simMs = DEMO_START_SIM_MS + elapsedReal * DEMO_SPEED;
  return new Date(simMs);
}

export function formatSimTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function useSimClock(intervalMs = 1000): Date {
  const [now, setNow] = useState<Date>(() => getCurrentSimTime());
  useEffect(() => {
    const id = setInterval(() => setNow(getCurrentSimTime()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
