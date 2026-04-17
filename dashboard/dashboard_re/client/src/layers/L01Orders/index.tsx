import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowUpRight, Gauge, Package } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useSimClock } from "@/lib/simulationClock";

/* ── fallback sample data (S3 미연결 시) ── */
const samplePlanVsActual = Array.from({ length: 30 }, (_, i) => ({
  day: `D-${29 - i}`,
  plan: 900 + Math.round(Math.sin(i / 3) * 80),
  actual: 880 + Math.round(Math.cos(i / 2.2) * 60) + (i > 25 ? -40 : 0),
}));

const sampleModelMonthly = [
  { model: "SV7", qty: 18200 },
  { model: "NQ5", qty: 16400 },
  { model: "CN7", qty: 15100 },
  { model: "LX2", qty: 12500 },
  { model: "EV9", qty: 9800 },
  { model: "GV70", qty: 8700 },
  { model: "MQ4", qty: 7600 },
];

const sampleUrgent = [
  { model: "SV7", color: "B3L", plant: "ULN", dos: 2.1, flag: "Y" },
  { model: "EV9", color: "SWP", plant: "GWJ", dos: 1.6, flag: "Y" },
  { model: "GV70", color: "P2W", plant: "ASN", dos: 2.8, flag: "Y" },
];

const shipmentArea = Array.from({ length: 14 }, (_, i) => ({
  d: `${i + 1}`,
  production: 850 + Math.round(Math.sin(i / 2) * 40),
  shipment: 820 + Math.round(Math.cos(i / 2.5) * 55),
}));
/* ── end fallback ── */

function isS3Array(v: unknown): v is Record<string, unknown>[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((r) => r !== null && typeof r === "object" && "model_code" in (r as Record<string, unknown>))
  );
}

function Kpi({ label, value, sub, tone, Icon }: { label: string; value: string; sub: string; tone: "ok" | "warn" | "info" | "crit"; Icon: typeof Gauge }) {
  const tones = {
    ok: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    warn: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    info: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
    crit: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  };
  return (
    <div className={`flex items-start justify-between gap-3 rounded-2xl border p-4 ${tones[tone]}`}>
      <div>
        <p className="text-[11px] uppercase tracking-[0.25em] opacity-75">{label}</p>
        <p className="mt-2 font-mono text-3xl font-bold">{value}</p>
        <p className="mt-1 text-xs opacity-70">{sub}</p>
      </div>
      <Icon className="h-5 w-5 opacity-70" />
    </div>
  );
}

function Panel({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-border/60 bg-card/85 p-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function L01Orders() {
  const { data: l01Data } = trpc.mes.l01Data.useQuery(undefined, { refetchInterval: 60_000 });
  const isLive = l01Data?.isLive === true;

  const simNow = useSimClock(60_000);
  const simDate = `${simNow.getFullYear()}-${String(simNow.getMonth() + 1).padStart(2, "0")}-${String(simNow.getDate()).padStart(2, "0")}`;
  const { data: workOrdersData } = trpc.mes.workOrders.useQuery({ date: simDate });
  const hasWorkOrders = workOrdersData?.data != null;

  /* ── S3 snapshots parsing ── */
  const snapshots = useMemo(() => {
    const raw = (l01Data as Record<string, unknown> | undefined)?.snapshots;
    return isS3Array(raw) ? raw : null;
  }, [l01Data]);

  /* KPI from snapshots */
  const kpi = useMemo(() => {
    if (!snapshots) return null;
    let sumPlanned = 0;
    let sumCapacity = 0;
    let sumUtil = 0;
    const urgentModels = new Set<string>();
    for (const r of snapshots) {
      sumPlanned += Number(r.planned_production) || 0;
      sumCapacity += Number(r.production_capacity) || 0;
      sumUtil += Number(r.capacity_utilization_pct) || 0;
      if (Number(r.closing_inventory) < Number(r.safety_stock_target)) {
        urgentModels.add(String(r.model_code ?? ""));
      }
    }
    const progressRate = sumCapacity > 0 ? (sumPlanned / sumCapacity) * 100 : 0;
    const avgUtil = snapshots.length > 0 ? sumUtil / snapshots.length : 0;
    return {
      progressRate: progressRate.toFixed(1),
      sumPlanned,
      sumCapacity,
      avgUtil: avgUtil.toFixed(1),
      urgentCount: urgentModels.size,
    };
  }, [snapshots]);

  /* Plan vs Actual (group by year-month) */
  const planVsActualData = useMemo(() => {
    if (!snapshots) return null;
    const monthMap = new Map<string, { plan: number; actual: number }>();
    for (const r of snapshots) {
      const key = `${r.year}-${String(Number(r.month)).padStart(2, "0")}`;
      const entry = monthMap.get(key) ?? { plan: 0, actual: 0 };
      entry.plan += Number(r.total_demand_forecast) || 0;
      entry.actual += Number(r.planned_production) || 0;
      monthMap.set(key, entry);
    }
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, v]) => ({ day: m, plan: v.plan, actual: v.actual }));
  }, [snapshots]);

  /* Model monthly (Top 7 by planned_production) */
  const modelMonthlyData = useMemo(() => {
    if (!snapshots) return null;
    const modelMap = new Map<string, number>();
    for (const r of snapshots) {
      const model = String(r.model_code ?? "");
      modelMap.set(model, (modelMap.get(model) ?? 0) + (Number(r.planned_production) || 0));
    }
    return Array.from(modelMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([model, qty]) => ({ model, qty }));
  }, [snapshots]);

  /* Safety stock alert: closing_inventory < safety_stock_target (latest month per model) */
  const urgentData = useMemo(() => {
    if (!snapshots) return null;
    const latest = new Map<string, Record<string, unknown>>();
    for (const r of snapshots) {
      const model = String(r.model_code ?? "");
      const prev = latest.get(model);
      const curKey = `${r.year}-${String(Number(r.month)).padStart(2, "0")}`;
      const prevKey = prev ? `${prev.year}-${String(Number(prev.month as number)).padStart(2, "0")}` : "";
      if (!prev || curKey > prevKey) latest.set(model, r);
    }
    return Array.from(latest.values())
      .filter((r) => Number(r.closing_inventory) < Number(r.safety_stock_target))
      .map((r) => ({
        model: String(r.model_code ?? ""),
        closing: Number(r.closing_inventory) || 0,
        safety: Number(r.safety_stock_target) || 0,
      }));
  }, [snapshots]);

  const chartColors = ["#06b6d4", "#10b981", "#22d3ee", "#2dd4bf", "#0ea5e9", "#14b8a6", "#67e8f9"];
  const effectiveModelMonthly = modelMonthlyData ?? sampleModelMonthly;

  return (
    <div className="space-y-5">
      <div
        className={`rounded-2xl border p-3 text-xs ${
          isLive
            ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
            : "border-amber-400/30 bg-amber-400/8 text-amber-200"
        }`}
      >
        <span className="font-semibold">{isLive ? "S3 Live 데이터" : "샘플 데이터"}</span>
        {isLive && hasWorkOrders && ` — work_orders(${simDate}) 연결됨`}
        {isLive && snapshots && ` · snapshots ${snapshots.length}건`}
        {!isLive && " — L01 레이어는 MES 주문/생산량 소스 연결 전 단계입니다. 수치는 시연용 목업."}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="당일 생산 진행률"
          value={kpi ? `${kpi.progressRate}%` : "86.4%"}
          sub={kpi ? `실적 ${kpi.sumPlanned.toLocaleString()} / 계획 ${kpi.sumCapacity.toLocaleString()}` : "실적 778 / 계획 900"}
          tone="ok"
          Icon={Gauge}
        />
        <Kpi
          label="월 누적 달성률"
          value={kpi ? `${kpi.avgUtil}%` : "93.2%"}
          sub={kpi ? "capacity_utilization_pct 평균" : "전월 대비 +2.1%p"}
          tone="info"
          Icon={ArrowUpRight}
        />
        <Kpi
          label="재고 긴급 모델"
          value={kpi ? `${kpi.urgentCount}건` : "3건"}
          sub={kpi ? "closing < safety_stock_target" : "urgent_flag='Y'"}
          tone="crit"
          Icon={AlertTriangle}
        />
        <Kpi
          label="전체 가동률"
          value={kpi ? `${kpi.avgUtil}%` : "78.5%"}
          sub="capacity_utilization_pct 평균"
          tone="warn"
          Icon={Package}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="계획 vs 실적" desc={planVsActualData ? `${planVsActualData.length}개월` : "최근 30일"}>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={planVsActualData ?? samplePlanVsActual}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="day" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid rgba(148,163,184,0.25)" }} />
                <Line dataKey="plan" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line dataKey="actual" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="모델별 월 누적 생산량" desc={modelMonthlyData ? `Top ${effectiveModelMonthly.length} 모델` : "Top 7 모델 (대)"}>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={effectiveModelMonthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="model" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid rgba(148,163,184,0.25)" }} />
                <Bar dataKey="qty" radius={[6, 6, 0, 0]}>
                  {effectiveModelMonthly.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % 7]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="출하량 vs 생산량 (최근 14일)" desc="영역 차트">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={shipmentArea}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="d" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid rgba(148,163,184,0.25)" }} />
                <Area type="monotone" dataKey="production" stroke="#06b6d4" fill="rgba(6,182,212,0.25)" />
                <Area type="monotone" dataKey="shipment" stroke="#10b981" fill="rgba(16,185,129,0.22)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="안전재고 미달 경보" desc={urgentData ? `${urgentData.length}건 검출` : "urgent_flag='Y'"}>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                {urgentData ? (
                  <>
                    <th className="py-1">모델</th>
                    <th>기말재고</th>
                    <th>안전재고</th>
                    <th>부족분</th>
                  </>
                ) : (
                  <>
                    <th className="py-1">모델</th>
                    <th>색상</th>
                    <th>공장</th>
                    <th>DOS</th>
                    <th>플래그</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {urgentData
                ? urgentData.map((r, i) => (
                    <tr key={i} className="border-t border-border/40 text-foreground">
                      <td className="py-2 font-mono">{r.model}</td>
                      <td className="font-mono">{r.closing.toLocaleString()}</td>
                      <td className="font-mono">{r.safety.toLocaleString()}</td>
                      <td className="font-mono text-rose-300">{(r.safety - r.closing).toLocaleString()}</td>
                    </tr>
                  ))
                : sampleUrgent.map((r, i) => (
                    <tr key={i} className="border-t border-border/40 text-foreground">
                      <td className="py-2 font-mono">{r.model}</td>
                      <td>{r.color}</td>
                      <td>{r.plant}</td>
                      <td className="font-mono text-rose-300">{r.dos}일</td>
                      <td>
                        <span className="rounded-md bg-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-100">{r.flag}</span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="월별 수요예측 vs 실제 생산" desc="계획 정확도 — 목업">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { m: "1월", plan: 24500, actual: 23800 },
                { m: "2월", plan: 23500, actual: 24100 },
                { m: "3월", plan: 25000, actual: 24600 },
                { m: "4월", plan: 26000, actual: 25200 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="m" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid rgba(148,163,184,0.25)" }} />
                <Bar dataKey="plan" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="재고일수(DOS) 히트맵" desc="모델 × 날짜 — 목업">
          <div className="grid grid-cols-8 gap-1 text-[10px]">
            {Array.from({ length: 56 }, (_, i) => {
              const v = 1 + (i * 37) % 10;
              const alpha = Math.min(0.9, v / 10);
              return (
                <div
                  key={i}
                  className="flex aspect-square items-center justify-center rounded font-mono"
                  style={{ background: v < 3 ? `rgba(239,68,68,${alpha})` : `rgba(6,182,212,${alpha * 0.4})`, color: "#fff" }}
                  title={`DOS ${v}일`}
                >
                  {v}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">빨강 = DOS &lt; 3일 (긴급)</p>
        </Panel>
      </div>
    </div>
  );
}
