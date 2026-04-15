import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowUpRight, Gauge, Package } from "lucide-react";

const planVsActual = Array.from({ length: 30 }, (_, i) => ({
  day: `D-${29 - i}`,
  plan: 900 + Math.round(Math.sin(i / 3) * 80),
  actual: 880 + Math.round(Math.cos(i / 2.2) * 60) + (i > 25 ? -40 : 0),
}));

const modelMonthly = [
  { model: "SV7", qty: 18200 },
  { model: "NQ5", qty: 16400 },
  { model: "CN7", qty: 15100 },
  { model: "LX2", qty: 12500 },
  { model: "EV9", qty: 9800 },
  { model: "GV70", qty: 8700 },
  { model: "MQ4", qty: 7600 },
];

const urgentTable = [
  { model: "SV7", color: "B3L", plant: "ULN", dos: 2.1, flag: "Y" },
  { model: "EV9", color: "SWP", plant: "GWJ", dos: 1.6, flag: "Y" },
  { model: "GV70", color: "P2W", plant: "ASN", dos: 2.8, flag: "Y" },
];

const shipmentArea = Array.from({ length: 14 }, (_, i) => ({
  d: `${i + 1}`,
  production: 850 + Math.round(Math.sin(i / 2) * 40),
  shipment: 820 + Math.round(Math.cos(i / 2.5) * 55),
}));

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
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/8 p-3 text-xs text-amber-200">
        <span className="font-semibold">샘플 데이터</span> — L01 레이어는 MES 주문/생산량 소스 연결 전 단계입니다. 수치는 시연용 목업.
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="당일 생산 진행률" value="86.4%" sub="실적 778 / 계획 900" tone="ok" Icon={Gauge} />
        <Kpi label="월 누적 달성률" value="93.2%" sub="전월 대비 +2.1%p" tone="info" Icon={ArrowUpRight} />
        <Kpi label="재고 긴급 모델" value="3건" sub="urgent_flag='Y'" tone="crit" Icon={AlertTriangle} />
        <Kpi label="전체 가동률" value="78.5%" sub="capacity_utilization_pct 평균" tone="warn" Icon={Package} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="일별 계획 vs 실적" desc="최근 30일">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={planVsActual}>
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

        <Panel title="모델별 월 누적 생산량" desc="Top 7 모델 (대)">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelMonthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="model" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid rgba(148,163,184,0.25)" }} />
                <Bar dataKey="qty" radius={[6, 6, 0, 0]}>
                  {modelMonthly.map((_, i) => (
                    <Cell key={i} fill={["#06b6d4", "#10b981", "#22d3ee", "#2dd4bf", "#0ea5e9", "#14b8a6", "#67e8f9"][i % 7]} />
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

        <Panel title="안전재고 미달 경보" desc="urgent_flag='Y'">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1">모델</th>
                <th>색상</th>
                <th>공장</th>
                <th>DOS</th>
                <th>플래그</th>
              </tr>
            </thead>
            <tbody>
              {urgentTable.map((r, i) => (
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
