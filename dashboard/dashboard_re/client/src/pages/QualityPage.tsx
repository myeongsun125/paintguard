import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  AlertTriangle,
  Clock3,
  Crosshair,
  ImageUp,
  Layers3,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  deriveQualityView,
  readCsvFile,
  type QualityCard,
  type RiskGrade,
  type UploadedQualityData,
} from "@/lib/mes-utils";

const riskOrder: RiskGrade[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const riskTone: Record<RiskGrade, string> = {
  CRITICAL: "border-rose-400/30 bg-rose-500/12 text-rose-100",
  HIGH: "border-amber-400/30 bg-amber-400/12 text-amber-100",
  MEDIUM: "border-cyan-400/30 bg-cyan-400/12 text-cyan-100",
  LOW: "border-emerald-400/30 bg-emerald-400/12 text-emerald-100",
};

const riskFill: Record<RiskGrade, string> = {
  CRITICAL: "#fb7185",
  HIGH: "#f59e0b",
  MEDIUM: "#22d3ee",
  LOW: "#34d399",
};

type QualityLogCard = QualityCard & {
  logId: string;
  detectedAt: number;
  sourceLabel: string;
  overallSummary?: string;
};

function ChartFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-border/60 bg-card/85 p-5 shadow-[0_0_50px_rgba(8,15,30,0.22)]">
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300">Quality Analytics</p>
        <h3 className="mt-2 text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("이미지를 읽는 중 오류가 발생했습니다."));
    reader.readAsDataURL(file);
  });
}

function toQualityLogs(cards: QualityCard[]) {
  return cards.map((card, index) => ({
    ...card,
    logId: card.imageId || `${card.defectTypeCode}-${index}`,
    detectedAt: Date.now() - index * 1000 * 60 * 14,
    sourceLabel: card.imageLabel || `CAM-${String(index + 1).padStart(2, "0")}`,
    overallSummary: card.summary,
  })) as QualityLogCard[];
}

function OverlayPreview({ log }: { log: QualityLogCard | undefined }) {
  if (!log) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-slate-950/65 text-sm text-muted-foreground">
        선택된 결함 로그가 없습니다.
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,18,36,0.96),rgba(2,8,19,0.98))]">
      {log.imageUrl ? (
        <img src={log.imageUrl} alt={log.imageLabel} className="h-full w-full object-cover opacity-90" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,19,0.08),rgba(2,8,19,0.42))]" />
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute rounded-xl border-2 border-amber-300 bg-amber-300/10 shadow-[0_0_0_1px_rgba(245,158,11,0.3),0_0_18px_rgba(245,158,11,0.22)]"
          style={{
            left: `${clamp(log.bbox.x * 100, 0, 96)}%`,
            top: `${clamp(log.bbox.y * 100, 0, 96)}%`,
            width: `${clamp(log.bbox.width * 100, 4, 100)}%`,
            height: `${clamp(log.bbox.height * 100, 4, 100)}%`,
          }}
        >
          <div className="absolute -top-8 left-0 rounded-full border border-amber-300/30 bg-slate-950/90 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-amber-200">
            {log.defectTypeCode}
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2 text-xs text-slate-200">
        <div className={`rounded-full border px-3 py-1.5 ${riskTone[log.riskGrade]}`}>{log.riskGrade}</div>
        <div className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5">Zone {log.zone}</div>
        <div className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5">Confidence {(log.confidence * 100).toFixed(1)}%</div>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildDefectProfileTable(rows: Array<Record<string, string>>) {
  const profileMap = new Map<string, {
    sampleCount: number;
    shiftCounts: Record<string, number>;
    totalTemperature: number;
    temperatureCount: number;
    totalHumidity: number;
    humidityCount: number;
    criticalCount: number;
    totalRework: number;
  }>();

  rows.forEach((row) => {
    const defectName = row.defect_type_name || row.defect_name || "UNKNOWN";
    const zone = row.zone_name || row.zone_code || "UNKNOWN";
    const key = `${defectName}::${zone}`;
    const current = profileMap.get(key) ?? {
      sampleCount: 0,
      shiftCounts: {},
      totalTemperature: 0,
      temperatureCount: 0,
      totalHumidity: 0,
      humidityCount: 0,
      criticalCount: 0,
      totalRework: 0,
    };

    current.sampleCount += 1;
    const shift = row.shift || row.shift_code || row.work_shift || "미상";
    current.shiftCounts[shift] = (current.shiftCounts[shift] ?? 0) + 1;

    const temperature = asNumber(row.ambient_temp_c ?? row.temperature_c ?? row.temp_c, Number.NaN);
    if (Number.isFinite(temperature)) {
      current.totalTemperature += temperature;
      current.temperatureCount += 1;
    }

    const humidity = asNumber(row.humidity_pct ?? row.humidity, Number.NaN);
    if (Number.isFinite(humidity)) {
      current.totalHumidity += humidity;
      current.humidityCount += 1;
    }

    if (String(row.severity || "").toUpperCase() === "CRITICAL") {
      current.criticalCount += 1;
    }

    current.totalRework += asNumber(row.rework_time_min ?? row.rework_minutes ?? row.rework_time, 0);
    profileMap.set(key, current);
  });

  return profileMap;
}

export default function QualityPage() {
  const { data, isLoading } = trpc.mes.sampleData.useQuery();
  const analyzeImage = trpc.mes.analyzeQualityImage.useMutation();
  const [uploadedCsv, setUploadedCsv] = useState<UploadedQualityData | null>(null);
  const [uploadedCards, setUploadedCards] = useState<QualityLogCard[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<RiskGrade | "ALL">("ALL");
  const [selectedLogId, setSelectedLogId] = useState<string>("");
  const [analysisMessage, setAnalysisMessage] = useState<string>("샘플 품질 로그 상태입니다. 이미지를 업로드하면 최신 검사 로그 10건에 누적됩니다.");

  const qualityView = useMemo(() => deriveQualityView(data, uploadedCsv, uploadedCards), [data, uploadedCsv, uploadedCards]);
  const defectProfileTable = useMemo(() => {
    if (uploadedCsv?.defectDetailRows?.length) {
      return buildDefectProfileTable(uploadedCsv.defectDetailRows);
    }

    return new Map(
      ((qualityView.defectProfileTable as Array<Record<string, string | number>>) ?? []).map((row) => [
        `${String(row.defectTypeName)}::${String(row.zone)}`,
        {
          sampleCount: asNumber(row.nSamples, 0),
          shiftCounts: {
            A: asNumber(row.shiftARatio, 0),
            B: asNumber(row.shiftBRatio, 0),
            C: asNumber(row.shiftCRatio, 0),
          },
          totalTemperature: asNumber(row.avgTemp, 0),
          temperatureCount: 1,
          totalHumidity: asNumber(row.avgHumidity, 0),
          humidityCount: 1,
          criticalCount: String(row.severity || "").toUpperCase() === "CRITICAL" ? asNumber(row.nSamples, 0) : 0,
          totalRework: asNumber(row.avgReworkMin, 0),
        },
      ]),
    );
  }, [qualityView.defectProfileTable, uploadedCsv]);
  const baseLogs = useMemo(() => {
    if (uploadedCards.length > 0) return uploadedCards;
    return toQualityLogs((qualityView.cards as QualityCard[]) ?? []);
  }, [qualityView.cards, uploadedCards]);

  const filteredLogs = useMemo(() => {
    return baseLogs.filter((card) => selectedGrade === "ALL" || card.riskGrade === selectedGrade).slice(0, 10);
  }, [baseLogs, selectedGrade]);

  useEffect(() => {
    if (!filteredLogs.length) {
      setSelectedLogId("");
      return;
    }
    if (!filteredLogs.some((item) => item.logId === selectedLogId)) {
      setSelectedLogId(filteredLogs[0]?.logId ?? "");
    }
  }, [filteredLogs, selectedLogId]);

  const selectedLog = filteredLogs.find((item) => item.logId === selectedLogId) ?? filteredLogs[0];
  const selectedProfile = useMemo(() => {
    if (!selectedLog) return null;
    const key = `${selectedLog.defectTypeName}::${selectedLog.zone}`;
    const profile = defectProfileTable.get(key);
    const dominantShift = profile
      ? Object.entries(profile.shiftCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "미상"
      : selectedLog.riskGrade === "CRITICAL"
        ? "C조 집중 감시"
        : selectedLog.riskGrade === "HIGH"
          ? "B조 우선 점검"
          : "전 교대조 공통";

    return {
      dominantShift,
      avgTemperature: profile && profile.temperatureCount > 0 ? profile.totalTemperature / profile.temperatureCount : 24.5 + selectedLog.riskScore * 0.03,
      avgHumidity: profile && profile.humidityCount > 0 ? profile.totalHumidity / profile.humidityCount : 51 + selectedLog.riskScore * 0.05,
      criticalRate: profile ? (profile.criticalCount / Math.max(profile.sampleCount, 1)) * 100 : selectedLog.riskScore,
      avgReworkMin: profile ? profile.totalRework / Math.max(profile.sampleCount, 1) : 8 + selectedLog.riskScore * 0.1,
      sampleCount: profile?.sampleCount ?? 1,
    };
  }, [defectProfileTable, selectedLog]);

  const riskCounts = riskOrder.map((grade) => ({
    grade,
    count: baseLogs.filter((card) => card.riskGrade === grade).length,
  }));

  const handleQualityCsv = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setAnalysisMessage("품질 CSV는 .csv 형식만 업로드할 수 있습니다.");
      return;
    }

    try {
      const rows = await readCsvFile(file);
      if (!rows.length) {
        setAnalysisMessage("CSV를 읽었지만 분석 가능한 행이 없습니다. 헤더와 구분자를 확인해 주세요.");
        return;
      }
      setUploadedCsv({ defectDetailRows: rows });
      setAnalysisMessage("업로드된 defect_detail.csv 기준으로 결함 분포 차트가 재계산되었습니다.");
    } catch (error) {
      setAnalysisMessage(error instanceof Error ? error.message : "CSV 파싱 중 오류가 발생했습니다.");
    }
  };

  const handleImage = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAnalysisMessage("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setAnalysisMessage("이미지 파일은 8MB 이하만 업로드할 수 있습니다.");
      return;
    }

    try {
      setAnalysisMessage("이미지 분석을 진행 중입니다. 결함 후보를 추출하고 상세 로그를 적재하고 있습니다.");
      const result = await analyzeImage.mutateAsync({
        fileName: file.name,
        mimeType: file.type || "image/png",
        base64Data: await fileToBase64(file),
      });

      const capturedAt = Date.now();
      const nextLogs = result.detections.map((item, index) => ({
        logId: `${capturedAt}-${index}`,
        imageId: `${capturedAt}-${index}`,
        imageLabel: file.name,
        defectTypeCode: item.defectTypeCode,
        defectTypeName: item.defectTypeName,
        zone: item.zone,
        severity: item.severity,
        riskScore: item.riskScore,
        riskGrade: item.riskGrade,
        confidence: item.confidence,
        recommendation: item.recommendation,
        bbox: item.bbox,
        imageUrl: result.imageUrl,
        summary: item.summary,
        overallSummary: result.overallSummary,
        detectedAt: capturedAt - index * 1000,
        sourceLabel: `CAM-${String((uploadedCards.length + index + 1) % 100).padStart(2, "0")}`,
      })) as QualityLogCard[];

      setUploadedCards((previous) => [...nextLogs, ...previous].slice(0, 10));
      setSelectedGrade("ALL");
      setSelectedLogId(nextLogs[0]?.logId ?? "");
      setAnalysisMessage(result.fallbackUsed ? `${result.overallSummary} 폴백 결과이므로 운영 투입 전 재검증이 필요합니다.` : result.overallSummary);
    } catch (error) {
      setAnalysisMessage(error instanceof Error ? error.message : "이미지 분석 중 오류가 발생했습니다.");
    }
  };

  if (isLoading || !data) {
    return <div className="rounded-[24px] border border-border/60 bg-card/85 p-8 text-sm text-muted-foreground">품질 데이터를 불러오는 중입니다.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-amber-400/15 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.16),transparent_24%),linear-gradient(180deg,rgba(7,18,35,0.96),rgba(2,8,19,0.98))] p-6 shadow-[0_0_80px_rgba(8,15,30,0.35)]">
        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-amber-300">Quality Log Layer</p>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-foreground">
              최근 검사 로그 10건을 카드로 누적하고, 선택 로그의 BBox 오버레이와 결함 인사이트를 즉시 드릴다운하는 품질 화면입니다.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
              카드형 KPI 대신 운영 로그 중심으로 바꿨습니다. 업로드된 이미지는 최신 결함 카드로 적재되고, 각 카드는 결함 유형·구역·심각도·리스크 스코어·권고 조치를 상세 패널과 직접 연결합니다.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-300">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <Clock3 className="h-3.5 w-3.5 text-primary" /> Latest 10 inspection logs
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <Layers3 className="h-3.5 w-3.5 text-amber-300" /> Risk drill-down enabled
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <Crosshair className="h-3.5 w-3.5 text-primary" /> BBox overlay ready
              </div>
            </div>
          </div>
          <div className="rounded-[26px] border border-white/10 bg-slate-950/50 p-5 backdrop-blur-xl">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground"><UploadCloud className="h-4 w-4 text-primary" /> defect_detail.csv</div>
                <p className="mt-2 leading-6">defect_type_name, severity, zone_name, model_code, rework_time_min 등의 컬럼이 포함된 품질 CSV를 업로드하세요.</p>
                <input type="file" accept=".csv" className="mt-4 block text-xs" onChange={(event) => void handleQualityCsv(event.target.files)} />
              </label>
              <label className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground"><ImageUp className="h-4 w-4 text-amber-300" /> 검사 이미지 업로드</div>
                <p className="mt-2 leading-6">도장 또는 표면 검사 이미지를 올리면 결함 후보를 추출해 최신 로그 카드에 누적합니다.</p>
                <input type="file" accept="image/*" disabled={analyzeImage.isPending} className="mt-4 block text-xs disabled:cursor-not-allowed disabled:opacity-50" onChange={(event) => void handleImage(event.target.files)} />
              </label>
            </div>
            <div className="mt-4 rounded-2xl border border-primary/12 bg-primary/6 p-4 text-sm leading-6 text-slate-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Analysis Feed</p>
                  <p className="mt-2 text-sm leading-6">{analysisMessage}</p>
                  <p className="mt-2 text-xs text-muted-foreground">메인 데이터 소스: YOLO 탐지 로그 + defect_profile_table(업로드 defect_detail.csv 기반)</p>
                </div>
                <Button
                  variant="outline"
                  className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                  onClick={() => {
                    setUploadedCsv(null);
                    setUploadedCards([]);
                    setSelectedGrade("ALL");
                    setSelectedLogId("");
                    setAnalysisMessage("샘플 품질 로그 상태입니다. 이미지를 업로드하면 최신 검사 로그 10건에 누적됩니다.");
                  }}
                >
                  샘플로 복귀
                </Button>
              </div>
              {analyzeImage.isPending ? <div className="mt-3 text-[11px] uppercase tracking-[0.28em] text-amber-300">Analysis Running</div> : null}
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-muted-foreground">
              {qualityView.helperText}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => setSelectedGrade("ALL")}
          className={`rounded-[24px] border p-5 text-left shadow-[0_0_36px_rgba(8,15,30,0.2)] transition hover:-translate-y-0.5 ${selectedGrade === "ALL" ? "border-white/20 bg-white/[0.06] ring-2 ring-white/15" : "border-white/10 bg-white/[0.03]"}`}
        >
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">ALL</p>
          <p className="mt-4 font-mono text-3xl font-semibold text-foreground">{baseLogs.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">전체 로그</p>
        </button>
        {riskCounts.map((item) => (
          <button
            key={item.grade}
            type="button"
            onClick={() => setSelectedGrade(item.grade)}
            className={`rounded-[24px] border p-5 text-left shadow-[0_0_36px_rgba(8,15,30,0.2)] transition hover:-translate-y-0.5 ${riskTone[item.grade]} ${selectedGrade === item.grade ? "ring-2 ring-white/20" : ""}`}
          >
            <p className="text-xs uppercase tracking-[0.28em]">{item.grade}</p>
            <p className="mt-4 font-mono text-3xl font-semibold">{item.count}</p>
            <p className="mt-2 text-sm opacity-80">결함 카드 수</p>
          </button>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[28px] border border-border/60 bg-card/85 p-5 shadow-[0_0_50px_rgba(8,15,30,0.22)]">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-primary">Inspection Feed</p>
              <h3 className="mt-2 text-lg font-semibold text-foreground">최근 검사 로그 10건</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">카드를 클릭하면 오른쪽 상세 패널에서 BBox와 결함 인사이트를 확인할 수 있습니다.</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground">{filteredLogs.length} logs</div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {filteredLogs.map((log) => {
              const isActive = log.logId === selectedLog?.logId;
              return (
                <button
                  key={log.logId}
                  type="button"
                  onClick={() => setSelectedLogId(log.logId)}
                  className={`w-full rounded-[24px] border p-4 text-left transition ${isActive ? "border-primary/25 bg-primary/8 shadow-[0_0_32px_rgba(45,212,191,0.12)]" : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/70 px-2.5 py-1"><Clock3 className="h-3 w-3" /> {new Date(log.detectedAt).toLocaleString("ko-KR", { hour12: false })}</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/70 px-2.5 py-1">{log.sourceLabel}</span>
                      </div>
                      <h4 className="mt-3 text-base font-semibold text-foreground">{log.defectTypeName}</h4>
                      <p className="mt-1 text-sm text-muted-foreground">{log.imageLabel}</p>
                    </div>
                    <div className={`rounded-full border px-3 py-1.5 text-xs ${riskTone[log.riskGrade]}`}>{log.riskGrade}</div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Zone</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{log.zone}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Severity</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{log.severity}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Risk Score</p>
                      <p className="mt-2 font-mono text-lg text-foreground">{Math.round(log.riskScore)}</p>
                    </div>
                  </div>
                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{log.summary || log.overallSummary || "결함 상세 요약이 준비되지 않았습니다."}</p>
                </button>
              );
            })}
            {filteredLogs.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-sm text-muted-foreground">
                선택한 리스크 등급에 해당하는 로그가 없습니다.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-[28px] border border-border/60 bg-card/85 p-5 shadow-[0_0_50px_rgba(8,15,30,0.22)]">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300">Defect Drill-down</p>
              <h3 className="mt-2 text-lg font-semibold text-foreground">선택 로그 상세 패널</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">BBox 오버레이, 결함 상세 정보, 권고 조치를 한 패널에 통합했습니다.</p>
            </div>
            {selectedLog ? <div className={`rounded-full border px-3 py-1.5 text-xs ${riskTone[selectedLog.riskGrade]}`}>{selectedLog.riskGrade}</div> : null}
          </div>

          <OverlayPreview log={selectedLog} />

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Defect</p>
              <p className="mt-2 text-sm font-medium text-foreground">{selectedLog?.defectTypeName ?? "-"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Zone</p>
              <p className="mt-2 text-sm font-medium text-foreground">{selectedLog?.zone ?? "-"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Confidence</p>
              <p className="mt-2 font-mono text-lg text-foreground">{selectedLog ? `${(selectedLog.confidence * 100).toFixed(1)}%` : "-"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Risk Score</p>
              <p className="mt-2 font-mono text-lg text-foreground">{selectedLog ? Math.round(selectedLog.riskScore) : "-"}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Clock3 className="h-4 w-4 text-primary" /> 교대 프로파일</div>
              <p className="mt-3 text-sm leading-7 text-slate-200">{selectedProfile?.dominantShift ?? "미상"}</p>
              <p className="mt-2 text-xs text-muted-foreground">defect_profile_table 기준 유사 결함 {selectedProfile?.sampleCount ?? 0}건</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Crosshair className="h-4 w-4 text-amber-300" /> 환경 프로파일</div>
              <p className="mt-3 text-sm leading-7 text-slate-200">평균 {selectedProfile?.avgTemperature.toFixed(1) ?? "-"}°C / {selectedProfile?.avgHumidity.toFixed(1) ?? "-"}%</p>
              <p className="mt-2 text-xs text-muted-foreground">업로드 CSV에 환경 컬럼이 없으면 현재 리스크 기반 추정치를 사용합니다.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground"><AlertTriangle className="h-4 w-4 text-amber-300" /> Critical 비중</div>
              <p className="mt-3 text-sm leading-7 text-slate-200">{selectedProfile ? `${selectedProfile.criticalRate.toFixed(1)}%` : "-"}</p>
              <p className="mt-2 text-xs text-muted-foreground">동일 결함·구역 조합 기준의 치명도 비율입니다.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground"><ShieldAlert className="h-4 w-4 text-rose-300" /> 평균 재작업</div>
              <p className="mt-3 text-sm leading-7 text-slate-200">{selectedProfile ? `${selectedProfile.avgReworkMin.toFixed(1)} min` : "-"}</p>
              <p className="mt-2 text-xs text-muted-foreground">품질 CSV에 rework_time 계열 컬럼이 있을 때 실제 평균으로 계산됩니다.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[24px] border border-amber-400/15 bg-amber-400/6 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-100"><AlertTriangle className="h-4 w-4" /> 결함 요약</div>
              <p className="mt-3 text-sm leading-7 text-slate-200">{selectedLog?.summary || selectedLog?.overallSummary || "선택된 로그에 대한 요약이 없습니다."}</p>
            </div>
            <div className="rounded-[24px] border border-primary/15 bg-primary/6 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck className="h-4 w-4" /> 권고 조치</div>
              <p className="mt-3 text-sm leading-7 text-slate-200">{selectedLog?.recommendation ?? "권고 조치가 준비되지 않았습니다."}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartFrame title="결함 유형 Top N" description="빈도가 높은 결함 유형을 우선적으로 추적합니다.">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qualityView.topDefects} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 11 }} width={96} />
                <Tooltip contentStyle={{ background: "#071321", border: "1px solid rgba(45,212,191,0.18)", borderRadius: 16 }} />
                <Bar dataKey="count" radius={[0, 12, 12, 0]}>
                  {(qualityView.topDefects as Array<Record<string, string | number>>).map((_, index) => (
                    <Cell key={`defect-${index}`} fill={index % 2 === 0 ? "#2dd4bf" : "#f59e0b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame title="심각도 분포" description="업로드된 품질 데이터 또는 현재 로그 풀의 심각도 분포를 요약합니다.">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={qualityView.severityDistribution} dataKey="count" nameKey="name" innerRadius={72} outerRadius={110} paddingAngle={4}>
                  {(qualityView.severityDistribution as Array<Record<string, string | number>>).map((item, index) => {
                    const key = String(item.name ?? item.severity ?? index).toUpperCase();
                    const fill = key.includes("CRITICAL") ? "#ef4444" : key.includes("MAJOR") || key.includes("HIGH") ? "#f59e0b" : index % 2 === 0 ? "#22d3ee" : "#34d399";
                    return <Cell key={`severity-${key}-${index}`} fill={fill} />;
                  })}
                </Pie>
                <Tooltip contentStyle={{ background: "#071321", border: "1px solid rgba(245,158,11,0.18)", borderRadius: 16 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <ChartFrame title="Zone별 결함 히트맵" description="구역별 결함 건수와 critical 비중을 동시에 확인합니다.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(qualityView.zoneHeatmap as Array<Record<string, string | number>>).map((zone, index) => {
              const criticalRate = asNumber(zone.criticalRate, 0);
              const alpha = Math.min(0.88, 0.16 + criticalRate / 100);
              return (
                <div key={`${String(zone.zone)}-${index}`} className="rounded-2xl border border-white/10 p-4" style={{ background: `rgba(245,158,11,${alpha})` }}>
                  <p className="text-sm font-semibold text-slate-950">{String(zone.zone)}</p>
                  <p className="mt-2 font-mono text-2xl text-slate-950">{Math.round(asNumber(zone.defects, 0)).toLocaleString()}</p>
                  <p className="mt-1 text-xs text-slate-800">Critical rate {criticalRate.toFixed(1)}%</p>
                </div>
              );
            })}
          </div>
        </ChartFrame>

        <ChartFrame title="리스크 등급 드릴다운" description="현재 로그 풀에서 각 리스크 등급이 차지하는 비중과 평균 리스크 스코어를 비교합니다.">
          <div className="grid gap-3 md:grid-cols-2">
            {riskOrder.map((grade) => {
              const gradeLogs = baseLogs.filter((item) => item.riskGrade === grade);
              const averageRisk = gradeLogs.length
                ? gradeLogs.reduce((sum, item) => sum + item.riskScore, 0) / gradeLogs.length
                : 0;
              return (
                <button
                  key={grade}
                  type="button"
                  onClick={() => setSelectedGrade(grade)}
                  className={`rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5 ${riskTone[grade]} ${selectedGrade === grade ? "ring-2 ring-white/20" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.26em]">{grade}</p>
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <p className="mt-4 font-mono text-3xl font-semibold">{gradeLogs.length}</p>
                  <div className="mt-3 h-2 rounded-full bg-black/15">
                    <div className="h-2 rounded-full" style={{ width: `${clamp(averageRisk, 0, 100)}%`, background: riskFill[grade] }} />
                  </div>
                  <p className="mt-3 text-sm opacity-85">평균 리스크 스코어 {averageRisk.toFixed(1)}</p>
                </button>
              );
            })}
          </div>
        </ChartFrame>
      </div>
    </div>
  );
}
