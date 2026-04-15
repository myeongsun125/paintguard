import { useAlertStore, type AlertSeverity } from "@/stores/alertStore";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Bell, CheckCircle2, Info, ShieldAlert, X } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

const severityStyle: Record<AlertSeverity, { text: string; bg: string; border: string; Icon: typeof Info }> = {
  CRITICAL: { text: "text-rose-200", bg: "bg-rose-500/15", border: "border-rose-400/40", Icon: ShieldAlert },
  WARNING: { text: "text-amber-200", bg: "bg-amber-400/12", border: "border-amber-400/35", Icon: AlertTriangle },
  INFO: { text: "text-cyan-200", bg: "bg-cyan-400/12", border: "border-cyan-400/35", Icon: Info },
};

export function CriticalBanner() {
  const alerts = useAlertStore((s) => s.alerts);
  const ack = useAlertStore((s) => s.acknowledge);
  const top = alerts.find((a) => a.severity === "CRITICAL" && !a.acknowledged);
  if (!top) return null;
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-rose-500/40 bg-rose-500/15 px-4 py-2 backdrop-blur">
      <div className="flex items-center gap-2 text-sm text-rose-100">
        <ShieldAlert className="h-4 w-4 text-rose-300" />
        <span className="font-semibold">{top.title}</span>
        <span className="text-rose-200/80">— {top.message}</span>
      </div>
      <button
        onClick={() => ack(top.id)}
        className="inline-flex items-center gap-1 rounded-lg border border-rose-300/40 bg-rose-400/10 px-2 py-1 text-xs text-rose-50 hover:bg-rose-400/20"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        확인
      </button>
    </div>
  );
}

export function AlertToasts() {
  const alerts = useAlertStore((s) => s.alerts);
  useEffect(() => {
    const warn = alerts.find((a) => a.severity === "WARNING" && !a.acknowledged);
    if (warn) {
      toast.warning(warn.title, { description: warn.message, id: warn.id, duration: 6000 });
    }
  }, [alerts]);
  return null;
}

export default function AlertCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const alerts = useAlertStore((s) => s.alerts);
  const ack = useAlertStore((s) => s.acknowledge);
  const ackAll = useAlertStore((s) => s.acknowledgeAll);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 280, damping: 32 }}
          className="fixed right-0 top-0 z-50 flex h-screen w-[380px] flex-col border-l border-border/60 bg-[#06111f] shadow-[0_0_80px_rgba(244,63,94,0.15)]"
        >
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">알람 센터</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={ackAll}
                className="rounded-md border border-border/60 bg-card/70 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                모두 확인
              </button>
              <button onClick={onClose} className="rounded-md border border-border/60 bg-card/70 p-1.5 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {alerts.length === 0 && <p className="mt-10 text-center text-xs text-muted-foreground">알람이 없습니다.</p>}
            {alerts.map((a) => {
              const s = severityStyle[a.severity];
              const Icon = s.Icon;
              return (
                <div
                  key={a.id}
                  className={[
                    "rounded-xl border p-3",
                    s.border,
                    s.bg,
                    a.acknowledged ? "opacity-60" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`mt-0.5 h-4 w-4 ${s.text}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold ${s.text}`}>{a.title}</p>
                        <span className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{a.message}</p>
                      {!a.acknowledged && (
                        <button
                          onClick={() => ack(a.id)}
                          className="mt-2 inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/60 px-2 py-1 text-[11px] text-foreground hover:bg-background/80"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          확인 (acknowledge)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
