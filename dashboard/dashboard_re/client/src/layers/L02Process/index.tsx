import ProcessPage from "@/pages/ProcessPage";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { AlertTriangle, Droplets, Sunrise } from "lucide-react";

/* ── fallback data (S3 미연결 시) ── */
const fallbackPlantRates = [
  { plant: "ASN", rate: 4.09 },
  { plant: "ULN", rate: 4.07 },
  { plant: "GWJ", rate: 4.04 },
  { plant: "HWS", rate: 4.06 },
];

const fallbackHeatShifts = ["A조(06~13)", "B조(14~21)", "C조(22시)"];
const fallbackHeatHours = ["06", "07", "10", "14", "15", "18", "22"];
const fallbackHeatmap: Record<string, number[]> = {
  "A조(06~13)": [6.08, 5.94, 3.6, 0, 0, 0, 0],
  "B조(14~21)": [0, 0, 0, 4.1, 3.55, 3.5, 0],
  "C조(22시)": [0, 0, 0, 0, 0, 0, 6.02],
};

/* ── helpers ── */
function asNum(v: unknown, fb = 0) {
  const n = Number(v ?? fb);
  return Number.isFinite(n) ? n : fb;
}

function isS3Array(v: unknown): v is Record<string, unknown>[] {
  return Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && v[0] !== null;
}

function shiftStartCol(h: string) {
  return h === "06" || h === "14" || h === "22";
}

export default function L02Process() {
  const { data: processData } = trpc.mes.processData.useQuery(undefined, { refetchInterval: 30_000 });
  const isLive = processData?.isLive === true;
  const [selectedPlant, setSelectedPlant] = useState("");

  /* ── S3 파싱 ── */
  const kpiDaily = useMemo(
    () => (isS3Array(processData?.kpiDaily) ? (processData!.kpiDaily as Record<string, unknown>[]) : null),
    [processData?.kpiDaily],
  );
  const shiftDefect = useMemo(
    () => (isS3Array(processData?.shiftDefectRate) ? (processData!.shiftDefectRate as Record<string, unknown>[]) : null),
    [processData?.shiftDefectRate],
  );
  const envBins = useMemo(
    () => (isS3Array(processData?.envBins) ? (processData!.envBins as Record<string, unknown>[]) : null),
    [processData?.envBins],
  );

  /* ── 공장 드롭다운 옵션 ── */
  const plantOptions = useMemo(() => {
    if (!kpiDaily) return [];
    const seen = new Map<string, string>();
    kpiDaily.forEach((r) => {
      const code = String(r.plant_code ?? "");
      if (code && !seen.has(code)) seen.set(code, String(r.plant_name ?? code));
    });
    return Array.from(seen.entries()).map(([code, name]) => ({ code, name }));
  }, [kpiDaily]);

  /* ── 공장별 불량률 ── */
  const plantData = useMemo(() => {
    if (!kpiDaily) return fallbackPlantRates;
    const g = new Map<string, { total: number; fail: number }>();
    kpiDaily.forEach((r) => {
      const code = String(r.plant_code ?? "");
      if (!code) return;
      const c = g.get(code) ?? { total: 0, fail: 0 };
      c.total += asNum(r.total);
      c.fail += asNum(r.fail_count);
      g.set(code, c);
    });
    return Array.from(g.entries()).map(([plant, v]) => ({
      plant,
      rate: v.total > 0 ? (v.fail / v.total) * 100 : 0,
    }));
  }, [kpiDaily]);

  /* ── 시계열 수율 추이 ── */
  const yieldTrend = useMemo(() => {
    if (!kpiDaily) return [];
    const filtered = selectedPlant ? kpiDaily.filter((r) => String(r.plant_code) === selectedPlant) : kpiDaily;
    const g = new Map<string, { total: number; fail: number }>();
    filtered.forEach((r) => {
      const date = String(r.date ?? "");
      if (!date) return;
      const c = g.get(date) ?? { total: 0, fail: 0 };
      c.total += asNum(r.total);
      c.fail += asNum(r.fail_count);
      g.set(date, c);
    });
    return Array.from(g.entries())
      .map(([date, v]) => ({ date, yield_rate: v.total > 0 ? ((v.total - v.fail) / v.total) * 100 : 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [kpiDaily, selectedPlant]);

  /* ── 히트맵 ── */
  const { heatShifts, heatHours, shiftMap } = useMemo(() => {
    if (!shiftDefect) return { heatShifts: fallbackHeatShifts, heatHours: fallbackHeatHours, shiftMap: fallbackHeatmap };
    const sSet = new Set<string>();
    const hSet = new Set<number>();
    const lookup = new Map<string, number>();
    shiftDefect.forEach((r) => {
      const s = String(r.shift ?? "");
      const h = asNum(r.hour);
      sSet.add(s);
      hSet.add(h);
      lookup.set(`${s}-${h}`, asNum(r.fail_rate));
    });
    const shifts = Array.from(sSet).sort();
    const hours = Array.from(hSet)
      .sort((a, b) => a - b)
      .map((h) => String(h).padStart(2, "0"));
    const map: Record<string, number[]> = {};
    shifts.forEach((s) => {
      map[`${s}조`] = hours.map((h) => lookup.get(`${s}-${Number(h)}`) ?? 0);
    });
    return { heatShifts: shifts.map((s) => `${s}조`), heatHours: hours, shiftMap: map };
  }, [shiftDefect]);

  /* ── 온습도 산점도 ── */
  const envScatter = useMemo(() => {
    if (!envBins) return [];
    return envBins.map((r) => ({
      humidity: asNum(r.humidity_bin),
      temperature: asNum(r.temp_bin),
      failRate: asNum(r.fail_rate),
      total: asNum(r.total),
    }));
  }, [envBins]);

  /* ── KPI 집계 ── */
  const kpi = useMemo(() => {
    if (!kpiDaily) return null;
    const filtered = selectedPlant ? kpiDaily.filter((r) => String(r.plant_code) === selectedPlant) : kpiDaily;
    const total = filtered.reduce((s, r) => s + asNum(r.total), 0);
    const fails = filtered.reduce((s, r) => s + asNum(r.fail_count), 0);
    const taktSum = filtered.reduce((s, r) => s + asNum(r.avg_takt), 0);
    return { total, fails, avgTakt: filtered.length > 0 ? taktSum / filtered.length : 0 };
  }, [kpiDaily, selectedPlant]);

  const hasEnvBins = envBins !== null;
  const shiftRows = Object.keys(shiftMap);

  return (
    <div className="space-y-5">
      {/* 데이터 소스 배지 */}
      <div
        className={`rounded-2xl border p-3 text-xs ${
          isLive
            ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
            : "border-amber-400/30 bg-amber-400/8 text-amber-200"
        }`}
      >
        <span className="font-semibold">{isLive ? "S3 Live 데이터" : "샘플 데이터"}</span>
        {!isLive && " — L02 레이어는 S3 집계 연결 전 단계. 수치는 시연용 목업."}
        {isLive && hasEnvBins && " — env_bins 포함"}
      </div>

      {/* 공장 선택 드롭다운 */}
      {plantOptions.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground">공장 선택</label>
          <select
            value={selectedPlant}
            onChange={(e) => setSelectedPlant(e.target.value)}
            className="h-9 rounded-xl border border-border/60 bg-card/85 px-3 text-sm text-foreground outline-none"
          >
            <option value="">전체</option>
            {plantOptions.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* KPI 카드 4종 */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-white/8 bg-card/80 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Total Inspections</p>
          <p className="mt-3 font-mono text-3xl text-foreground">{kpi ? kpi.total.toLocaleString() : "—"}</p>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-card/80 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Total Fails</p>
          <p className="mt-3 font-mono text-3xl text-foreground">{kpi ? kpi.fails.toLocaleString() : "—"}</p>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-card/80 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Average Takt</p>
          <p className="mt-3 font-mono text-3xl text-foreground">
            {kpi ? kpi.avgTakt.toFixed(2) : "—"}
            <span className="ml-1 text-sm text-muted-foreground">sec</span>
          </p>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-card/80 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Inference Latency</p>
          <p className="mt-3 font-mono text-3xl text-foreground">
            1.20
            <span className="ml-1 text-sm text-muted-foreground">sec</span>
          </p>
        </div>
      </div>

      {/* 공장별 불량률 막대 */}
      <section className="rounded-[28px] border border-border/60 bg-card/85 p-5 shadow-[0_0_50px_rgba(8,15,30,0.25)]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Process Insights</p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">공장별 불량률{kpiDaily ? " (S3 kpi_daily 기반)" : " (정형 300만건 기반)"}</h3>
            <p className="mt-1 text-sm text-muted-foreground">공장 간 불량률 편차 비교</p>
          </div>
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={plantData} margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="plant" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <YAxis domain={kpiDaily ? ["auto", "auto"] : [3.9, 4.2]} tick={{ fill: "#cbd5e1", fontSize: 12 }} unit="%" />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", color: "#f1f5f9" }} />
              <Bar dataKey="rate" radius={[8, 8, 0, 0]}>
                {plantData.map((_d, i) => (
                  <Cell key={i} fill={["#10b981", "#06b6d4", "#22d3ee", "#2dd4bf"][i % 4]} />
                ))}
                <LabelList dataKey="rate" position="top" formatter={(v: number) => `${v.toFixed(2)}%`} fill="#e2e8f0" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 시계열 수율 추이 */}
      {yieldTrend.length > 0 && (
        <section className="rounded-[28px] border border-border/60 bg-card/85 p-5">
          <h3 className="text-sm font-semibold text-foreground">
            시계열 수율 추이{selectedPlant ? ` (${selectedPlant})` : " (전체)"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">kpi_daily yield_rate 기준 일별 추이</p>
          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yieldTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="date" tick={{ fill: "#cbd5e1", fontSize: 10 }} minTickGap={30} />
                <YAxis domain={[90, 100]} tick={{ fill: "#cbd5e1", fontSize: 11 }} unit="%" />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid rgba(148,163,184,0.25)" }} />
                <Area type="monotone" dataKey="yield_rate" stroke="#2dd4bf" fill="rgba(45,212,191,0.22)" strokeWidth={2} name="수율(%)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* 교대 시작 히트맵 + 저습도 알림 */}
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-[28px] border border-border/60 bg-card/85 p-5 lg:col-span-2">
          <div className="mb-3 flex items-start gap-3">
            <Sunrise className="mt-1 h-5 w-5 text-amber-300" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">교대 × 시간대 불량률 히트맵</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                교대 시작 직후 구간(<span className="text-amber-300 font-medium">06·14·22시</span>) 은 테두리 강조 — 평균 대비 1.5배 상승
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 text-xs">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left text-muted-foreground">Shift \\ Hour</th>
                  {heatHours.map((h) => (
                    <th
                      key={h}
                      className={`px-2 py-1 text-center ${shiftStartCol(h) ? "rounded bg-amber-400/20 text-amber-200" : "text-muted-foreground"}`}
                    >
                      {h}시
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shiftRows.map((s) => (
                  <tr key={s}>
                    <td className="px-2 py-1 text-foreground">{s}</td>
                    {heatHours.map((h, i) => {
                      const v = shiftMap[s]?.[i] ?? 0;
                      const alpha = Math.min(0.85, Math.max(0.08, v / 7));
                      const isStart = shiftStartCol(h);
                      const isC22 = s.startsWith("C") && h === "22";
                      return (
                        <td
                          key={h}
                          title={
                            isC22
                              ? "C조는 22시 1시간 데이터만 존재 — 교대 시작 효과와 동일"
                              : isStart
                                ? "교대 시작 직후 구간 (불량률 ~6%)"
                                : v > 0
                                  ? `불량률 ${v.toFixed(2)}%`
                                  : ""
                          }
                          className={`h-9 rounded text-center font-mono text-[11px] ${isStart ? "border border-amber-400/60" : ""}`}
                          style={{
                            background:
                              v > 0
                                ? `linear-gradient(180deg, rgba(239,68,68,${alpha}), rgba(245,158,11,${alpha * 0.6}))`
                                : "rgba(30,41,59,0.25)",
                            color: v > 0 ? "#fff" : "rgba(148,163,184,0.4)",
                          }}
                        >
                          {v > 0 ? v.toFixed(2) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex items-center gap-2 text-[11px] text-amber-300">
            <span className="inline-block h-3 w-3 rounded border border-amber-400/60" />
            교대 시작 직후 구간 (불량률 ~6%)
          </p>
        </section>

        <section className="rounded-[28px] border border-rose-500/30 bg-rose-500/8 p-5">
          <div className="flex items-center gap-2 text-rose-200">
            <Droplets className="h-5 w-5" />
            <h3 className="text-base font-semibold">저습도 주의</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-rose-100/80">
            현재 부스 습도 <span className="font-mono text-rose-200 font-bold">22%</span> — 임계 25% 하회
          </p>
          <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/15 p-3 text-xs text-rose-100">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              저습도 주의 (불량률 상승 구간)
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-rose-200/70">
              저습도(&lt;25%) 환경에서 정전기 증가 및 도장 흐름 불량으로 불량률이 4.3~4.5% 로 상승. 습도 유지 장치 점검 권장.
            </p>
          </div>
        </section>
      </div>

      {/* 온습도-불량률 산점도 */}
      {envScatter.length > 0 && (
        <section className="rounded-[28px] border border-border/60 bg-card/85 p-5">
          <h3 className="text-sm font-semibold text-foreground">온습도-불량률 산점도</h3>
          <p className="mt-1 text-xs text-muted-foreground">env_bins — humidity_bin(x) × temp_bin(y), 버블 크기 = total</p>
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 12, bottom: 12, left: 4 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" />
                <XAxis type="number" dataKey="humidity" name="Humidity" tick={{ fill: "#94a3b8", fontSize: 11 }} unit="%" />
                <YAxis type="number" dataKey="temperature" name="Temperature" tick={{ fill: "#94a3b8", fontSize: 11 }} unit="°C" />
                <ZAxis type="number" dataKey="total" range={[60, 400]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "#0b1220", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 12 }} />
                <Scatter data={envScatter} fill="#2dd4bf" name="환경 버블" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* 기존 ProcessPage */}
      <ProcessPage s3ProcessData={processData ?? undefined} />
    </div>
  );
}
