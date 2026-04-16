import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { analyzeQualityImage, loadMesSampleData } from "./mes";
import {
  IS_PROD,
  getDefectImageUrl,
  loadAlertEvents,
  loadEnvBins,
  loadKpiDaily,
  loadOvenStatus,
  loadShiftDefectRate,
} from "./s3Loader";

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
      const [kpi, shift, env] = await Promise.allSettled([
        loadKpiDaily(),
        loadShiftDefectRate(),
        loadEnvBins(),
      ]);
      return {
        kpiDaily: kpi.status === "fulfilled" ? kpi.value : null,
        shiftDefectRate: shift.status === "fulfilled" ? shift.value : null,
        envBins: env.status === "fulfilled" ? env.value : null,
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
    defectImageUrl: publicProcedure
      .input(z.object({ filename: z.string().min(1) }))
      .query(async ({ input }) => {
        const url = await getDefectImageUrl(input.filename);
        return { url };
      }),
    analyzeQualityImage: publicProcedure
      .input(imageAnalysisInput)
      .mutation(async ({ input }) => {
        return analyzeQualityImage(input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
