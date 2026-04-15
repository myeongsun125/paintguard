import { useAlertStore } from "@/stores/alertStore";
import { useFilterStore } from "@/stores/filterStore";
import { formatSimTime, useSimClock } from "@/lib/simulationClock";
import { Bell, Clock, Columns2, Factory as FactoryIcon } from "lucide-react";
import type { ReactNode } from "react";

const PLANTS = ["전체", "ULN", "ASN", "GWJ", "HWS"];
const LINES_BY_PLANT: Record<string, string[]> = {
  ULN: ["UL1", "UL2", "UL3", "UL4", "UL5"],
  ASN: ["AS1", "AS2", "AS3"],
  GWJ: ["GW1", "GW2"],
  HWS: ["HW1", "HW2", "HW3"],
};
const MODELS = ["전체", "SS3", "SV7", "NQ5", "CN7", "LX2", "EV9", "GV70", "MQ4", "NE1", "CK", "CV"];

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/70 px-3 py-1.5 text-xs text-muted-foreground">
      <span className="font-medium text-foreground/80">{label}</span>
      <select
        value={value ?? "전체"}
        onChange={(e) => onChange(e.target.value === "전체" ? null : e.target.value)}
        className="bg-transparent text-xs text-foreground outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-background">
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterGroup({
  side,
  children,
}: {
  side: "A" | "B";
  children?: ReactNode;
}) {
  const filterB = useFilterStore((s) => s.filterB);
  const { plant, line, model, setPlant, setLine, setModel, setPlantB, setLineB, setModelB } = useFilterStore();

  const currentPlant = side === "A" ? plant : filterB.plant;
  const currentLine = side === "A" ? line : filterB.line;
  const currentModel = side === "A" ? model : filterB.model;
  const setP = side === "A" ? setPlant : setPlantB;
  const setL = side === "A" ? setLine : setLineB;
  const setM = side === "A" ? setModel : setModelB;

  const lineOptions = currentPlant && LINES_BY_PLANT[currentPlant] ? ["전체", ...LINES_BY_PLANT[currentPlant]] : ["전체"];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select label="공장" value={currentPlant} options={PLANTS} onChange={setP} />
      <Select label="라인" value={currentLine} options={lineOptions} onChange={setL} />
      <Select label="모델" value={currentModel} options={MODELS} onChange={setM} />
      {children}
    </div>
  );
}

export default function FilterBar({
  side = "A",
  showClock = true,
  onToggleAlerts,
}: {
  side?: "A" | "B";
  showClock?: boolean;
  onToggleAlerts?: () => void;
}) {
  const simNow = useSimClock(1000);
  const comparePanel = useFilterStore((s) => s.comparePanel);
  const toggleCompare = useFilterStore((s) => s.toggleComparePanel);
  const unreadCount = useAlertStore((s) => s.unreadCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/70 px-4 py-2.5 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-primary">
          <FactoryIcon className="h-3.5 w-3.5" />
          <span className="font-semibold">필터 {side}</span>
        </div>
        <FilterGroup side={side} />
      </div>

      <div className="flex items-center gap-2">
        {showClock && (
          <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/8 px-3 py-1.5 font-mono text-xs text-primary">
            <Clock className="h-3.5 w-3.5" />
            SIM {formatSimTime(simNow)}
          </div>
        )}
        {side === "A" && (
          <>
            <button
              onClick={toggleCompare}
              className={[
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition",
                comparePanel
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/60 bg-card/80 text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <Columns2 className="h-3.5 w-3.5" />
              비교 {comparePanel ? "ON" : "OFF"}
            </button>
            <button
              onClick={onToggleAlerts}
              className="relative inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/80 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-3.5 w-3.5" />
              알람
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
