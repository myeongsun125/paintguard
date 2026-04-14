export type ProcessFilters = {
  startDate: string;
  endDate: string;
  plantCode: string;
  lineCode: string;
  shift: string;
};

export type UploadedProcessData = {
  dailySummaryRows: Array<Record<string, string>>;
  inspectionMasterRows: Array<Record<string, string>>;
};

export type UploadedQualityData = {
  defectDetailRows: Array<Record<string, string>>;
};

export type RiskGrade = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type QualityCard = {
  imageId: string;
  imageLabel: string;
  defectTypeCode: string;
  defectTypeName: string;
  zone: string;
  severity: string;
  riskScore: number;
  riskGrade: RiskGrade;
  confidence: number;
  recommendation: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  imageUrl?: string;
  summary?: string;
};

export function cnNumber(value: unknown, digits = 2) {
  const numberValue = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue.toFixed(digits) : (0).toFixed(digits);
}

export function parseCsv(text: string) {
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

export async function readCsvFile(file: File) {
  return parseCsv(await file.text());
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function averageWeighted(rows: Array<Record<string, string | number>>, valueKey: string, weightKey: string) {
  const weighted = rows.reduce((acc, row) => acc + asNumber(row[valueKey]) * asNumber(row[weightKey]), 0);
  const totalWeight = rows.reduce((acc, row) => acc + asNumber(row[weightKey]), 0);
  return totalWeight > 0 ? weighted / totalWeight : 0;
}

export function buildAvailableLines(rows: Array<Record<string, string>>) {
  return Array.from(new Set(rows.map((row) => row.line_code).filter(Boolean))).sort();
}

export function deriveProcessView(sampleData: any, filters: ProcessFilters, uploaded?: UploadedProcessData | null) {
  if (uploaded?.dailySummaryRows?.length) {
    return deriveProcessViewFromUploads(sampleData, filters, uploaded);
  }

  const filteredDaily = (sampleData?.plantDaily ?? []).filter((row: any) => {
    if (filters.plantCode && row.plant_code !== filters.plantCode) return false;
    if (filters.shift && row.shift !== filters.shift) return false;
    if (filters.startDate && row.date < filters.startDate) return false;
    if (filters.endDate && row.date > filters.endDate) return false;
    return true;
  });

  const totalInspections = filteredDaily.reduce((acc: number, row: any) => acc + asNumber(row.total), 0);
  const totalFails = filteredDaily.reduce((acc: number, row: any) => acc + asNumber(row.fail_count), 0);
  const yieldRate = totalInspections > 0 ? ((totalInspections - totalFails) / totalInspections) * 100 : 0;

  const yieldTrend = aggregateByKey(filteredDaily, "date", (rows) => ({
    yieldRate: ratio(rows.reduce((acc, row) => acc + asNumber(row.total) - asNumber(row.fail_count), 0), rows.reduce((acc, row) => acc + asNumber(row.total), 0)),
    failRate: ratio(rows.reduce((acc, row) => acc + asNumber(row.fail_count), 0), rows.reduce((acc, row) => acc + asNumber(row.total), 0)),
    total: rows.reduce((acc, row) => acc + asNumber(row.total), 0),
  }));

  const plantComparison = aggregateByKey(filteredDaily, "plant_name", (rows) => ({
    failRate: ratio(rows.reduce((acc, row) => acc + asNumber(row.fail_count), 0), rows.reduce((acc, row) => acc + asNumber(row.total), 0)),
    total: rows.reduce((acc, row) => acc + asNumber(row.total), 0),
    fails: rows.reduce((acc, row) => acc + asNumber(row.fail_count), 0),
  }));

  const shiftHeatmap = (sampleData?.shiftHourly ?? []).map((row: any) => ({
    shift: String(row.shift),
    hour: asNumber(row.hour),
    failRate: asNumber(row.fail_rate),
    total: asNumber(row.total),
  }));

  const envScatter = (sampleData?.envBins ?? []).map((row: any) => ({
    humidity: asNumber(row.humidity_bin),
    temperature: asNumber(row.temp_bin),
    failRate: asNumber(row.fail_rate),
    total: asNumber(row.total),
  }));

  const avgTaktTime = averageWeighted(filteredDaily, "avg_takt", "total");
  const avgInferenceTime = asNumber(sampleData?.summary?.avgInferenceTime ?? 1.2);

  return {
    mode: "sample",
    totalInspections,
    totalFails,
    yieldRate,
    avgTaktTime,
    avgInferenceTime,
    yieldTrend,
    plantComparison,
    shiftHeatmap,
    envScatter,
    availablePlants: (sampleData?.plants ?? []).map((row: any) => ({ code: row.plant_code, name: row.plant_name })),
    availableLines: [],
    helperText: "샘플 모드에서는 제공된 집계 CSV 기준으로 동작하며, 라인 필터는 업로드된 daily_summary.csv가 있을 때 활성화됩니다.",
  };
}

function deriveProcessViewFromUploads(sampleData: any, filters: ProcessFilters, uploaded: UploadedProcessData) {
  const filteredDaily = uploaded.dailySummaryRows.filter((row) => {
    if (filters.plantCode && row.plant_code !== filters.plantCode) return false;
    if (filters.lineCode && row.line_code !== filters.lineCode) return false;
    if (filters.shift && row.shift !== filters.shift) return false;
    if (filters.startDate && row.date < filters.startDate) return false;
    if (filters.endDate && row.date > filters.endDate) return false;
    return true;
  });

  const totalInspections = filteredDaily.reduce((acc, row) => acc + asNumber(row.total_inspections), 0);
  const totalFails = filteredDaily.reduce((acc, row) => acc + asNumber(row.fail_count), 0);
  const yieldRate = totalInspections > 0 ? ((totalInspections - totalFails) / totalInspections) * 100 : 0;

  const yieldTrend = aggregateByKey(filteredDaily, "date", (rows) => ({
    yieldRate: ratio(rows.reduce((acc, row) => acc + asNumber(row.pass_count), 0), rows.reduce((acc, row) => acc + asNumber(row.total_inspections), 0)),
    failRate: ratio(rows.reduce((acc, row) => acc + asNumber(row.fail_count), 0), rows.reduce((acc, row) => acc + asNumber(row.total_inspections), 0)),
    total: rows.reduce((acc, row) => acc + asNumber(row.total_inspections), 0),
  }));

  const plantComparison = aggregateByKey(filteredDaily, "plant_code", (rows) => ({
    failRate: ratio(rows.reduce((acc, row) => acc + asNumber(row.fail_count), 0), rows.reduce((acc, row) => acc + asNumber(row.total_inspections), 0)),
    total: rows.reduce((acc, row) => acc + asNumber(row.total_inspections), 0),
    fails: rows.reduce((acc, row) => acc + asNumber(row.fail_count), 0),
  }));

  const inspectionRows = uploaded.inspectionMasterRows.filter((row) => {
    if (filters.plantCode && row.plant_code !== filters.plantCode) return false;
    if (filters.lineCode && row.line_code !== filters.lineCode) return false;
    if (filters.shift && row.shift !== filters.shift) return false;
    const date = (row.inspection_datetime ?? "").slice(0, 10);
    if (filters.startDate && date < filters.startDate) return false;
    if (filters.endDate && date > filters.endDate) return false;
    return true;
  });

  const shiftHeatmap = buildShiftHeatmap(inspectionRows);
  const envScatter = buildEnvScatter(inspectionRows);

  return {
    mode: "upload",
    totalInspections,
    totalFails,
    yieldRate,
    avgTaktTime: averageWeighted(filteredDaily, "avg_takt_time", "total_inspections"),
    avgInferenceTime: averageWeighted(filteredDaily, "avg_inference_time", "total_inspections"),
    yieldTrend,
    plantComparison,
    shiftHeatmap: shiftHeatmap.length ? shiftHeatmap : sampleData?.shiftHourly ?? [],
    envScatter: envScatter.length ? envScatter : sampleData?.envBins ?? [],
    availablePlants: Array.from(new Set(uploaded.dailySummaryRows.map((row) => row.plant_code))).map((code) => ({ code, name: code })),
    availableLines: buildAvailableLines(uploaded.dailySummaryRows),
    helperText: inspectionRows.length
      ? "업로드된 inspection_master.csv와 daily_summary.csv를 기반으로 공정 탭이 동작 중입니다."
      : "현재는 daily_summary.csv만 반영되어 일부 고급 시각화는 샘플 집계를 사용합니다.",
  };
}

function buildShiftHeatmap(rows: Array<Record<string, string>>) {
  const bucket = new Map<string, { total: number; fail: number; shift: string; hour: number }>();

  rows.forEach((row) => {
    const date = new Date(row.inspection_datetime);
    const hour = Number.isNaN(date.getTime()) ? 0 : date.getHours();
    const key = `${row.shift}-${hour}`;
    const current = bucket.get(key) ?? { total: 0, fail: 0, shift: row.shift ?? "-", hour };
    current.total += 1;
    if ((row.result ?? "").toUpperCase() === "FAIL") current.fail += 1;
    bucket.set(key, current);
  });

  return Array.from(bucket.values())
    .map((item) => ({
      shift: item.shift,
      hour: item.hour,
      total: item.total,
      failRate: ratio(item.fail, item.total),
    }))
    .sort((left, right) => left.shift.localeCompare(right.shift) || left.hour - right.hour);
}

function buildEnvScatter(rows: Array<Record<string, string>>) {
  const bucket = new Map<string, { humidity: number; temperature: number; total: number; fail: number }>();

  rows.forEach((row) => {
    const humidity = roundToStep(asNumber(row.humidity_pct), 5);
    const temperature = roundToStep(asNumber(row.ambient_temp_c), 2.5);
    if (!humidity && !temperature) return;
    const key = `${humidity}-${temperature}`;
    const current = bucket.get(key) ?? { humidity, temperature, total: 0, fail: 0 };
    current.total += 1;
    if ((row.result ?? "").toUpperCase() === "FAIL") current.fail += 1;
    bucket.set(key, current);
  });

  return Array.from(bucket.values()).map((item) => ({
    humidity: item.humidity,
    temperature: item.temperature,
    total: item.total,
    failRate: ratio(item.fail, item.total),
  }));
}

export function deriveQualityView(sampleData: any, uploaded?: UploadedQualityData | null, uploadedCards?: QualityCard[]) {
  const sample = sampleData?.qualitySample;
  const cards = uploadedCards?.length ? uploadedCards : (sample?.sampleCards ?? []);

  if (uploaded?.defectDetailRows?.length) {
    const rows = uploaded.defectDetailRows;
    return {
      mode: "upload",
      topDefects: topCounts(rows, "defect_type_name", 6),
      severityDistribution: topCounts(rows, "severity", 4),
      zoneHeatmap: topZoneStats(rows),
      modelComparison: buildModelComparison(rows),
      defectProfileTable: sample?.defectProfileTable ?? [],
      cards,
      helperText: "업로드된 defect_detail.csv를 기준으로 품질 차트가 계산되며, 상세 패널은 PaintGuard defect_profile_table을 함께 참조합니다.",
    };
  }

  return {
    mode: "sample",
    topDefects: sample?.topDefects ?? [],
    severityDistribution: sample?.severityDistribution ?? [],
    zoneHeatmap: sample?.zoneHeatmap ?? [],
    modelComparison: sample?.modelComparison ?? [],
    defectProfileTable: sample?.defectProfileTable ?? [],
    cards,
    helperText: "샘플 모드에서는 실제 PaintGuard YOLO 라벨 로그와 defect_profile_table 기반 품질 분포를 제공합니다.",
  };
}

function topCounts(rows: Array<Record<string, string>>, field: string, limit: number) {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const key = row[field] || "UNKNOWN";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const total = Array.from(counts.values()).reduce((acc, value) => acc + value, 0);
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count, share: ratio(count, total) }))
    .sort((left, right) => right.count - left.count)
    .slice(0, limit);
}

function topZoneStats(rows: Array<Record<string, string>>) {
  const bucket = new Map<string, { defects: number; critical: number }>();
  rows.forEach((row) => {
    const zone = row.zone_name || row.zone_code || "UNKNOWN";
    const current = bucket.get(zone) ?? { defects: 0, critical: 0 };
    current.defects += 1;
    if ((row.severity ?? "").toUpperCase() === "CRITICAL") current.critical += 1;
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
    const severity = (row.severity ?? "").toUpperCase();
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

function aggregateByKey<T extends Record<string, any>>(rows: T[], key: string, mapper: (group: T[]) => Record<string, number>) {
  const groups = new Map<string, T[]>();
  rows.forEach((row) => {
    const groupKey = String(row[key]);
    const current = groups.get(groupKey) ?? [];
    current.push(row);
    groups.set(groupKey, current);
  });
  return Array.from(groups.entries())
    .map(([groupKey, groupRows]) => ({ [key]: groupKey, ...mapper(groupRows) }))
    .sort((left, right) => String(left[key]).localeCompare(String(right[key])));
}

function ratio(part: number, total: number) {
  return total > 0 ? Number(((part / total) * 100).toFixed(2)) : 0;
}

function roundToStep(value: number, step: number) {
  if (!Number.isFinite(value) || step <= 0) return 0;
  return Number((Math.round(value / step) * step).toFixed(2));
}
