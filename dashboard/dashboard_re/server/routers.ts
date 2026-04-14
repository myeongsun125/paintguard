import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { analyzeQualityImage, loadMesSampleData } from "./mes";

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
    analyzeQualityImage: publicProcedure
      .input(imageAnalysisInput)
      .mutation(async ({ input }) => {
        return analyzeQualityImage(input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
