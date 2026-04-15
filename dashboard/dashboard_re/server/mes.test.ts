import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { recommendationForGrade, toRiskGrade } from "./mes";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("mes sample data", () => {
  it("returns the MES sample dataset through the router", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const payload = await caller.mes.sampleData();

    expect(payload.summary.totalInspections).toBeGreaterThan(0);
    expect(payload.summary.totalFails).toBeGreaterThan(0);
    expect(payload.summary.overallYieldRate).toBeGreaterThan(90);
    expect(payload.plants.length).toBeGreaterThan(0);
    expect(payload.plantDaily.length).toBeGreaterThan(0);
    expect(payload.shiftHourly.length).toBeGreaterThan(0);
    expect(payload.qualitySample.sampleCards.length).toBeGreaterThan(0);
    expect(payload.qualitySample.defectProfileTable?.length ?? 0).toBeGreaterThan(0);
    expect(payload.qualitySample.sampleCards[0]).toMatchObject({
      defectTypeCode: expect.any(String),
      defectTypeName: expect.any(String),
      zone: expect.any(String),
    });
  });
});

describe("risk grade helpers", () => {
  it("maps risk scores to the expected risk grade", () => {
    expect(toRiskGrade(82)).toBe("CRITICAL");
    expect(toRiskGrade(64)).toBe("HIGH");
    expect(toRiskGrade(41)).toBe("MEDIUM");
    expect(toRiskGrade(12)).toBe("LOW");
  });

  it("returns operational recommendations for each grade", () => {
    expect(recommendationForGrade("CRITICAL")).toContain("정지");
    expect(recommendationForGrade("HIGH")).toContain("모니터링");
    expect(recommendationForGrade("MEDIUM")).toContain("점검");
    expect(recommendationForGrade("LOW")).toContain("유지");
  });
});
