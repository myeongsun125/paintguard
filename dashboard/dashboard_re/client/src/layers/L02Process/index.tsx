import { trpc } from "@/lib/trpc";
import { useState, useMemo, useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Droplets, Thermometer } from "lucide-react";

/* ── helpers ── */
function asNum(v: unknown, fb = 0) {
  const n = Number(v ?? fb);
  return Number.isFinite(n) ? n : fb;
}

function isS3Array(v: unknown): v is Record<string, unknown>[] {
  return Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && v[0] !== null;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/* ── types ── */
type StatusLevel = "normal" | "warning" | "danger";

/* ── plant / line config ── */
const PLANT_META: Record<string, { name: string; lines: string[] }> = {
  ASN: { name: "아산", lines: ["AS1", "AS2", "AS3"] },
  ULN: { name: "울산", lines: ["UL1", "UL2", "UL3", "UL4", "UL5"] },
  GWJ: { name: "광주", lines: ["GW1", "GW2"] },
  HWS: { name: "화성", lines: ["HW1", "HW2", "HW3"] },
};
const PLANT_CODES = Object.keys(PLANT_META);

/* ── status helpers ── */
function rateLevel(r: number): StatusLevel {
  return r <= 5 ? "normal" : r <= 8 ? "warning" : "danger";
}
function tempLevel(t: number): StatusLevel {
  if (t >= 22 && t <= 26) return "normal";
  if ((t >= 20 && t < 22) || (t > 26 && t <= 28)) return "warning";
  return "danger";
}
function humidLevel(h: number): StatusLevel {
  if (h >= 50 && h <= 70) return "normal";
  if ((h >= 40 && h < 50) || (h > 70 && h <= 80)) return "warning";
  return "danger";
}
function queueLevel(q: number): StatusLevel {
  return q <= 20 ? "normal" : q <= 30 ? "warning" : "danger";
}

const SL: Record<StatusLevel, { color: string; label: string; bg: string; border: string; text: string }> = {
  normal: { color: "#10B981", label: "정상", bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-300" },
  warning: { color: "#F59E0B", label: "주의", bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-300" },
  danger: { color: "#EF4444", label: "위험", bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-300" },
};

function worst(...levels: StatusLevel[]): StatusLevel {
  if (levels.includes("danger")) return "danger";
  if (levels.includes("warning")) return "warning";
  return "normal";
}

/* ── fallback plant rates ── */
const FB_RATES: Record<string, number> = { ASN: 4.09, ULN: 4.07, GWJ: 4.04, HWS: 4.06 };

/* ── sample defect data (hardcoded) ── */
const DEFECT_TYPES = [
  { code: "SCR", name: "스크래치", count: 42432 },
  { code: "DNT", name: "덴트", count: 25583 },
  { code: "PBB", name: "도장기포", count: 20738 },
  { code: "DST", name: "이물질", count: 17150 },
  { code: "PDR", name: "도장흘림", count: 17111 },
  { code: "ORG", name: "오렌지필", count: 13782 },
  { code: "GAP", name: "Gap불량", count: 13605 },
  { code: "CLP", name: "클립마크", count: 8492 },
  { code: "CRK", name: "크랙", count: 6841 },
  { code: "WLD", name: "용접불량", count: 5170 },
];

const DEFECT_COLORS = [
  "#10b981", "#06b6d4", "#2dd4bf", "#22d3ee", "#a3e635",
  "#fbbf24", "#f97316", "#f43f5e", "#ef4444", "#a855f7",
];

/* ── shift helper ── */
function hourToShift(h: number): "A" | "B" | "C" {
  if (h >= 6 && h <= 13) return "A";
  if (h >= 14 && h <= 21) return "B";
  return "C";
}

/* ── DefectTooltip ── */
type DefectPayload = { code: string; name: string; count: number };
function DefectTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DefectPayload }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.75)",
        border: "1px solid #334155",
        borderRadius: 8,
        padding: "8px 12px",
        color: "#f1f5f9",
        fontSize: 12,
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 2 }}>
        {d.code} <span style={{ color: "#94a3b8" }}>{d.name}</span>
      </p>
      <p style={{ color: "#cbd5e1" }}>
        건수: <span style={{ fontFamily: "monospace" }}>{d.count.toLocaleString()}</span>
      </p>
    </div>
  );
}

/* ── sparkline data builder ── */
function buildSparkline(base: number, tick: number, idx: number): number[] {
  return Array.from({ length: 12 }, (_, i) => {
    const w = Math.sin((tick + i + idx * 3) / 2.3) * 0.8;
    const m = Math.cos((tick + i + idx * 2) / 3.7) * 0.4;
    return clamp(base + w + m, Math.max(base - 2, 0), base + 2);
  });
}

/* ════════════════════════════════════════════════════ */
export default function L02Process() {
  const { data: processData } = trpc.mes.processData.useQuery(undefined, { refetchInterval: 30_000 });
  const { data: lineShiftData } = trpc.mes.lineShiftSummary.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const [selectedPlant, setSelectedPlant] = useState("ASN");
  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setClockTick((p) => p + 1), 2500);
    return () => window.clearInterval(id);
  }, []);

  /* ── S3 parsing ── */
  const kpiDaily = useMemo(
    () => (isS3Array(processData?.kpiDaily) ? (processData!.kpiDaily as Record<string, unknown>[]) : null),
    [processData?.kpiDaily],
  );
  const shiftDefect = useMemo(
    () => (isS3Array(processData?.shiftDefectRate) ? (processData!.shiftDefectRate as Record<string, unknown>[]) : null),
    [processData?.shiftDefectRate],
  );
  const lineMonthly = useMemo(
    () => (isS3Array(processData?.lineMonthly) ? (processData!.lineMonthly as Record<string, unknown>[]) : null),
    [processData?.lineMonthly],
  );

  /* ── DuckDB line×shift lookup ── */
  const lineShiftRows = useMemo(
    () => (isS3Array(lineShiftData?.data) ? (lineShiftData!.data as Record<string, unknown>[]) : null),
    [lineShiftData?.data],
  );
  const lineShiftMap = useMemo(() => {
    const m = new Map<string, { total: number; fail: number }>();
    if (!lineShiftRows) return m;
    lineShiftRows.forEach((r) => {
      const key = `${String(r.plant_code)}-${String(r.line_code)}-${String(r.shift)}`;
      m.set(key, { total: asNum(r.total), fail: asNum(r.fail_count) });
    });
    return m;
  }, [lineShiftRows]);

  /* ── 영역 1: Plant defect rates ── */
  const plantRates = useMemo(
    () =>
      PLANT_CODES.map((code) => {
        if (!kpiDaily) return { code, name: PLANT_META[code].name, rate: FB_RATES[code] ?? 4.05 };
        const rows = kpiDaily.filter((r) => String(r.plant_code) === code);
        const total = rows.reduce((s, r) => s + asNum(r.total), 0);
        const fail = rows.reduce((s, r) => s + asNum(r.fail_count), 0);
        return { code, name: PLANT_META[code].name, rate: total > 0 ? (fail / total) * 100 : 0 };
      }),
    [kpiDaily],
  );

  /* ── 영역 2: Selected plant detail ── */
  const plantDetail = useMemo(() => {
    if (!kpiDaily) {
      const rate = FB_RATES[selectedPlant] ?? 4.05;
      return { dailyTarget: 420, achieveRate: 95.2, failRate: rate, ftt: 100 - rate, avgTemp: 24.5, avgHumidity: 55.0 };
    }
    const rows = kpiDaily.filter((r) => String(r.plant_code) === selectedPlant);
    if (rows.length === 0) {
      return { dailyTarget: 0, achieveRate: 0, failRate: 0, ftt: 0, avgTemp: 0, avgHumidity: 0 };
    }
    const total = rows.reduce((s, r) => s + asNum(r.total), 0);
    const fail = rows.reduce((s, r) => s + asNum(r.fail_count), 0);
    const dates = new Set(rows.map((r) => String(r.date)));
    const days = Math.max(dates.size, 1);
    const dailyAvg = total / days;
    const dailyTotals = new Map<string, number>();
    rows.forEach((r) => {
      const d = String(r.date);
      dailyTotals.set(d, (dailyTotals.get(d) ?? 0) + asNum(r.total));
    });
    const maxDaily = Math.max(...Array.from(dailyTotals.values()), 1);
    const avgTemp = rows.reduce((s, r) => s + asNum(r.avg_temp), 0) / rows.length;
    const avgHumidity = rows.reduce((s, r) => s + asNum(r.avg_humidity), 0) / rows.length;
    const avgYield = rows.reduce((s, r) => s + asNum(r.yield_rate), 0) / rows.length;
    const failRate = total > 0 ? (fail / total) * 100 : 0;
    return {
      dailyTarget: Math.round(dailyAvg),
      achieveRate: maxDaily > 0 ? (dailyAvg / maxDaily) * 100 : 0,
      failRate,
      ftt: avgYield,
      avgTemp,
      avgHumidity,
    };
  }, [kpiDaily, selectedPlant]);

  const plantOverallStatus = worst(rateLevel(plantDetail.failRate), tempLevel(plantDetail.avgTemp), humidLevel(plantDetail.avgHumidity));

  /* ── Shift comparison (선택 공장 기준) ── */
  const shiftCards = useMemo(() => {
    const shifts = ["A", "B", "C"] as const;

    // 1순위: lineShiftSummary (DuckDB) — 선택 공장 기준
    if (lineShiftRows) {
      return shifts.map((s) => {
        const rows = lineShiftRows.filter(
          (r) => String(r.plant_code) === selectedPlant && String(r.shift) === s,
        );
        const total = rows.reduce((sum, r) => sum + asNum(r.total), 0);
        const fail = rows.reduce((sum, r) => sum + asNum(r.fail_count), 0);
        return {
          shift: s,
          total,
          failCount: fail,
          rate: total > 0 ? (fail / total) * 100 : 0,
        };
      });
    }

    // 2순위: shiftDefect (S3 집계) — 전체 공장 기준
    if (shiftDefect) {
      return shifts.map((s) => {
        const rows = shiftDefect.filter((r) => String(r.shift) === s);
        const total = rows.reduce((sum, r) => sum + asNum(r.total), 0);
        const fail = rows.reduce((sum, r) => sum + asNum(r.fail_count), 0);
        return { shift: s, total, failCount: fail, rate: total > 0 ? (fail / total) * 100 : 0 };
      });
    }

    // 3순위: 샘플 폴백
    return shifts.map((s) => ({
      shift: s,
      total: s === "C" ? 176667 : s === "A" ? 1411316 : 1412017,
      failCount: s === "C" ? 10631 : s === "A" ? 58146 : 53230,
      rate: s === "C" ? 6.02 : s === "A" ? 4.12 : 3.77,
    }));
  }, [lineShiftRows, shiftDefect, selectedPlant]);

  /* ── 영역 3: Line cards ── */
  const plantAvgTakt = useMemo(() => {
    if (!kpiDaily) return 2.8;
    const rows = kpiDaily.filter((r) => String(r.plant_code) === selectedPlant);
    if (rows.length === 0) return 2.8;
    return rows.reduce((s, r) => s + asNum(r.avg_takt), 0) / rows.length;
  }, [kpiDaily, selectedPlant]);

  /* ── simulated current shift ── */
  const simHour = (new Date().getHours() + Math.floor(clockTick / 10)) % 24;
  const currentShift = hourToShift(simHour);

  const lineCards = useMemo(() => {
    const lines = PLANT_META[selectedPlant]?.lines ?? [];
    return lines.map((lineCode, idx) => {
      let baseRate = 4.0 + idx * 0.15;
      let baseTotal = 50000 + idx * 3000;

      if (lineMonthly) {
        const rows = lineMonthly.filter(
          (r) => String(r.plant_code) === selectedPlant && String(r.line_code) === lineCode,
        );
        if (rows.length > 0) {
          const t = rows.reduce((s, r) => s + asNum(r.total), 0);
          const f = rows.reduce((s, r) => s + asNum(r.fail_count), 0);
          baseRate = t > 0 ? (f / t) * 100 : baseRate;
          baseTotal = t;
        }
      }

      const noise = Math.sin((clockTick + idx * 7) / 2.5) * 0.3;
      const failRate = clamp(baseRate + noise, 0, 100);
      const monthlyHours = 22 * 16;
      const throughput = Math.round(baseTotal / monthlyHours);
      const takt = clamp(plantAvgTakt + Math.sin((clockTick + idx * 5) / 3) * 0.08 + idx * 0.02, 1.5, 4.5);
      const queueBase = 10 + idx * 3;
      const queue = Math.round(clamp(queueBase + Math.sin((clockTick + idx * 4) / 2) * 5, 2, 38));
      const status = worst(rateLevel(failRate), queueLevel(queue));
      const sparkline = buildSparkline(failRate, clockTick, idx);

      return { lineCode, failRate, throughput, takt, queue, status, sparkline };
    });
  }, [selectedPlant, lineMonthly, clockTick, plantAvgTakt]);

  /* ── render ── */
  return (
    <div className="space-y-5">
      {/* ─── 영역 1: 공장별 불량률 상단 바 ─── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {plantRates.map((p) => {
          const level = rateLevel(p.rate);
          const selected = p.code === selectedPlant;
          return (
            <button
              key={p.code}
              onClick={() => setSelectedPlant(p.code)}
              className={[
                "relative rounded-2xl border p-4 text-left transition-all",
                selected
                  ? "border-primary/60 bg-primary/10 shadow-[0_0_20px_rgba(45,212,191,0.2)]"
                  : "border-border/50 bg-card/80 hover:border-border",
              ].join(" ")}
            >
              <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ background: SL[level].color }} />
              <div className="pl-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {p.code} {p.name}
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
                  {p.rate.toFixed(2)}
                  <span className="ml-0.5 text-sm text-muted-foreground">%</span>
                </p>
                <p className={`mt-1 text-[11px] font-medium ${SL[level].text}`}>{SL[level].label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ─── 영역 2: 선택 공장 Parent Box ─── */}
      <section className="rounded-[28px] border border-border/60 bg-card/85 p-6 shadow-[0_0_50px_rgba(8,15,30,0.25)]">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold text-foreground">
            {selectedPlant} {PLANT_META[selectedPlant]?.name ?? ""}
          </h3>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${SL[plantOverallStatus].bg} ${SL[plantOverallStatus].border} ${SL[plantOverallStatus].text}`}
          >
            {SL[plantOverallStatus].label}
          </span>
        </div>

        {/* 생산 지표 4카드 + 부스 온도/습도 통합 1카드 = 5카드 가로 배치 */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">일일 평균 생산</p>
            <p className="mt-2 font-mono text-2xl text-foreground">{plantDetail.dailyTarget.toLocaleString()}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">대</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">달성률</p>
            <p className="mt-2 font-mono text-2xl text-foreground">
              {plantDetail.achieveRate.toFixed(1)}
              <span className="ml-0.5 text-sm text-muted-foreground">%</span>
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">불량률</p>
            <p className="mt-2 font-mono text-2xl" style={{ color: SL[rateLevel(plantDetail.failRate)].color }}>
              {plantDetail.failRate.toFixed(2)}
              <span className="ml-0.5 text-sm text-muted-foreground">%</span>
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">직행률 FTT</p>
            <p className="mt-2 font-mono text-2xl text-foreground">
              {plantDetail.ftt.toFixed(1)}
              <span className="ml-0.5 text-sm text-muted-foreground">%</span>
            </p>
          </div>
          {/* 부스 온도 + 습도 통합 카드 */}
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 shrink-0 text-amber-300" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">부스 온도</p>
                <p className="font-mono text-lg text-foreground">{plantDetail.avgTemp.toFixed(1)}°C</p>
              </div>
              <span className={`shrink-0 text-xs font-medium ${SL[tempLevel(plantDetail.avgTemp)].text}`}>
                {tempLevel(plantDetail.avgTemp) === "normal" ? "✓" : "⚠"} {SL[tempLevel(plantDetail.avgTemp)].label}
              </span>
            </div>
            <div className="my-2 border-t border-white/6" />
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 shrink-0 text-cyan-300" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">부스 습도</p>
                <p className="font-mono text-lg text-foreground">{plantDetail.avgHumidity.toFixed(1)}%</p>
              </div>
              <span className={`shrink-0 text-xs font-medium ${SL[humidLevel(plantDetail.avgHumidity)].text}`}>
                {humidLevel(plantDetail.avgHumidity) === "normal" ? "✓" : "⚠"} {SL[humidLevel(plantDetail.avgHumidity)].label}
              </span>
            </div>
          </div>
        </div>

        {/* 전일 교대조 A/B/C 비교 */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {shiftCards.map((s) => {
            const lines = PLANT_META[selectedPlant]?.lines ?? [];
            const lineBreakdown = lineShiftRows
              ? lines
                  .map((ln) => {
                    const hit = lineShiftMap.get(`${selectedPlant}-${ln}-${s.shift}`);
                    return hit ? { line: ln, total: hit.total, fail: hit.fail } : null;
                  })
                  .filter((x): x is { line: string; total: number; fail: number } => x !== null)
              : [];
            return (
              <div key={s.shift} className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{s.shift}조</p>
                  <span className={`text-xs font-medium ${SL[rateLevel(s.rate)].text}`}>{s.rate.toFixed(2)}%</span>
                </div>
                <p className="mt-2 font-mono text-lg text-foreground">
                  {s.total.toLocaleString()}
                  <span className="ml-1 text-xs text-muted-foreground">건</span>
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">불량 {s.failCount.toLocaleString()}건</p>
                {lineBreakdown.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-white/6 pt-2">
                    {lineBreakdown.map((b) => (
                      <div key={b.line} className="flex items-center justify-between text-[10px]">
                        <span className="font-mono text-muted-foreground">{b.line}</span>
                        <span className="font-mono text-foreground">
                          {b.total.toLocaleString()}
                          <span className="ml-1 text-muted-foreground">건</span>
                          <span className="ml-2 text-red-300">불량 {b.fail.toLocaleString()}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {s.shift === "C" && <p className="mt-2 text-[10px] text-amber-300">※ 22시대만 집계</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 영역 3: 라인별 Child Box ─── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Line Status</p>
          <h3 className="text-lg font-semibold text-foreground">{selectedPlant} 라인별 현황</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lineCards.map((line) => {
            const sl = SL[line.status];
            const chartData = line.sparkline.map((v, i) => ({ t: i * 5, r: Number(v.toFixed(2)) }));
            const currentHit = lineShiftMap.get(`${selectedPlant}-${line.lineCode}-${currentShift}`);
            return (
              <article key={line.lineCode} className="rounded-[22px] border border-white/8 bg-card/80 p-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-foreground">{line.lineCode}</h4>
                  <span
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${sl.bg} ${sl.border} ${sl.text}`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: sl.color, boxShadow: `0 0 6px ${sl.color}` }}
                    />
                    {line.status === "normal" ? "가동중" : line.status === "warning" ? "주의" : "위험"}
                  </span>
                </div>

                <p className="mt-3 font-mono text-3xl font-bold" style={{ color: SL[rateLevel(line.failRate)].color }}>
                  {line.failRate.toFixed(2)}
                  <span className="ml-0.5 text-sm font-normal text-muted-foreground">%</span>
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">불량률</p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-white/6 bg-white/[0.02] p-2">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Throughput</p>
                    <p className="mt-1 font-mono text-sm text-foreground">
                      {line.throughput}
                      <span className="text-[10px] text-muted-foreground">/h</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/6 bg-white/[0.02] p-2">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Takt</p>
                    <p className="mt-1 font-mono text-sm text-foreground">
                      {line.takt.toFixed(2)}
                      <span className="text-[10px] text-muted-foreground">s</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/6 bg-white/[0.02] p-2">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Queue</p>
                    <p className="mt-1 font-mono text-sm" style={{ color: SL[queueLevel(line.queue)].color }}>
                      {line.queue}
                    </p>
                  </div>
                </div>

                {/* 1h 불량률 추이 — Recharts LineChart with axes */}
                <div className="mt-3">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">1h 불량률 추이</p>
                  <div className="h-16 mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 2, right: 4, bottom: 0, left: -12 }}>
                        <XAxis
                          dataKey="t"
                          tick={{ fill: "#64748b", fontSize: 8 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: number) => `${v}m`}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fill: "#64748b", fontSize: 8 }}
                          tickLine={false}
                          axisLine={false}
                          width={30}
                          tickFormatter={(v: number) => `${v.toFixed(1)}`}
                          domain={["dataMin - 0.5", "dataMax + 0.5"]}
                        />
                        <Line type="monotone" dataKey="r" stroke={sl.color} strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 현재 교대조 누적 */}
                {currentHit && (
                  <div className="mt-3 rounded-lg border border-white/6 bg-white/[0.02] p-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        현재 <span className="font-mono text-primary">{currentShift}</span>조
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">{simHour}시</p>
                    </div>
                    <p className="mt-1 font-mono text-sm text-foreground">
                      누적 검사 {currentHit.total.toLocaleString()}
                      <span className="ml-1 text-[10px] text-muted-foreground">건</span>
                      <span className="ml-2 text-red-300">불량 {currentHit.fail.toLocaleString()}건</span>
                    </p>
                    {currentShift === "C" && (
                      <p className="mt-1 text-[9px] text-amber-300">※ 22시대만 집계</p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* ─── 영역 4: 결함 유형별 집계 바차트 ─── */}
      <section className="rounded-[28px] border border-border/60 bg-card/85 p-5 shadow-[0_0_50px_rgba(8,15,30,0.25)]">
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Defect Overview</p>
        <h3 className="mt-2 text-lg font-semibold text-foreground">결함 유형별 집계</h3>
        <p className="mt-1 text-sm text-muted-foreground">10개 결함 유형 발생 건수 (샘플 수치)</p>
        <div className="mt-4 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={DEFECT_TYPES} margin={{ top: 20, right: 10, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="code" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
              <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
              <Tooltip content={<DefectTooltip />} cursor={{ fill: "rgba(148,163,184,0.06)" }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {DEFECT_TYPES.map((_d, i) => (
                  <Cell key={i} fill={DEFECT_COLORS[i]} />
                ))}
                <LabelList
                  dataKey="count"
                  position="top"
                  formatter={(v: number) => v.toLocaleString()}
                  fill="#94a3b8"
                  fontSize={10}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
