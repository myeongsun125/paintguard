import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { analyzeQualityImage, loadMesSampleData } from "./mes";
import {
  IS_PROD,
  getDefectImageUrl,
  getDefectMeta,
  loadAlertEvents,
  loadDefectList,
  loadEnvBins,
  loadKpiDaily,
  loadLineMonthly,
  loadOvenStatus,
  loadShiftDefectRate,
  loadSnapshots,
  loadWorkOrders,
} from "./s3Loader";
import { getLineShiftSummary } from "./duckdbLoader";

const imageAnalysisInput = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  base64Data: z.string().min(1),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  mes: router({
    sampleData: publicProcedure.query(async () => {
      return loadMesSampleData();
    }),
    processData: publicProcedure.query(async () => {
      const [kpi, shift, env, lineM] = await Promise.allSettled([
        loadKpiDaily(),
        loadShiftDefectRate(),
        loadEnvBins(),
        loadLineMonthly(),
      ]);
      return {
        kpiDaily: kpi.status === "fulfilled" ? kpi.value : null,
        shiftDefectRate: shift.status === "fulfilled" ? shift.value : null,
        envBins: env.status === "fulfilled" ? env.value : null,
        lineMonthly: lineM.status === "fulfilled" ? lineM.value : null,
        isLive: IS_PROD,
      };
    }),
    maintenanceData: publicProcedure.query(async () => {
      const [oven, alerts] = await Promise.allSettled([
        loadOvenStatus(),
        loadAlertEvents(),
      ]);
      return {
        ovenStatus: oven.status === "fulfilled" ? oven.value : null,
        alertEvents: alerts.status === "fulfilled" ? alerts.value : null,
        isLive: IS_PROD,
      };
    }),
    l01Data: publicProcedure.query(async () => {
      const [kpi, monthly, snapshots] = await Promise.allSettled([
        loadKpiDaily(),
        loadLineMonthly(),
        loadSnapshots(),
      ]);
      return {
        kpiDaily: kpi.status === "fulfilled" ? kpi.value : null,
        lineMonthly: monthly.status === "fulfilled" ? monthly.value : null,
        snapshots: snapshots.status === "fulfilled" ? snapshots.value : null,
        isLive: IS_PROD,
      };
    }),
    defectImageUrl: publicProcedure
      .input(z.object({ filename: z.string().min(1) }))
      .query(async ({ input }) => {
        const url = await getDefectImageUrl(input.filename);
        return { url };
      }),
    defectMeta: publicProcedure
      .input(z.object({ filename: z.string().min(1) }))
      .query(async ({ input }) => {
        const meta = await getDefectMeta(input.filename);
        return { meta };
      }),
    workOrders: publicProcedure
      .input(z.object({ date: z.string().min(1) }))
      .query(async ({ input }) => {
        const data = await loadWorkOrders(input.date);
        return { data, isLive: IS_PROD };
      }),
    defectList: publicProcedure.query(async () => {
      const data = await loadDefectList();
      return { data, isLive: IS_PROD };
    }),
    lineShiftSummary: publicProcedure.query(async () => {
      try {
        const data = await getLineShiftSummary();
        return { data, isLive: Boolean(data) };
      } catch {
        return { data: null, isLive: false };
      }
    }),
    analyzeQualityImage: publicProcedure
      .input(imageAnalysisInput)
      .mutation(async ({ input }) => {
        return analyzeQualityImage(input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
