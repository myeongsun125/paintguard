import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  Factory,
  Gauge,
  Thermometer,
  UploadCloud,
  Waves,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deriveProcessView,
  readCsvFile,
  type ProcessFilters,
  type UploadedProcessData,
} from "@/lib/mes-utils";

type LiveLineSnapshot = {
  lineCode: string;
  channelLabel: string;
  status: "STABLE" | "WATCH" | "ALERT";
  taktSeconds: number;
  throughputPerHour: number;
  failRate: number;
  inferenceSeconds: number;
  queueUnits: number;
  trend: number[];
};

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatPct(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function extractChannelLabel(lineCode: string, index: number) {
  const match = lineCode.match(/[A-Z]$/i);
  if (match) return match[0].toUpperCase();
  return ["A", "B", "C"][index] ?? `${index + 1}`;
}

function formatShiftLabel(shift: string) {
  if (!shift) return "A조";
  return shift.endsWith("조") ? shift : `${shift}조`;
}

function normalizeLineCode(lineCode: string, index: number) {
  if (!lineCode) return `${extractChannelLabel("", index)} LINE`;
  return lineCode.replace(/_/g, "-").toUpperCase();
}

function determineStatus(failRate: number) {
  if (failRate >= 7) return "ALERT" as const;
  if (failRate >= 3.5) return "WATCH" as const;
  return "STABLE" as const;
}

function buildTrend(base: number, variance: number, tick: number) {
  return Array.from({ length: 12 }, (_, index) => {
    const wave = Math.sin((tick + index) / 2.3) * variance;
    const minor = Math.cos((tick + index) / 3.7) * (variance * 0.45);
    return clamp(base + wave + minor, Math.max(base - variance * 1.8, 0), base + variance * 1.8);
  });
}

function MiniSparkline({ values, tone = "teal" }: { values: number[]; tone?: "teal" | "amber" }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="h-12 w-full overflow-visible">
      <polyline
        fill="none"
        stroke={tone === "teal" ? "#2dd4bf" : "#f59e0b"}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function Panel({ title, description, children, right }: { title: string; description: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-border/60 bg-card/85 p-5 shadow-[0_0_60px_rgba(2,8,20,0.3)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-primary">Process Layer</p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function HeatCell({ value }: { value: number }) {
  const alpha = clamp(value / 12, 0.12, 0.9);
  return (
    <div
      className="flex h-11 items-center justify-center rounded-xl border border-white/6 text-xs font-medium text-slate-100"
      style={{
        background: `linear-gradient(180deg, rgba(245,158,11,${alpha}), rgba(244,63,94,${Math.min(alpha + 0.08, 0.95)}))`,
      }}
    >
      {value.toFixed(1)}
    </div>
  );
}

function buildLiveSnapshot(args: {
  sampleData: any;
  uploaded: UploadedProcessData | null;
  selectedPlantCode: string;
  selectedShift: string;
  dateRange: Pick<ProcessFilters, "startDate" | "endDate">;
  tick: number;
}) {
  const { sampleData, uploaded, selectedPlantCode, selectedShift, dateRange, tick } = args;

  const uploadedRows = (uploaded?.inspectionMasterRows ?? [])
    .filter((row) => {
      if (selectedPlantCode && row.plant_code !== selectedPlantCode) return false;
      if (selectedShift && row.shift !== selectedShift) return false;
      const date = (row.inspection_datetime ?? "").slice(0, 10);
      if (dateRange.startDate && date < dateRange.startDate) return false;
      if (dateRange.endDate && date > dateRange.endDate) return false;
      return true;
    })
    .sort((left, right) => String(left.inspection_datetime).localeCompare(String(right.inspection_datetime)));

  if (uploadedRows.length > 0) {
    const activeRow = uploadedRows[tick % uploadedRows.length] ?? uploadedRows[uploadedRows.length - 1];
    const lineGroups = new Map<string, Array<Record<string, string>>>();

    uploadedRows.forEach((row) => {
      const key = row.line_code || "LINE";
      const current = lineGroups.get(key) ?? [];
      current.push(row);
      lineGroups.set(key, current);
    });

    const lineSnapshots = Array.from(lineGroups.entries())
      .slice(0, 3)
      .map(([lineCode, rows], index) => {
        const row = rows[tick % rows.length] ?? rows[rows.length - 1];
        const recent = rows.slice(Math.max(0, rows.length - 36));
        const failCount = recent.filter((item) => String(item.result).toUpperCase() === "FAIL").length;
        const failRate = recent.length > 0 ? (failCount / recent.length) * 100 : 0;
        const taktBase = asNumber(row.takt_time_sec ?? row.takt_time ?? row.avg_takt_time, 21 + index * 1.8);
        const inferenceBase = asNumber(row.inference_time_sec ?? row.inference_time ?? row.model_inference_sec, 0.95 + index * 0.08);
        const taktSeconds = clamp(taktBase + Math.sin((tick + index) / 2) * 0.9, 14, 40);
        const throughputPerHour = clamp(3600 / Math.max(taktSeconds, 1), 60, 260);
        const queueUnits = Math.round(clamp(5 + failRate * 1.6 + (index + 1) * 2 + Math.cos(tick / 2 + index) * 3, 1, 38));
        return {
          lineCode: normalizeLineCode(lineCode, index),
          channelLabel: extractChannelLabel(lineCode, index),
          status: determineStatus(failRate),
          taktSeconds,
          throughputPerHour,
          failRate,
          inferenceSeconds: clamp(inferenceBase + Math.sin((tick + index) / 3) * 0.08, 0.45, 2.6),
          queueUnits,
          trend: buildTrend(throughputPerHour, 10 + index * 2, tick + index),
        } satisfies LiveLineSnapshot;
      });

    const inspectionDate = new Date(activeRow.inspection_datetime || Date.now());
    const currentTime = Number.isNaN(inspectionDate.getTime()) ? new Date() : inspectionDate;
    const recentWindow = uploadedRows.slice(Math.max(0, uploadedRows.length - 60));
    const recentFailRate = recentWindow.length
      ? (recentWindow.filter((row) => String(row.result).toUpperCase() === "FAIL").length / recentWindow.length) * 100
      : 0;

    return {
      sourceMode: "UPLOAD",
      currentTimeLabel: currentTime.toLocaleString("ko-KR", { hour12: false }),
      shiftLabel: formatShiftLabel(String(activeRow.shift || "A")),
      temperature: clamp(asNumber(activeRow.ambient_temp_c, 25.2) + Math.sin(tick / 3) * 0.45, 18, 35),
      humidity: clamp(asNumber(activeRow.humidity_pct, 52.5) + Math.cos(tick / 4) * 1.8, 35, 75),
      recentFailRate,
      lineSnapshots,
    };
  }

  const plantDaily = (sampleData?.plantDaily ?? []).filter((row: any) => !selectedPlantCode || row.plant_code === selectedPlantCode);
  const lineMonthly = (sampleData?.lineMonthly ?? []).filter((row: any) => !selectedPlantCode || row.plant_code === selectedPlantCode);
  const plantName = (sampleData?.plants ?? []).find((plant: any) => plant.plant_code === selectedPlantCode)?.plant_name;
  const shiftCycle = ["A", "B", "C"];
  const shift = selectedShift || shiftCycle[tick % shiftCycle.length] || "A";
  const now = new Date();
  const simulatedNow = new Date(now.getTime() + tick * 120000);

  const baseTemperature = 24.8 + (plantDaily.length % 4) * 0.55;
  const baseHumidity = 51.5 + (lineMonthly.length % 5) * 0.8;
  const lineSource = lineMonthly.length > 0
    ? lineMonthly.slice(0, 3)
    : (sampleData?.lines ?? [])
        .filter((line: any) => !selectedPlantCode || line.plant_code === selectedPlantCode)
        .slice(0, 3)
        .map((line: any, index: number) => ({ line_code: line.line_code || `${index + 1}` }));

  const lineSnapshots = lineSource.map((row: any, index: number) => {
    const inspections = asNumber(row.total_inspections ?? row.total ?? 1400 + index * 120, 1400 + index * 120);
    const failRateBase = inspections > 0
      ? (asNumber(row.fail_count, 28 + index * 6) / inspections) * 100
      : 1.8 + index * 0.8;
    const taktSeconds = clamp(20.2 + index * 1.1 + Math.sin((tick + index) / 2.2) * 0.75, 16, 32);
    const throughputPerHour = clamp(3600 / Math.max(taktSeconds, 1), 78, 240);
    const failRate = clamp(failRateBase + Math.cos((tick + index) / 3.6) * 0.85 + index * 0.2, 0.6, 8.8);
    const inferenceSeconds = clamp(0.78 + index * 0.11 + Math.sin((tick + index) / 4) * 0.08, 0.45, 1.8);
    return {
      lineCode: normalizeLineCode(String(row.line_code || `LINE-${index + 1}`), index),
      channelLabel: extractChannelLabel(String(row.line_code || ""), index),
      status: determineStatus(failRate),
      taktSeconds,
      throughputPerHour,
      failRate,
      inferenceSeconds,
      queueUnits: Math.round(clamp(6 + failRate * 1.7 + Math.sin(tick / 2 + index) * 3, 2, 30)),
      trend: buildTrend(throughputPerHour, 9 + index * 2.5, tick + index),
    } satisfies LiveLineSnapshot;
  });

  return {
    sourceMode: plantName ? "SAMPLE" : "SIMULATED",
    currentTimeLabel: simulatedNow.toLocaleString("ko-KR", { hour12: false }),
    shiftLabel: formatShiftLabel(shift),
    temperature: clamp(baseTemperature + Math.sin(tick / 3) * 0.6, 18, 35),
    humidity: clamp(baseHumidity + Math.cos(tick / 4) * 2.3, 35, 75),
    recentFailRate: lineSnapshots.reduce((sum: number, item: LiveLineSnapshot) => sum + item.failRate, 0) / Math.max(lineSnapshots.length, 1),
    lineSnapshots,
  };
}

export default function ProcessPage() {
  const { data, isLoading } = trpc.mes.sampleData.useQuery();
  const [uploaded, setUploaded] = useState<UploadedProcessData | null>(null);
  const [clockTick, setClockTick] = useState(0);
  const [filters, setFilters] = useState<ProcessFilters>({
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    plantCode: "",
    lineCode: "",
    shift: "",
  });

  const derived = useMemo(() => deriveProcessView(data, filters, uploaded), [data, filters, uploaded]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTick((previous) => previous + 1);
    }, 2500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!filters.plantCode && derived.availablePlants[0]?.code) {
      setFilters((previous) => ({ ...previous, plantCode: derived.availablePlants[0]?.code }));
    }
  }, [derived.availablePlants, filters.plantCode]);

  const handleUpload = async (kind: keyof UploadedProcessData, files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const rows = await readCsvFile(file);
    setUploaded((prev) => ({
      dailySummaryRows: prev?.dailySummaryRows ?? [],
      inspectionMasterRows: prev?.inspectionMasterRows ?? [],
      [kind]: rows,
    }));
  };

  const selectedPlant = derived.availablePlants.find((plant: any) => plant.code === filters.plantCode) ?? derived.availablePlants[0];
  const liveSnapshot = useMemo(() => buildLiveSnapshot({
    sampleData: data,
    uploaded,
    selectedPlantCode: selectedPlant?.code ?? "",
    selectedShift: filters.shift,
    dateRange: { startDate: filters.startDate, endDate: filters.endDate },
    tick: clockTick,
  }), [clockTick, data, filters.endDate, filters.shift, filters.startDate, selectedPlant?.code, uploaded]);

  const heatmapData = derived.shiftHeatmap ?? [];
  const heatmapHours = Array.from(new Set(heatmapData.map((item: any) => Number(item.hour)))) as number[];
  heatmapHours.sort((a, b) => a - b);
  const heatmapShifts = Array.from(new Set(heatmapData.map((item: any) => String(item.shift)))) as string[];
  const heatmapLookup = new Map(heatmapData.map((item: any) => [`${item.shift}-${item.hour}`, asNumber(item.failRate)]));

  if (isLoading || !data) {
    return <div className="rounded-[24px] border border-border/60 bg-card/85 p-8 text-sm text-muted-foreground">공정 데이터를 불러오는 중입니다.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-primary/15 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_22%),linear-gradient(180deg,rgba(4,15,31,0.96),rgba(2,8,19,0.98))] p-6 shadow-[0_0_80px_rgba(4,10,25,0.45)]">
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.38em] text-primary">Process Command Layer</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-foreground">
              공장 선택을 중심으로 시간·교대조·환경값·A/B/C 라인을 동시에 읽는 실시간 관제형 공정 화면입니다.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
              상단 공장 선택 값에 따라 실시간 감시 보드와 하단 분석 차트가 함께 갱신됩니다. inspection_master.csv가 있으면 최근 레코드를 재생하듯 모니터링하고, 없을 때는 내장 샘플을 기반으로 관제 리듬을 유지합니다.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-2">
                <Activity className="h-3.5 w-3.5 text-primary" /> {selectedPlant?.name ?? "Plant Select Pending"}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <CalendarDays className="h-3.5 w-3.5 text-amber-300" /> {filters.startDate} ~ {filters.endDate}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <Gauge className="h-3.5 w-3.5 text-primary" /> {liveSnapshot.sourceMode} FEED
              </div>
            </div>
          </div>
          <div className="rounded-[26px] border border-white/10 bg-slate-950/50 p-5 backdrop-blur-xl">
            <p className="text-[11px] uppercase tracking-[0.32em] text-muted-foreground">Command Input</p>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="plant-selector" className="text-slate-200">공장 선택</Label>
                <select
                  id="plant-selector"
                  value={filters.plantCode}
                  onChange={(event) => setFilters((previous) => ({ ...previous, plantCode: event.target.value }))}
                  className="mt-2 h-12 w-full rounded-2xl border border-primary/20 bg-slate-950/80 px-4 text-sm text-foreground outline-none transition focus:border-primary/60"
                >
                  {derived.availablePlants.map((plant: any) => (
                    <option key={plant.code} value={plant.code}>{plant.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="start-date" className="text-slate-200">시작일</Label>
                  <Input id="start-date" type="date" value={filters.startDate} onChange={(event) => setFilters((previous) => ({ ...previous, startDate: event.target.value }))} className="mt-2 h-11 rounded-2xl border-white/10 bg-slate-950/80" />
                </div>
                <div>
                  <Label htmlFor="end-date" className="text-slate-200">종료일</Label>
                  <Input id="end-date" type="date" value={filters.endDate} onChange={(event) => setFilters((previous) => ({ ...previous, endDate: event.target.value }))} className="mt-2 h-11 rounded-2xl border-white/10 bg-slate-950/80" />
                </div>
              </div>
              <div>
                <Label htmlFor="shift-selector" className="text-slate-200">교대조 필터</Label>
                <select
                  id="shift-selector"
                  value={filters.shift}
                  onChange={(event) => setFilters((previous) => ({ ...previous, shift: event.target.value }))}
                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 text-sm text-foreground outline-none transition focus:border-primary/60"
                >
                  <option value="">전체</option>
                  <option value="A">A조</option>
                  <option value="B">B조</option>
                  <option value="C">C조</option>
                </select>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-primary/6 p-4 text-sm leading-6 text-muted-foreground">
                {derived.helperText}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel
          title="실시간 공장 상태 보드"
          description="선택된 공장의 최신 시각, 교대조, 온습도, 최근 불량률을 상단 집중 정보로 보여줍니다."
          right={<div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs text-primary">LIVE REFRESH · 2.5s</div>}
        >
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-slate-950/60 p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Current Time</p>
              <p className="mt-3 font-mono text-2xl text-foreground">{liveSnapshot.currentTimeLabel}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-slate-950/60 p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Shift</p>
              <p className="mt-3 font-mono text-2xl text-foreground">{liveSnapshot.shiftLabel}</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-slate-950/60 p-4">
              <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground"><Thermometer className="h-3.5 w-3.5 text-amber-300" /> Temperature</p>
              <p className="mt-3 font-mono text-2xl text-foreground">{liveSnapshot.temperature.toFixed(1)}°C</p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-slate-950/60 p-4">
              <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground"><Waves className="h-3.5 w-3.5 text-primary" /> Humidity</p>
              <p className="mt-3 font-mono text-2xl text-foreground">{liveSnapshot.humidity.toFixed(1)}%</p>
            </div>
          </div>
          <div className="mt-4 rounded-[24px] border border-amber-400/12 bg-amber-400/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-amber-200">Recent Quality Drift</p>
                <p className="mt-2 font-mono text-3xl text-foreground">{formatPct(liveSnapshot.recentFailRate)}</p>
              </div>
              <div className="grid gap-2 text-sm text-slate-300">
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(45,212,191,0.8)]" /> STABLE: 불량 편차가 관리 범위 내에 있습니다.</div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.8)]" /> WATCH: 환경값·대기량 추적이 필요합니다.</div>
                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.8)]" /> ALERT: 즉시 현장 개입이 필요한 상태입니다.</div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="CSV 피드 전환" description="샘플 데이터와 현장 CSV 간 전환을 한 화면에서 검증할 수 있습니다.">
          <div className="grid gap-4">
            <label className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/55 p-4 text-sm leading-6 text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground"><CalendarDays className="h-4 w-4 text-primary" /> daily_summary.csv</div>
              <p className="mt-2">date, plant_code, line_code, shift, total_inspections, pass_count, fail_count, avg_takt_time, avg_inference_time 컬럼을 기대합니다.</p>
              <input type="file" accept=".csv" className="mt-4 block text-xs" onChange={(event) => void handleUpload("dailySummaryRows", event.target.files)} />
            </label>
            <label className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/55 p-4 text-sm leading-6 text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground"><Factory className="h-4 w-4 text-amber-300" /> inspection_master.csv</div>
              <p className="mt-2">inspection_datetime, plant_code, line_code, shift, result, ambient_temp_c, humidity_pct 기준으로 최근 운영 흐름을 재생합니다.</p>
              <input type="file" accept=".csv" className="mt-4 block text-xs" onChange={(event) => void handleUpload("inspectionMasterRows", event.target.files)} />
            </label>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/15" onClick={() => setUploaded(null)}>
                샘플 피드로 복귀
              </Button>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground">
                <UploadCloud className="h-3.5 w-3.5 text-primary" /> CSV 업로드가 없으면 내장 샘플 관제 모드로 동작합니다.
              </div>
            </div>
          </div>
        </Panel>
      </section>

      <Panel title="A/B/C 라인 라이브 채널" description="라인별 택트타임, 시간당 처리량, 최근 불량률, 추론 지연, 대기 수량을 실시간으로 읽을 수 있는 정형 데이터 보드입니다.">
        <div className="grid gap-4 xl:grid-cols-3">
          {liveSnapshot.lineSnapshots.map((line: LiveLineSnapshot) => {
            const statusStyle = line.status === "STABLE"
              ? "border-primary/20 bg-primary/8 text-primary"
              : line.status === "WATCH"
                ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
                : "border-rose-400/20 bg-rose-400/10 text-rose-200";

            return (
              <article key={line.lineCode} className="rounded-[26px] border border-white/8 bg-slate-950/62 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.26em] text-muted-foreground">
                      Channel {line.channelLabel}
                    </div>
                    <h4 className="mt-3 text-xl font-semibold text-foreground">{line.lineCode}</h4>
                  </div>
                  <div className={`rounded-full border px-3 py-1.5 text-xs font-medium ${statusStyle}`}>{line.status}</div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Takt</p>
                    <p className="mt-2 font-mono text-2xl text-foreground">{line.taktSeconds.toFixed(1)}<span className="ml-1 text-sm text-muted-foreground">sec</span></p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Throughput</p>
                    <p className="mt-2 font-mono text-2xl text-foreground">{Math.round(line.throughputPerHour)}<span className="ml-1 text-sm text-muted-foreground">/h</span></p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Fail Rate</p>
                    <p className="mt-2 font-mono text-2xl text-foreground">{line.failRate.toFixed(2)}<span className="ml-1 text-sm text-muted-foreground">%</span></p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Inference</p>
                    <p className="mt-2 font-mono text-2xl text-foreground">{line.inferenceSeconds.toFixed(2)}<span className="ml-1 text-sm text-muted-foreground">sec</span></p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Queue Buffer</span>
                    <span className="font-mono text-foreground">{line.queueUnits} units</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/6">
                    <div className={`h-2 rounded-full ${line.status === "ALERT" ? "bg-rose-400" : line.status === "WATCH" ? "bg-amber-300" : "bg-primary"}`} style={{ width: `${clamp((line.queueUnits / 40) * 100, 8, 100)}%` }} />
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>1h throughput trend</span>
                      <span className="font-mono text-foreground">{formatSigned(line.trend[line.trend.length - 1] - line.trend[0])}</span>
                    </div>
                    <MiniSparkline values={line.trend} tone={line.status === "ALERT" ? "amber" : "teal"} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="시계열 수율 추이" description="선택 공장과 기간 기준의 수율·불량률 흐름을 시간축으로 확인합니다.">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={derived.yieldTrend}>
                <defs>
                  <linearGradient id="yieldFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.42} />
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} minTickGap={24} />
                <YAxis yAxisId="left" domain={[90, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, "auto"]} tick={{ fill: "#f59e0b", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#071321", border: "1px solid rgba(45,212,191,0.18)", borderRadius: 18 }} />
                <Area yAxisId="left" type="monotone" dataKey="yieldRate" stroke="#2dd4bf" fill="url(#yieldFill)" strokeWidth={2.5} name="수율(%)" />
                <Area yAxisId="right" type="monotone" dataKey="failRate" stroke="#f59e0b" fill="rgba(245,158,11,0.08)" strokeWidth={2} name="불량률(%)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="공장별 불량률 비교" description="전체 공장 간 불량률과 총 검사량을 비교해 병목 공장을 빠르게 찾습니다.">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={derived.plantComparison}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="plant_name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#071321", border: "1px solid rgba(245,158,11,0.18)", borderRadius: 18 }} />
                <Bar dataKey="failRate" radius={[10, 10, 0, 0]} name="불량률(%)">
                  {(derived.plantComparison ?? []).map((item: any, index: number) => (
                    <Cell key={`${item.plant_name ?? item.plant_code}-${index}`} fill={selectedPlant?.name === item.plant_name || selectedPlant?.code === item.plant_code ? "#2dd4bf" : "#f59e0b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="교대조 × 시간대 불량률 히트맵" description="inspection_master 기준 시간대별 실패율 편차를 열 지도로 읽습니다.">
          <div className="overflow-x-auto">
            <div className="grid min-w-[680px] gap-2" style={{ gridTemplateColumns: `140px repeat(${Math.max(heatmapHours.length, 1)}, minmax(40px, 1fr))` }}>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Shift / Hour</div>
              {heatmapHours.map((hour) => (
                <div key={hour} className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-3 text-center text-xs text-muted-foreground">{String(hour).padStart(2, "0")}:00</div>
              ))}
              {heatmapShifts.map((shift: string) => (
                <Fragment key={`row-${shift}`}>
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-sm font-medium text-foreground">{formatShiftLabel(shift)}</div>
                  {heatmapHours.map((hour: number) => (
                    <HeatCell key={`${shift}-${hour}`} value={asNumber(heatmapLookup.get(`${shift}-${hour}`), 0)} />
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">0~3%: 정상 범위</div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">3~6%: 원인 점검 필요</div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">6% 이상: 즉시 라인 상태 확인</div>
          </div>
        </Panel>

        <Panel title="온습도-불량률 산점도" description="환경 조건이 품질 흔들림에 미치는 영향을 버블 크기와 불량률로 함께 표시합니다.">
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 12, bottom: 12, left: 4 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" />
                <XAxis type="number" dataKey="humidity" name="Humidity" tick={{ fill: "#94a3b8", fontSize: 11 }} unit="%" />
                <YAxis type="number" dataKey="temperature" name="Temperature" tick={{ fill: "#94a3b8", fontSize: 11 }} unit="°C" />
                <ZAxis type="number" dataKey="total" range={[70, 420]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "#071321", border: "1px solid rgba(45,212,191,0.18)", borderRadius: 18 }} />
                <Scatter data={derived.envScatter} fill="#2dd4bf" name="환경 버블" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <section className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-[24px] border border-white/8 bg-card/80 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Total Inspections</p>
          <p className="mt-3 font-mono text-3xl text-foreground">{Math.round(derived.totalInspections).toLocaleString()}</p>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-card/80 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Total Fails</p>
          <p className="mt-3 font-mono text-3xl text-foreground">{Math.round(derived.totalFails).toLocaleString()}</p>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-card/80 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Average Takt</p>
          <p className="mt-3 font-mono text-3xl text-foreground">{derived.avgTaktTime.toFixed(2)}<span className="ml-1 text-sm text-muted-foreground">sec</span></p>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-card/80 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Inference Latency</p>
          <p className="mt-3 font-mono text-3xl text-foreground">{derived.avgInferenceTime.toFixed(2)}<span className="ml-1 text-sm text-muted-foreground">sec</span></p>
        </div>
      </section>
    </div>
  );
}
