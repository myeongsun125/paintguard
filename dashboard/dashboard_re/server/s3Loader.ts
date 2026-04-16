import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "ap-northeast-2" });
const BUCKET = process.env.DATA_BUCKET_NAME ?? "";
export const IS_PROD = process.env.NODE_ENV === "production";

const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 60_000;

export async function getJson(key: string): Promise<unknown> {
  if (!IS_PROD) return null;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < TTL) return cached.data;

  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const res = await s3.send(cmd);
  const str = await res.Body?.transformToString();
  const data = JSON.parse(str ?? "{}");
  cache.set(key, { data, ts: Date.now() });
  return data;
}

export async function getDefectImageUrl(
  filename: string,
): Promise<string | null> {
  if (!IS_PROD) return null;
  if (!filename || filename.includes("/") || filename.includes(".."))
    return null;
  try {
    const cmd = new GetObjectCommand({
      Bucket: BUCKET,
      Key: `defects/images/${filename}`,
    });
    return await getSignedUrl(s3, cmd, { expiresIn: 3600 });
  } catch {
    return null;
  }
}

export async function loadKpiDaily() {
  return getJson("aggregates/kpi_daily.json");
}

export async function loadShiftDefectRate() {
  return getJson("aggregates/shift_defect_rate.json");
}

export async function loadEnvBins() {
  return getJson("aggregates/env_bins.json");
}

export async function loadOvenStatus() {
  return getJson("aggregates/oven_status.json");
}

export async function loadAlertEvents() {
  return getJson("alerts/events.json");
}

export async function loadLineMonthly() {
  return getJson("aggregates/line_monthly.json");
}
