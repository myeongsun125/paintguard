import { Area, AreaChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Flame, Gauge, Thermometer } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

type OvenStatus = "OK" | "WARN" | "CRIT";
type Oven = { id: string; status: OvenStatus; temp: number; anomaly?: string };
type AlertEvent = { oven: string; zone: string; reason: string; due: string };

const ovens: Oven[] = Array.from({ length: 13 }, (_, i) => {
  const id = `OVEN-${String(i + 1).padStart(2, "0")}`;
  const r = (i * 17) % 13;
  const status: OvenStatus = r < 9 ? "OK" : r < 11 ? "WARN" : "CRIT";
  return { id, status, temp: 180 + r * 3.2, anomaly: status !== "OK" ? ["HEATER", "SENSOR", "FAN", "CONVEYOR"][r % 4] : undefined };
});

function isOvenArray(v: unknown): v is Oven[] {
  return (
    Array.isArray(v) &&
    v.every(
      (x) =>
        x !== null &&
        typeof x === "object" &&
        typeof (x as Oven).id === "string" &&
        typeof (x as Oven).status === "string" &&
        typeof (x as Oven).temp === "number"
    )
  );
}

function isAlertEventArray(v: unknown): v is AlertEvent[] {
  return (
    Array.isArray(v) &&
    v.every(
      (x) =>
        x !== null &&
        typeof x === "object" &&
        typeof (x as AlertEvent).oven === "string" &&
        typeof (x as AlertEvent).reason === "string"
    )
  );
}

const tempProfile = Array.from({ length: 24 }, (_, i) => ({
  t: `${i}:00`,
  z1: 180 + Math.sin(i / 3) * 3,
  z2: 182 + Math.cos(i / 4) * 2,
  z3: 185 + Math.sin(i / 2.5) * 2.5,
  z4: 183 + Math.cos(i / 3.2) * 3,
}));

const heaterCurrent = Array.from({ length: 40 }, (_, i) => ({
  s: i,
  temp: 180 + Math.sin(i / 3) * 4 + (i === 25 ? 12 : 0),
  current: 32 + Math.cos(i / 3) * 1.5 + (i === 25 ? 4.5 : 0),
}));

const anomalyDonut = [
  { name: "HEATER", value: 42, color: "#ef4444" },
  { name: "SENSOR", value: 28, color: "#f59e0b" },
  { name: "FAN", value: 18, color: "#22d3ee" },
  { name: "CONVEYOR", value: 12, color: "#a78bfa" },
];

const aeError = Array.from({ length: 36 }, (_, i) => ({
  t: i,
  err: 0.12 + Math.sin(i / 4) * 0.04 + (i > 28 ? 0.15 : 0),
}));

const maintenanceList = [
  { oven: "OVEN-11", zone: "Zone 3", reason: "히터 전류 편차 +14%", due: "D-2" },
  { oven: "OVEN-07", zone: "Zone 2", reason: "센서 값 튐 현상 반복", due: "D-5" },
  { oven: "OVEN-04", zone: "Zone 1", reason: "컨베이어 속도 저하", due: "D-7" },
];

function Kpi({ label, value, sub, tone, Icon }: { label: string; value: string; sub: string; tone: "ok" | "warn" | "crit" | "info"; Icon: typeof Gauge }) {
  const tones = {
    ok: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    warn: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    crit: "border-rose-400/30 bg-rose-500/10 text-rose-200",
    info: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
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

function Panel({ title, desc, children, className = "" }: { title: string; desc: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[28px] border border-border/60 bg-card/85 p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const AnomalyTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 12px", color: "#f1f5f9", fontSize: 13 }}>
      <p style={{ margin: 0 }}>{payload[0].name}: {payload[0].value}건</p>
    </div>
  );
};

export default function L04Maintenance() {
  const [sel, setSel] = useState<string>("OVEN-01");
  const { data: maintenanceData } = trpc.mes.maintenanceData.useQuery();
  const isLive = maintenanceData?.isLive === true;

  const ovenList: Oven[] = isOvenArray(maintenanceData?.ovenStatus)
    ? maintenanceData.ovenStatus
    : ovens;
  const alertList: AlertEvent[] = isAlertEventArray(maintenanceData?.alertEvents)
    ? maintenanceData.alertEvents
    : maintenanceList;

  const crit = ovenList.filter((o) => o.status === "CRIT").length;
  const warn = ovenList.filter((o) => o.status === "WARN").length;

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
        {!isLive && " — L04 레이어는 건조로 센서(oven_sensor) 연결 전 단계. 수치는 시연용 목업."}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="가동 중 건조로" value={`${ovenList.filter((o) => o.status !== "CRIT").length}/${ovenList.length}`} sub="정상+경고" tone="ok" Icon={Flame} />
        <Kpi label="금일 이상 이벤트" value={`${crit + warn}건`} sub={`HIGH ${crit} · MED ${warn}`} tone="warn" Icon={AlertTriangle} />
        <Kpi label="정비 필요 건조로" value={`${crit}대`} sub="maintenance_required='Y'" tone="crit" Icon={Gauge} />
        <Kpi label="온도 정상 비율" value="94.7%" sub="Zone 1~4 복합" tone="info" Icon={Thermometer} />
      </div>

      <Panel title="건조로 13개 상태" desc="색상 배지 — 클릭 시 해당 건조로 상세">
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
          {ovenList.map((o) => {
            const tone = o.status === "OK" ? "border-emerald-400/30 bg-emerald-500/10" : o.status === "WARN" ? "border-amber-400/30 bg-amber-400/10" : "border-rose-400/40 bg-rose-500/15";
            const dot = o.status === "OK" ? "bg-emerald-400" : o.status === "WARN" ? "bg-amber-400" : "bg-rose-400";
            return (
              <button key={o.id} onClick={() => setSel(o.id)} className={`rounded-xl border p-3 text-left transition hover:scale-[1.02] ${tone} ${sel === o.id ? "ring-2 ring-primary/50" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-foreground">{o.id}</span>
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                </div>
                <p className="mt-2 font-mono text-lg text-foreground">{o.temp.toFixed(1)}°C</p>
                <p className="text-[10px] text-muted-foreground">{o.anomaly ? `이상: ${o.anomaly}` : "정상"}</p>
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title={`${sel} · Zone 1~4 온도 프로파일`} desc="24시간 영역 차트">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tempProfile}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="t" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} domain={[170, 195]} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid rgba(148,163,184,0.25)" }} />
                <Area type="monotone" dataKey="z1" stroke="#06b6d4" fill="rgba(6,182,212,0.2)" />
                <Area type="monotone" dataKey="z2" stroke="#10b981" fill="rgba(16,185,129,0.18)" />
                <Area type="monotone" dataKey="z3" stroke="#f59e0b" fill="rgba(245,158,11,0.18)" />
                <Area type="monotone" dataKey="z4" stroke="#a78bfa" fill="rgba(167,139,250,0.18)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="히터 전류 + 온도 실시간" desc="이상 시점 마커 @ t=25">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={heaterCurrent}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="s" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                <YAxis yAxisId="l" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <YAxis yAxisId="r" orientation="right" tick={{ fill: "#f59e0b", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid rgba(148,163,184,0.25)" }} />
                <ReferenceLine x={25} yAxisId="l" stroke="#ef4444" strokeDasharray="3 3" label={{ value: "이상", fill: "#ef4444", fontSize: 10 }} />
                <Line yAxisId="l" type="monotone" dataKey="temp" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line yAxisId="r" type="monotone" dataKey="current" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="이상 유형 분포" desc="도넛 — HEATER / SENSOR / FAN / CONVEYOR">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={anomalyDonut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {anomalyDonut.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip content={<AnomalyTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
            {anomalyDonut.map((r) => (
              <span key={r.name} className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 rounded" style={{ background: r.color }} />
                {r.name} {r.value}
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="LSTM-AE 재구성 오차" desc="임계선 0.2 초과 시 이상 경보">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={aeError}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="t" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} domain={[0, 0.4]} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid rgba(148,163,184,0.25)" }} />
                <ReferenceLine y={0.2} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "임계 0.2", fill: "#ef4444", fontSize: 10 }} />
                <Line type="monotone" dataKey="err" stroke="#a78bfa" strokeWidth={2.5} dot={{ fill: "#a78bfa" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="정비 필요 알림" desc="maintenance_required='Y'">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">건조로</th>
              <th>Zone</th>
              <th>사유</th>
              <th>기한</th>
            </tr>
          </thead>
          <tbody>
            {alertList.map((m, i) => (
              <tr key={i} className="border-t border-border/40 text-foreground">
                <td className="py-2 font-mono">{m.oven}</td>
                <td>{m.zone}</td>
                <td>{m.reason}</td>
                <td className="font-mono text-rose-300">{m.due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
