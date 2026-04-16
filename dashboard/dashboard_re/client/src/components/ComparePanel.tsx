import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import FilterBar from "./FilterBar";
import { useFilterStore } from "@/stores/filterStore";

export default function ComparePanel({ children }: { children?: ReactNode }) {
  const open = useFilterStore((s) => s.comparePanel);
  const close = useFilterStore((s) => s.toggleComparePanel);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="compare-panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 260, damping: 32 }}
          className="fixed right-0 top-0 z-40 flex h-screen w-[45vw] min-w-[520px] flex-col border-l border-border/60 bg-[linear-gradient(180deg,#0b1220_0%,#06111f_100%)] shadow-[0_0_120px_rgba(6,182,212,0.18)]"
        >
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-300">Compare Mode</p>
              <h3 className="text-sm font-semibold text-foreground">비교 패널 B</h3>
            </div>
            <button
              onClick={close}
              className="rounded-lg border border-border/60 bg-card/70 p-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4 overflow-y-auto p-4">
            <FilterBar side="B" showClock={false} />
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4 text-xs leading-6 text-muted-foreground">
              비교 모드에서는 필터 B 기준으로 동일 차트가 나란히 표시됩니다. 예: 좌측(A)=A조 / 우측(B)=C조, 좌측=2월 / 우측=8월, 좌측=ULN / 우측=HWS 등.
            </div>
            {children}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
