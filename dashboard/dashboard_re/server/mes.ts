import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";

type RiskGrade = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

type QualityDetection = {
  defectTypeCode: string;
  defectTypeName: string;
  zone: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  confidence: number;
  riskScore: number;
  riskGrade: RiskGrade;
  recommendation: string;
  summary: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

type QualityProfileRow = {
  defectTypeCode: string;
  defectTypeName: string;
  zone: string;
  severity: string;
  nSamples: number;
  shiftARatio: number;
  shiftBRatio: number;
  shiftCRatio: number;
  dominantShift: string;
  peakHour: number;
  avgHumidity: number;
  avgTemp: number;
  avgReworkMin: number;
  reworkRequiredRatio: number;
};

type SamplePayload = {
  summary: {
    totalInspections: number;
    totalFails: number;
    overallYieldRate: number;
    avgTaktTime: number;
    avgInferenceTime: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
  plants: Array<{
    plant_code: string;
    plant_name: string;
  }>;
  lines: Array<{
    plant_code: string;
    line_code: string;
  }>;
  plantDaily: Array<Record<string, string | number>>;
  shiftHourly: Array<Record<string, string | number>>;
  envBins: Array<Record<string, string | number>>;
  lineMonthly: Array<Record<string, string | number>>;
  qualitySample: {
    topDefects: Array<Record<string, string | number>>;
    severityDistribution: Array<Record<string, string | number>>;
    zoneHeatmap: Array<Record<string, string | number>>;
    modelComparison: Array<Record<string, string | number>>;
    sampleCards: Array<Record<string, unknown>>;
    defectProfileTable?: QualityProfileRow[];
  };
};

type YoloClassMeta = {
  defectTypeCode: string;
  defectTypeName: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  className: string;
  confidence: number;
};

const SAMPLE_PATH = path.join(process.cwd(), "server", "data", "mes", "sampleData.json");
const PAINTGUARD_ROOT = "/home/ubuntu/upload/paintguard_unzipped";
const DEFECT_PROFILE_PATH = path.join(PAINTGUARD_ROOT, "defect_profile_table.csv");
const DEFECT_DETAIL_PATH = path.join(PAINTGUARD_ROOT, "track_a_data", "defect_detail.csv");
const MASTER_DEFECT_PATH = path.join(PAINTGUARD_ROOT, "track_a_data", "master_defect_type.csv");
const METADATA_PATH = path.join(PAINTGUARD_ROOT, "track_a_images", "metadata.json");
const YOLO_SUMMARY_PATH = path.join(PAINTGUARD_ROOT, "_yolo_result_v11s.json");
const LABEL_ROOT = path.join(PAINTGUARD_ROOT, "track_a_images", "labels");

let sampleCache: SamplePayload | null = null;

export async function loadMesSampleData(): Promise<SamplePayload> {
  if (sampleCache) {
    return sampleCache;
  }

  const raw = await readFile(SAMPLE_PATH, "utf-8");
  const baseSample = JSON.parse(raw) as SamplePayload;

  try {
    const qualitySample = await buildPaintGuardQualitySample();
    sampleCache = {
      ...baseSample,
      qualitySample,
    };
  } catch (error) {
    console.warn("[MES] Falling back to bundled quality sample:", error);
    sampleCache = baseSample;
  }

  return sampleCache;
}

async function buildPaintGuardQualitySample(): Promise<SamplePayload["qualitySample"]> {
  const [profileText, detailText, defectTypeText, metadataText, yoloSummaryText] = await Promise.all([
    readFile(DEFECT_PROFILE_PATH, "utf-8"),
    readFile(DEFECT_DETAIL_PATH, "utf-8"),
    readFile(MASTER_DEFECT_PATH, "utf-8"),
    readFile(METADATA_PATH, "utf-8"),
    readFile(YOLO_SUMMARY_PATH, "utf-8"),
  ]);

  const profileRows = parseCsv(profileText);
  const detailRows = parseCsv(detailText);
  const defectTypeRows = parseCsv(defectTypeText);
  const metadata = JSON.parse(metadataText) as { classes?: Record<string, string> };
  const yoloSummary = JSON.parse(yoloSummaryText) as {
    per_class?: Array<{
      class_id: number;
      class_name: string;
      한글명?: string;
      코드?: string;
      심각도?: string;
      P?: number;
    }>;
  };

  const classMap = buildYoloClassMap(metadata.classes ?? {}, defectTypeRows, yoloSummary.per_class ?? []);
  const defectProfileTable = profileRows.map<QualityProfileRow>((row) => ({
    defectTypeCode: row.defect_type_code || "UNKNOWN",
    defectTypeName: row.defect_type_name || "미상 결함",
    zone: row.zone_code || row.zone_name || "UNKNOWN",
    severity: row.severity || "MINOR",
    nSamples: asNumber(row.n_samples),
    shiftARatio: asNumber(row.shift_A_ratio),
    shiftBRatio: asNumber(row.shift_B_ratio),
    shiftCRatio: asNumber(row.shift_C_ratio),
    dominantShift: row.dominant_shift || "미상",
    peakHour: asNumber(row.peak_hour),
    avgHumidity: asNumber(row.avg_humidity),
    avgTemp: asNumber(row.avg_temp),
    avgReworkMin: asNumber(row.avg_rework_min),
    reworkRequiredRatio: asNumber(row.rework_required_ratio),
  }));

  return {
    topDefects: weightedCounts(profileRows, "defect_type_name", "n_samples", 6),
    severityDistribution: weightedCounts(profileRows, "severity", "n_samples", 4),
    zoneHeatmap: weightedZoneStats(profileRows),
    modelComparison: buildModelComparison(detailRows),
    sampleCards: await buildYoloSampleCards(classMap, defectProfileTable),
    defectProfileTable,
  };
}

function buildYoloClassMap(
  metadataClasses: Record<string, string>,
  defectTypeRows: Array<Record<string, string>>,
  perClassRows: Array<{ class_id: number; class_name: string; 한글명?: string; 코드?: string; 심각도?: string; P?: number }>,
) {
  const fallbackByEnglish = new Map<string, { code: string; name: string; severity: string }>([
    ["scratch", { code: "SCR", name: "스크래치", severity: "MINOR" }],
    ["dent", { code: "DNT", name: "덴트", severity: "MAJOR" }],
    ["paint_bubble", { code: "PBB", name: "도장기포", severity: "MINOR" }],
    ["paint_drip", { code: "PDR", name: "도장흘림", severity: "MINOR" }],
    ["dust", { code: "DST", name: "이물질", severity: "MINOR" }],
    ["orange_peel", { code: "ORG", name: "오렌지필", severity: "MINOR" }],
    ["crack", { code: "CRK", name: "크랙", severity: "CRITICAL" }],
    ["gap_fault", { code: "GAP", name: "Gap불량", severity: "CRITICAL" }],
  ]);

  const defectRowsByCode = new Map(defectTypeRows.map((row) => [row.defect_type_code, row]));
  const classMap = new Map<string, YoloClassMeta>();

  Object.entries(metadataClasses).forEach(([classId, className]) => {
    const summaryMatch = perClassRows.find((row) => String(row.class_id) === String(classId) || row.class_name === className);
    const fallback = fallbackByEnglish.get(className) ?? { code: `CLS-${classId}`, name: className, severity: "MINOR" };
    const master = defectRowsByCode.get(summaryMatch?.코드 ?? fallback.code);

    classMap.set(String(classId), {
      defectTypeCode: summaryMatch?.코드 ?? master?.defect_type_code ?? fallback.code,
      defectTypeName: summaryMatch?.한글명 ?? master?.defect_type_name ?? fallback.name,
      severity: normalizeSeverity(summaryMatch?.심각도 ?? master?.severity ?? fallback.severity),
      className,
      confidence: clampUnit(summaryMatch?.P ?? 0.88),
    });
  });

  return classMap;
}

async function buildYoloSampleCards(classMap: Map<string, YoloClassMeta>, defectProfileTable: QualityProfileRow[]) {
  const labelFiles = (await collectFiles(LABEL_ROOT)).filter((filePath) => filePath.endsWith(".txt")).sort().reverse();
  const cards: Array<Record<string, unknown>> = [];

  for (const filePath of labelFiles) {
    if (cards.length >= 10) break;
    const raw = await readFile(filePath, "utf-8");
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const baseName = path.basename(filePath, ".txt");
    const zone = inferZoneFromFileName(baseName);

    lines.forEach((line, index) => {
      if (cards.length >= 10) return;
      const [classId, x, y, width, height] = line.split(/\s+/);
      const classMeta = classMap.get(classId) ?? {
        defectTypeCode: `CLS-${classId}`,
        defectTypeName: `Class ${classId}`,
        severity: "MINOR" as const,
        className: `class_${classId}`,
        confidence: 0.82,
      };
      const profile = pickBestProfile(defectProfileTable, classMeta.defectTypeCode, zone);
      const riskScore = inferRiskScore(classMeta.severity, profile?.avgReworkMin ?? 0, classMeta.confidence);
      const riskGrade = toRiskGrade(riskScore);

      cards.push({
        imageId: `${baseName}-${index}`,
        imageLabel: `${baseName}.jpg`,
        defectTypeCode: classMeta.defectTypeCode,
        defectTypeName: classMeta.defectTypeName,
        zone,
        severity: classMeta.severity,
        riskScore,
        riskGrade,
        confidence: classMeta.confidence,
        recommendation: recommendationForGrade(riskGrade),
        bbox: {
          x: clampUnit(asNumber(x) - asNumber(width) / 2),
          y: clampUnit(asNumber(y) - asNumber(height) / 2),
          width: clampUnit(asNumber(width)),
          height: clampUnit(asNumber(height)),
        },
        summary: profile
          ? `${zone} 구역 ${classMeta.defectTypeName} 결함입니다. 우세 교대조는 ${profile.dominantShift}조이고 평균 재작업 시간은 ${profile.avgReworkMin.toFixed(1)}분입니다.`
          : `${zone} 구역 ${classMeta.defectTypeName} 결함 로그입니다. defect_profile_table 프로파일이 없는 조합이므로 일반 대응 기준을 적용합니다.`,
      });
    });
  }

  return cards;
}

function pickBestProfile(rows: QualityProfileRow[], defectTypeCode: string, zone: string) {
  return rows.find((row) => row.defectTypeCode === defectTypeCode && row.zone === zone)
    ?? rows.find((row) => row.defectTypeCode === defectTypeCode)
    ?? null;
}

async function collectFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath);
    return [fullPath];
  }));
  return files.flat();
}

function parseCsv(text: string) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r/g, "").trim();
  if (!normalized) return [] as Array<Record<string, string>>;
  const lines = normalized.split("\n");
  const headers = splitCsvLine(lines[0] ?? "");
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? "";
      return acc;
    }, {});
  });
}

function splitCsvLine(line: string) {
  const output: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      output.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  output.push(current.trim());
  return output;
}

function weightedCounts(rows: Array<Record<string, string>>, field: string, weightField: string, limit: number) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const key = row[field] || "UNKNOWN";
    counts.set(key, (counts.get(key) ?? 0) + Math.max(asNumber(row[weightField]), 1));
  });
  const total = Array.from(counts.values()).reduce((acc, value) => acc + value, 0);
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count, share: ratio(count, total) }))
    .sort((left, right) => right.count - left.count)
    .slice(0, limit);
}

function weightedZoneStats(rows: Array<Record<string, string>>) {
  const bucket = new Map<string, { defects: number; critical: number }>();
  rows.forEach((row) => {
    const zone = row.zone_code || row.zone_name || "UNKNOWN";
    const weight = Math.max(asNumber(row.n_samples), 1);
    const current = bucket.get(zone) ?? { defects: 0, critical: 0 };
    current.defects += weight;
    if (normalizeSeverity(row.severity) === "CRITICAL") current.critical += weight;
    bucket.set(zone, current);
  });
  return Array.from(bucket.entries()).map(([zone, value]) => ({
    zone,
    defects: value.defects,
    criticalRate: ratio(value.critical, value.defects),
  }));
}

function buildModelComparison(rows: Array<Record<string, string>>) {
  const bucket = new Map<string, { defects: number; major: number; reworkMinutes: number }>();

  rows.forEach((row) => {
    const modelCode = row.model_code || row.modelCode || row.model_name || "UNKNOWN";
    const current = bucket.get(modelCode) ?? { defects: 0, major: 0, reworkMinutes: 0 };
    current.defects += 1;
    const severity = normalizeSeverity(row.severity);
    if (severity === "CRITICAL" || severity === "MAJOR") current.major += 1;
    current.reworkMinutes += asNumber(row.rework_time_min ?? row.rework_minutes ?? row.rework_time ?? 0);
    bucket.set(modelCode, current);
  });

  const maxDefects = Math.max(...Array.from(bucket.values()).map((value) => value.defects), 1);

  return Array.from(bucket.entries())
    .map(([modelCode, value]) => ({
      modelCode,
      failRate: Number(((value.defects / maxDefects) * 100).toFixed(2)),
      majorRate: ratio(value.major, value.defects),
      avgReworkMin: Number((value.reworkMinutes / Math.max(value.defects, 1)).toFixed(2)),
    }))
    .sort((left, right) => right.failRate - left.failRate)
    .slice(0, 6);
}

function normalizeSeverity(value: unknown): "CRITICAL" | "MAJOR" | "MINOR" {
  const normalized = String(value ?? "MINOR").toUpperCase();
  if (normalized === "CRITICAL") return "CRITICAL";
  if (normalized === "MAJOR" || normalized === "HIGH") return "MAJOR";
  return "MINOR";
}

function inferZoneFromFileName(fileName: string) {
  const raw = fileName.split("_")[0]?.toUpperCase() ?? "UNKNOWN";
  const zoneMap: Record<string, string> = {
    HOOD: "HOOD",
    FENDER: "FENDER",
    FRONT: "FRONT_DOOR",
    REAR: "REAR_DOOR",
    ROOF: "ROOF",
    TRUNK: "TRUNK",
    BUMPER: "BUMPER",
    ROCKER: "ROCKER",
  };
  return zoneMap[raw] ?? raw;
}

function inferRiskScore(severity: "CRITICAL" | "MAJOR" | "MINOR", avgReworkMin: number, confidence: number) {
  const severityBase = severity === "CRITICAL" ? 82 : severity === "MAJOR" ? 61 : 38;
  const reworkBoost = Math.min(12, avgReworkMin * 0.18);
  const confidenceBoost = Math.max(0, (confidence - 0.8) * 20);
  return Math.min(99, Number((severityBase + reworkBoost + confidenceBoost).toFixed(2)));
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ratio(part: number, total: number) {
  return total > 0 ? Number(((part / total) * 100).toFixed(2)) : 0;
}

export function toRiskGrade(score: number): RiskGrade {
  if (score >= 70) return "CRITICAL";
  if (score >= 55) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

export function recommendationForGrade(grade: RiskGrade): string {
  if (grade === "CRITICAL") return "즉시 라인 정지 및 전수 재검사";
  if (grade === "HIGH") return "교대 시작 직후 집중 모니터링 및 환경값 즉시 보정";
  if (grade === "MEDIUM") return "주기적 모니터링 강화 및 표준작업 점검";
  return "정기 모니터링 유지";
}

function clampUnit(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function cleanJsonFence(text: string) {
  return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
}

function fallbackDetections(fileName: string): QualityDetection[] {
  const inferredZone = fileName.toLowerCase().includes("door") ? "Door Panel" : "Hood Surface";
  return [
    {
      defectTypeCode: "PAINT-CHK",
      defectTypeName: "표면 결함 후보",
      zone: inferredZone,
      severity: "MAJOR",
      confidence: 0.62,
      riskScore: 58,
      riskGrade: "HIGH",
      recommendation: recommendationForGrade("HIGH"),
      summary: "자동 분석이 실패하여 기본 폴백 결과를 제공합니다. 실제 운영에서는 재분석이 필요합니다.",
      bbox: {
        x: 0.18,
        y: 0.2,
        width: 0.42,
        height: 0.34,
      },
    },
  ];
}

export async function analyzeQualityImage(input: {
  fileName: string;
  mimeType: string;
  base64Data: string;
}) {
  const buffer = Buffer.from(input.base64Data, "base64");

  if (buffer.byteLength > 8 * 1024 * 1024) {
    throw new Error("이미지 파일은 8MB 이하만 업로드할 수 있습니다.");
  }

  try {
    const uploaded = await storagePut(
      `mes-quality/${Date.now()}-${input.fileName}`,
      buffer,
      input.mimeType,
    );

    const llmResult = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "당신은 자동차 도장 품질 검사 전문가다. 업로드된 이미지를 보고 도장 결함 후보를 탐지하고, 각 결함에 대해 제조 현장에서 바로 사용할 수 있는 짧은 요약과 권고조치를 함께 제시해야 한다. 바운딩 박스는 x,y,width,height를 0~1 사이 상대좌표로 반환한다.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "이미지를 분석해 도장 품질 결함 후보를 최대 6개까지 찾아주세요. 각 항목에는 defectTypeCode, defectTypeName, zone, severity(CRITICAL|MAJOR|MINOR), confidence(0~1), riskScore(0~100), summary, recommendation, bbox{x,y,width,height}를 넣고, 추가로 overallSummary를 포함한 JSON만 반환하세요.",
            },
            {
              type: "image_url",
              image_url: {
                url: uploaded.url,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "quality_image_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              overallSummary: { type: "string" },
              detections: {
                type: "array",
                maxItems: 6,
                items: {
                  type: "object",
                  properties: {
                    defectTypeCode: { type: "string" },
                    defectTypeName: { type: "string" },
                    zone: { type: "string" },
                    severity: {
                      type: "string",
                      enum: ["CRITICAL", "MAJOR", "MINOR"],
                    },
                    confidence: { type: "number" },
                    riskScore: { type: "number" },
                    summary: { type: "string" },
                    recommendation: { type: "string" },
                    bbox: {
                      type: "object",
                      properties: {
                        x: { type: "number" },
                        y: { type: "number" },
                        width: { type: "number" },
                        height: { type: "number" },
                      },
                      required: ["x", "y", "width", "height"],
                      additionalProperties: false,
                    },
                  },
                  required: [
                    "defectTypeCode",
                    "defectTypeName",
                    "zone",
                    "severity",
                    "confidence",
                    "riskScore",
                    "summary",
                    "recommendation",
                    "bbox",
                  ],
                  additionalProperties: false,
                },
              },
            },
            required: ["overallSummary", "detections"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = llmResult.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("LLM 응답 본문이 비어 있습니다.");
    }
    const text = typeof content === "string" ? content : JSON.stringify(content);
    const parsed = JSON.parse(cleanJsonFence(text)) as {
      overallSummary: string;
      detections: QualityDetection[];
    };

    const detections = parsed.detections.map((item) => {
      const riskScore = Math.max(0, Math.min(100, Number(item.riskScore) || 0));
      const riskGrade = toRiskGrade(riskScore);
      return {
        ...item,
        confidence: clampUnit(Number(item.confidence) || 0),
        riskScore,
        riskGrade,
        recommendation: item.recommendation?.trim() || recommendationForGrade(riskGrade),
        bbox: {
          x: clampUnit(Number(item.bbox?.x) || 0),
          y: clampUnit(Number(item.bbox?.y) || 0),
          width: clampUnit(Number(item.bbox?.width) || 0.2),
          height: clampUnit(Number(item.bbox?.height) || 0.2),
        },
      };
    });

    return {
      imageUrl: uploaded.url,
      overallSummary: parsed.overallSummary,
      detections,
      fallbackUsed: false,
    };
  } catch (error) {
    console.error("[MES] Quality image analysis failed:", error);
    const detections = fallbackDetections(input.fileName);
    return {
      imageUrl: `data:${input.mimeType};base64,${input.base64Data}`,
      overallSummary: "자동 품질 분석 호출에 실패하여 폴백 결과를 표시합니다. 파일 형식과 네트워크 상태를 확인한 뒤 재시도하세요.",
      detections,
      fallbackUsed: true,
    };
  }
}
