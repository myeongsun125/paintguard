import { Database } from "duckdb";

const CSV_PATH =
  process.env.INSPECTION_CSV_PATH ?? "/opt/paintguard-data/inspection_master.csv";

const db = new Database(":memory:");
const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 60_000;

export async function getLineShiftSummary(): Promise<unknown> {
  if (!process.env.INSPECTION_CSV_PATH) return null;
  const cacheKey = "line_shift_summary";
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TTL) return cached.data;

  return new Promise((resolve, reject) => {
    db.all(
      `SELECT plant_code, line_code, shift, COUNT(*) as total, SUM(CASE WHEN result = 'FAIL' THEN 1 ELSE 0 END) as fail_count, ROUND(SUM(CASE WHEN result = 'FAIL' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 4) as fail_rate FROM read_csv_auto('${CSV_PATH}') GROUP BY plant_code, line_code, shift ORDER BY plant_code, line_code, shift`,
      (err, rows) => {
        if (err) reject(err);
        else {
          cache.set(cacheKey, { data: rows, ts: Date.now() });
          resolve(rows);
        }
      },
    );
  });
}
