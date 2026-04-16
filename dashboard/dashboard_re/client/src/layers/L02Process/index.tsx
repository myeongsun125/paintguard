import ProcessPage from "@/pages/ProcessPage";
import { trpc } from "@/lib/trpc";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Droplets, Sunrise } from "lucide-react";

const plantFailRates = [
  { plant: "ASN", rate: 4.09 },
  { plant: "ULN", rate: 4.07 },
  { plant: "GWJ", rate: 4.04 },
  { plant: "HWS", rate: 4.06 },
];

const heatShifts = ["A조(06~13)", "B조(14~21)", "C조(22시)"] as const;
const heatHours = ["06", "07", "10", "14", "15", "18", "22"];

function shiftStartCol(h: string) {
  return h === "06" || h === "14" || h === "22";
}

const heatmapData: Record<(typeof heatShifts)[number], number[]> = {
  "A조(06~13)": [6.08, 5.94, 3.6, 0, 0, 0, 0],
  "B조(14~21)": [0, 0, 0, 4.1, 3.55, 3.5, 0],
  "C조(22시)": [0, 0, 0, 0, 0, 0, 6.02],
};

type PlantRate = { plant: string; rate: number };
type ShiftHourMap = Record<string, number[]>;

function isPlantRateArray(v: unknown): v is PlantRate[] {
  return (
    Array.isArray(v) &&
    v.every(
      (x) =>
        x !== null &&
        typeof x === "object" &&
        typeof (x as PlantRate).plant === "string" &&
        typeof (x as PlantRate).rate === "number"
    )
  );
}

function isShiftHourMap(v: unknown): v is ShiftHourMap {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  return Object.values(v as Record<string, unknown>).every(
    (arr) => Array.isArray(arr) && arr.every((n) => typeof n === "number")
  );
}

export default function L02Process() {
  const { data: processData } = trpc.mes.processData.useQuery(undefined, { refetchInterval: 30_000 });
  const isLive = processData?.isLive === true;

  const plantData: PlantRate[] = isPlantRateArray(processData?.kpiDaily)
    ? processData.kpiDaily
    : plantFailRates;

  const shiftMap: ShiftHourMap = isShiftHourMap(processData?.shiftDefectRate)
    ? processData.shiftDefectRate
    : heatmapData;

  const shiftRows = (Object.keys(shiftMap).length ? Object.keys(shiftMap) : (heatShifts as readonly string[])) as string[];

  const hasEnvBins = Array.isArray(processData?.envBins) && processData.envBins.length > 0;

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
        {!isLive && " — L02 레이어는 S3 집계 연결 전 단계. 수치는 시연용 목업."}
        {isLive && hasEnvBins && " — env_bins 포함"}
      </div>

      {/* 공장별 불량률 막대 */}
      <section className="rounded-[28px] border border-border/60 bg-card/85 p-5 shadow-[0_0_50px_rgba(8,15,30,0.25)]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Process Insights</p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">공장별 불량률 (정형 300만건 기반)</h3>
            <p className="mt-1 text-sm text-muted-foreground">4개 공장 모두 4% 근처로 편차 미미 (max–min 0.05%p)</p>
          </div>
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={plantData} margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis dataKey="plant" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
              <YAxis domain={[3.9, 4.2]} tick={{ fill: "#cbd5e1", fontSize: 12 }} unit="%" />
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
                      const isC22 = s === "C조(22시)" && h === "22";
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
                            background: v > 0
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

      {/* 기존 ProcessPage 차트 이식 */}
      <ProcessPage />
    </div>
  );
}
