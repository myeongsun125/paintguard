import { Bar, BarChart, CartesianGrid, Cell, Line, ComposedChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from "recharts";
import { AlertTriangle, CircleCheck, CircleSlash, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

const shiftData = [
  { shift: "A조", rate: 4.12, note: "06~13시" },
  { shift: "B조", rate: 3.77, note: "14~21시" },
  { shift: "C조", rate: 6.02, note: "22시 1시간" },
];

const hourly = [
  { h: "06", rate: 6.08 },
  { h: "07", rate: 5.94 },
  { h: "08", rate: 3.9 },
  { h: "09", rate: 3.6 },
  { h: "10", rate: 3.5 },
  { h: "11", rate: 3.45 },
  { h: "12", rate: 3.5 },
  { h: "13", rate: 3.55 },
  { h: "14", rate: 4.0 },
  { h: "15", rate: 3.5 },
  { h: "16", rate: 3.45 },
  { h: "17", rate: 3.5 },
  { h: "18", rate: 3.55 },
  { h: "19", rate: 3.6 },
  { h: "20", rate: 3.65 },
  { h: "21", rate: 5.95 },
  { h: "22", rate: 6.02 },
];

const pareto = [
  { code: "SCR", name: "스크래치", count: 42432, rework: 10608 },
  { code: "DNT", name: "덴트", count: 25583, rework: 19187 },
  { code: "PBB", name: "도장기포", count: 20738, rework: 10369 },
  { code: "DST", name: "이물질", count: 17150, rework: 2858 },
  { code: "PDR", name: "도장흘림", count: 17111, rework: 7130 },
  { code: "ORG", name: "오렌지필", count: 13782, rework: 4594 },
  { code: "GAP", name: "Gap불량", count: 13605, rework: 13605 },
];

const riskDonut = [
  { name: "CRITICAL", value: 26, color: "#ef4444" },
  { name: "HIGH", value: 50, color: "#f59e0b" },
  { name: "MEDIUM", value: 75, color: "#22d3ee" },
  { name: "LOW", value: 100, color: "#10b981" },
];

const sampleDefects = [
  { id: "trunk_silver_000878", zone: "TRUNK", color: "silver", type: "CRK", typeKr: "크랙", conf: 0.893, risk: 66.19, grade: "CRITICAL", severity: "CRITICAL", process: "건조", action: "즉시 라인 정지 / 전수 재검사", history: "TRUNK+CRK 조합은 최근 30일간 C조에서 72% 집중", imageFilename: "trunk_silver_000878.jpg" },
  { id: "fender_bronze_000840", zone: "FF", color: "bronze", type: "GAP", typeKr: "Gap불량", conf: 0.774, risk: 61.83, grade: "CRITICAL", severity: "CRITICAL", process: "조립", action: "용접 단차 재검사", history: "FF+GAP은 ULN UL5 라인에서 월 평균 120건", imageFilename: "fender_bronze_000840.jpg" },
  { id: "rocker_bronze_000952", zone: "ROCKER", color: "bronze", type: "DNT", typeKr: "덴트", conf: 0.901, risk: 51.28, grade: "HIGH", severity: "MAJOR", process: "차체이송/프레스", action: "도장 직전 범퍼 정렬 확인", history: "ROCKER+DNT는 A조 06시 스파이크 동반", imageFilename: "rocker_bronze_000952.jpg" },
  { id: "front_door_navy_000818", zone: "FD", color: "navy", type: "DST", typeKr: "이물질", conf: 0.97, risk: 24.75, grade: "LOW", severity: "MINOR", process: "상도", action: "정기 모니터링 유지", history: "FD+DST는 전체 평균 수준", imageFilename: "front_door_navy_000818.jpg" },
];

type SampleDefect = (typeof sampleDefects)[number];

function DefectImage({ filename, className }: { filename: string; className?: string }) {
  const { data: imgData } = trpc.mes.defectImageUrl.useQuery(
    { filename },
    { enabled: !!filename },
  );
  if (imgData?.url) {
    return <img src={imgData.url} alt={filename} className={`rounded-xl object-cover ${className ?? ""}`} />;
  }
  return (
    <div className={`flex items-center justify-center rounded-xl border border-white/5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-[11px] text-muted-foreground ${className ?? ""}`}>
      [bbox 오버레이 이미지]
    </div>
  );
}

function DefectCard({ d, onClick }: { d: SampleDefect; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left transition hover:scale-[1.02] ${
        d.grade === "CRITICAL"
          ? "border-rose-400/40 bg-rose-500/8 hover:border-rose-400/70"
          : d.grade === "HIGH"
            ? "border-amber-400/40 bg-amber-400/8 hover:border-amber-400/70"
            : "border-border/60 bg-card/60 hover:border-primary/40"
      }`}
    >
      <DefectImage filename={d.imageFilename} className="aspect-[4/3] w-full" />
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-[11px] text-muted-foreground">{d.id}.jpg</span>
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
          d.grade === "CRITICAL" ? "bg-rose-500 text-white" : d.grade === "HIGH" ? "bg-amber-400 text-black" : "bg-emerald-500/30 text-emerald-100"
        }`}>{d.grade}</span>
      </div>
      <p className="mt-1 text-sm text-foreground">{d.typeKr} · {d.zone}</p>
      <p className="text-[11px] text-muted-foreground">conf {d.conf.toFixed(2)} / risk {d.risk.toFixed(1)}</p>
    </button>
  );
}

function scoreParts(risk: number) {
  // simple spread for demo
  return [
    { label: "심각도", val: Math.round(risk * 0.4), max: 40 },
    { label: "C조 야간", val: Math.round(risk * 0.2), max: 20 },
    { label: "저습도", val: Math.round(risk * 0.15), max: 15 },
    { label: "재작업", val: Math.round(risk * 0.15), max: 15 },
    { label: "신뢰도", val: Math.round(risk * 0.1), max: 10 },
  ];
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "ok" | "warn" | "crit" | "info" }) {
  const toneMap = {
    ok: "from-emerald-500/20 to-emerald-500/5 text-emerald-200 border-emerald-400/30",
    warn: "from-amber-400/20 to-amber-400/5 text-amber-200 border-amber-400/30",
    crit: "from-rose-500/20 to-rose-500/5 text-rose-200 border-rose-400/40",
    info: "from-cyan-500/20 to-cyan-500/5 text-cyan-200 border-cyan-400/30",
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 ${toneMap[tone]}`}>
      <p className="text-[11px] uppercase tracking-[0.25em] opacity-80">{label}</p>
      <p className="mt-2 font-mono text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs opacity-70">{sub}</p>
    </div>
  );
}

export default function L03Quality() {
  const [selected, setSelected] = useState<(typeof sampleDefects)[number] | null>(null);

  return (
    <div className="space-y-5">
      {/* KPI 4장 */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="오늘 양품률" value="95.93%" sub="PASS 2,877,908 / 3,000,000" tone="ok" />
        <Kpi label="누적 불량 건수" value="122,092" sub="FAIL 4.07% · 1건당 결함 1.4개" tone="warn" />
        <Kpi label="CRITICAL 리스크" value="26건" sub="상위 10% / 251건 YOLO 탐지" tone="crit" />
        <Kpi label="결함 Top 1" value="SCR" sub="스크래치 24.8% (42,432건)" tone="info" />
      </div>

      {/* 차트 4 */}
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-[28px] border border-border/60 bg-card/85 p-5">
          <h3 className="text-sm font-semibold text-foreground">교대조별 불량률</h3>
          <p className="mt-1 text-xs text-muted-foreground">C조는 교대 시작 1시간(22시) 데이터 — 교대 시작 효과 반영</p>
          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shiftData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="shift" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                <YAxis unit="%" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid rgba(148,163,184,0.25)" }} />
                <Bar dataKey="rate" radius={[8, 8, 0, 0]}>
                  {shiftData.map((d, i) => (
                    <Cell key={i} fill={d.shift === "C조" ? "#ef4444" : d.shift === "A조" ? "#f59e0b" : "#10b981"} />
                  ))}
                  <LabelList dataKey="rate" position="top" formatter={(v: number) => `${v.toFixed(2)}%`} fill="#e2e8f0" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-[28px] border border-border/60 bg-card/85 p-5">
          <h3 className="text-sm font-semibold text-foreground">시간대별 불량률</h3>
          <p className="mt-1 text-xs text-muted-foreground">06시 / 22시 스파이크 감시선 — 교대 시작 구간</p>
          <div className="mt-4 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="h" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <YAxis unit="%" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid rgba(148,163,184,0.25)" }} />
                <ReferenceLine y={5} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "스파이크 감시 5%", fill: "#ef4444", fontSize: 10 }} />
                <Line type="monotone" dataKey="rate" stroke="#06b6d4" strokeWidth={2.5} dot={{ fill: "#06b6d4" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-[28px] border border-border/60 bg-card/85 p-5">
          <h3 className="text-sm font-semibold text-foreground">결함 파레토 (건수 + 재작업 시간)</h3>
          <p className="mt-1 text-xs text-muted-foreground">이중축 — 좌: 발생 건수, 우: 총 재작업 시간(h)</p>
          <div className="mt-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={pareto}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="code" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <YAxis yAxisId="l" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <YAxis yAxisId="r" orientation="right" tick={{ fill: "#f59e0b", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid rgba(148,163,184,0.25)" }} />
                <Bar yAxisId="l" dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                <Line yAxisId="r" type="monotone" dataKey="rework" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-[28px] border border-border/60 bg-card/85 p-5">
          <h3 className="text-sm font-semibold text-foreground">리스크 등급 분포 (251건)</h3>
          <p className="mt-1 text-xs text-muted-foreground">사분위수 컷오프 — CRITICAL 26 / HIGH 50 / MEDIUM 75 / LOW 100</p>
          <div className="mt-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskDonut} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                  {riskDonut.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#0b1220", border: "1px solid rgba(148,163,184,0.25)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
            {riskDonut.map((r) => (
              <span key={r.name} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded" style={{ background: r.color }} />
                {r.name} {r.value}
              </span>
            ))}
          </div>
        </section>
      </div>

      {/* 결함 카드 그리드 */}
      <section className="rounded-[28px] border border-border/60 bg-card/85 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">탐지 결함 샘플 (클릭 → 상세 모달)</h3>
            <p className="mt-1 text-xs text-muted-foreground">YOLOv11s 추론 결과 251건 중 리스크 대표 샘플</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {sampleDefects.map((d) => (
            <DefectCard key={d.id} d={d} onClick={() => setSelected(d)} />
          ))}
        </div>
      </section>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur" onClick={() => setSelected(null)}>
          <div className="relative w-full max-w-2xl rounded-2xl border border-border/60 bg-card/95 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <CircleSlash className="h-5 w-5" />
            </button>
            <p className="text-[10px] uppercase tracking-[0.28em] text-primary">Defect Detail</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">{selected.typeKr} ({selected.type}) · {selected.zone}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <DefectImage filename={selected.imageFilename} className="aspect-[4/3] w-full" />
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-[11px] text-muted-foreground">Defect / Zone / 신뢰도</p>
                  <p className="font-mono text-foreground">{selected.type} / {selected.zone} / conf {selected.conf.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">리스크 스코어</p>
                  <p className={`font-mono text-xl font-bold ${selected.grade === "CRITICAL" ? "text-rose-300" : selected.grade === "HIGH" ? "text-amber-300" : "text-emerald-300"}`}>
                    {selected.risk.toFixed(2)} / 100 · {selected.grade}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">리스크 구성</p>
                  <div className="mt-1 space-y-1.5">
                    {scoreParts(selected.risk).map((p) => (
                      <div key={p.label} className="flex items-center gap-2 text-xs">
                        <span className="w-16 text-muted-foreground">{p.label}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/40">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${(p.val / p.max) * 100}%` }} />
                        </div>
                        <span className="w-12 font-mono text-foreground">{p.val}/{p.max}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-xs text-muted-foreground md:grid-cols-3">
              <div className="rounded-lg border border-border/60 bg-background/30 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">유사 이력</p>
                <p className="mt-1 leading-5">{selected.history}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/30 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">추정 원인 공정</p>
                <p className="mt-1 font-semibold text-foreground">{selected.process}</p>
                <p className="text-[10px]">defect_process_map.json</p>
              </div>
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/8 p-3 text-amber-100">
                <p className="text-[10px] uppercase tracking-[0.2em] text-amber-300">추천 조치</p>
                <p className="mt-1 leading-5">{selected.action}</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
