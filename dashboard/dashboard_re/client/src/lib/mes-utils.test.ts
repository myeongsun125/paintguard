import { describe, expect, it } from "vitest";
import { deriveProcessView, deriveQualityView } from "./mes-utils";

describe("deriveQualityView", () => {
  it("builds model comparison data from uploaded quality rows", () => {
    const result = deriveQualityView(
      { qualitySample: { sampleCards: [] } },
      {
        defectDetailRows: [
          { defect_type_name: "Orange Peel", severity: "CRITICAL", zone_name: "Zone A", model_code: "SEDAN-A", rework_time_min: "18" },
          { defect_type_name: "Dust", severity: "MAJOR", zone_name: "Zone B", model_code: "SEDAN-A", rework_time_min: "12" },
          { defect_type_name: "Scratch", severity: "MINOR", zone_name: "Zone C", model_code: "SUV-X", rework_time_min: "8" },
        ],
      },
      [],
    );

    expect(result.mode).toBe("upload");
    expect(result.modelComparison).toHaveLength(2);
    expect(result.modelComparison[0]).toMatchObject({
      modelCode: "SEDAN-A",
      failRate: 100,
      majorRate: 100,
    });
    expect(result.modelComparison[1]).toMatchObject({
      modelCode: "SUV-X",
      failRate: 50,
      majorRate: 0,
    });
  });
});

describe("deriveProcessView", () => {
  it("builds process monitoring aggregates from uploaded daily and inspection rows", () => {
    const result = deriveProcessView(
      {
        shiftHourly: [],
        envBins: [],
      },
      {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        plantCode: "P1",
        lineCode: "A_LINE",
        shift: "A",
      },
      {
        dailySummaryRows: [
          {
            date: "2024-01-03",
            plant_code: "P1",
            line_code: "A_LINE",
            shift: "A",
            total_inspections: "120",
            pass_count: "114",
            fail_count: "6",
            avg_takt_time: "21.5",
            avg_inference_time: "0.92",
          },
          {
            date: "2024-01-04",
            plant_code: "P1",
            line_code: "A_LINE",
            shift: "A",
            total_inspections: "100",
            pass_count: "95",
            fail_count: "5",
            avg_takt_time: "22.5",
            avg_inference_time: "1.02",
          },
        ],
        inspectionMasterRows: [
          {
            inspection_datetime: "2024-01-03T08:15:00",
            plant_code: "P1",
            line_code: "A_LINE",
            shift: "A",
            result: "PASS",
            ambient_temp_c: "24.0",
            humidity_pct: "50.0",
          },
          {
            inspection_datetime: "2024-01-03T08:45:00",
            plant_code: "P1",
            line_code: "A_LINE",
            shift: "A",
            result: "FAIL",
            ambient_temp_c: "25.0",
            humidity_pct: "55.0",
          },
          {
            inspection_datetime: "2024-01-04T09:10:00",
            plant_code: "P1",
            line_code: "A_LINE",
            shift: "A",
            result: "PASS",
            ambient_temp_c: "26.0",
            humidity_pct: "60.0",
          },
        ],
      },
    );

    expect(result.mode).toBe("upload");
    expect(result.totalInspections).toBe(220);
    expect(result.totalFails).toBe(11);
    expect(result.yieldRate).toBeCloseTo(95, 5);
    expect(result.availablePlants).toEqual([{ code: "P1", name: "P1" }]);
    expect(result.availableLines).toEqual(["A_LINE"]);
    expect(result.shiftHeatmap).toEqual([
      { shift: "A", hour: 8, total: 2, failRate: 50 },
      { shift: "A", hour: 9, total: 1, failRate: 0 },
    ]);
    expect(result.envScatter).toEqual([
      { humidity: 50, temperature: 25, total: 2, failRate: 50 },
      { humidity: 60, temperature: 25, total: 1, failRate: 0 },
    ]);
  });
});
