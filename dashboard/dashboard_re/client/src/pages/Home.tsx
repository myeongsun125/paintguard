import { motion } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  ClipboardCheck,
  Cog,
  Factory,
  Hammer,
  PackageCheck,
  SprayCan,
  Truck,
  Lock,
} from "lucide-react";
import { useLocation } from "wouter";

type Step = {
  key: string;
  title: string;
  desc: string;
  icon: typeof Factory;
  active: boolean;
  path?: string;
};

const steps: Step[] = [
  { key: "inbound", title: "입고", desc: "자재/부품 입고", icon: Boxes, active: false },
  { key: "press", title: "프레스", desc: "차체 성형", icon: Hammer, active: false },
  { key: "weld", title: "용접", desc: "차체 조립", icon: Cog, active: false },
  { key: "paint", title: "도장", desc: "PaintGuard 모니터링", icon: SprayCan, active: true, path: "/paint" },
  { key: "assy", title: "조립", desc: "내외장 조립", icon: Factory, active: false },
  { key: "pt", title: "파워트레인", desc: "동력계 탑재", icon: Cog, active: false },
  { key: "inspect", title: "검사", desc: "완성차 검사", icon: ClipboardCheck, active: false },
  { key: "ship", title: "출하", desc: "완성차 출고", icon: Truck, active: false },
];

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.12),transparent_38%),linear-gradient(180deg,#06111f_0%,#020611_100%)] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start gap-3">
          <p className="text-[11px] uppercase tracking-[0.34em] text-primary">PaintGuard · MES Overview</p>
          <h1 className="text-3xl font-semibold text-foreground">완성차 제조 공정 플로우</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            현대자동차그룹 완성차 제조공정 단계를 한눈에 조망합니다. 현재는 <span className="text-primary font-medium">도장(PaintGuard)</span> 공정의 실시간 모니터링만 제공하며, 나머지 공정은 데이터 확보 후 순차 공개될 예정입니다.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.key}
                layoutId={`step-${step.key}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, type: "spring", stiffness: 180, damping: 22 }}
                whileHover={step.active ? { scale: 1.04 } : { scale: 1.01 }}
                onClick={() => step.active && step.path && setLocation(step.path)}
                title={step.active ? "PaintGuard 대시보드로 이동" : "데이터 미보유"}
                className={[
                  "relative flex cursor-pointer flex-col items-center gap-3 rounded-2xl border p-5 text-center transition",
                  step.active
                    ? "border-primary/40 bg-primary/10 shadow-[0_0_40px_rgba(45,212,191,0.25)] hover:border-primary/60"
                    : "border-border/50 bg-card/60 opacity-65 cursor-not-allowed",
                ].join(" ")}
              >
                <div className="absolute left-3 top-3 text-[10px] font-mono text-muted-foreground">{String(idx + 1).padStart(2, "0")}</div>
                {!step.active && (
                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-border/50 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                    <Lock className="h-2.5 w-2.5" />
                    Coming Soon
                  </div>
                )}
                {step.active && (
                  <div className="absolute right-3 top-3 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-[0_0_10px_rgba(45,212,191,0.6)]">
                    LIVE
                  </div>
                )}
                <div
                  className={[
                    "mt-4 flex h-14 w-14 items-center justify-center rounded-2xl",
                    step.active ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground",
                  ].join(" ")}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className={["text-base font-semibold", step.active ? "text-foreground" : "text-muted-foreground"].join(" ")}>{step.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{step.desc}</p>
                </div>
                {idx < steps.length - 1 && (
                  <ArrowRight className="pointer-events-none absolute -right-2 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground/60 lg:block" />
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <button
            onClick={() => setLocation("/paint")}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_0_30px_rgba(45,212,191,0.35)] hover:bg-primary/90"
          >
            <PackageCheck className="h-4 w-4" />
            도장공정 대시보드 열기
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/70 px-4 py-3 text-xs text-muted-foreground">
            <Factory className="h-3.5 w-3.5 text-primary" />
            PaintGuard는 MES 4개 레이어(주문·공정·품질·예지보전)를 통합 모니터링합니다.
          </div>
        </div>
      </div>
    </div>
  );
}
