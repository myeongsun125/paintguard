import { describe, expect, it } from "vitest";
import { deriveQualityView } from "../client/src/lib/mes-utils";

describe("quality upload aggregation", () => {
  it("computes model comparison metrics from uploaded defect rows", () => {
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
      avgReworkMin: 15,
    });
    expect(result.modelComparison[1]).toMatchObject({
      modelCode: "SUV-X",
      failRate: 50,
      majorRate: 0,
      avgReworkMin: 8,
    });
  });
});
