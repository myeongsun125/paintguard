type ComingSoonPageProps = {
  title: string;
  description: string;
};

export default function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card/85 p-8 shadow-[0_0_60px_rgba(5,15,30,0.24)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(45,212,191,0.12),transparent_24%)]" />
      <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-amber-300">Layer Pending</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-[24px] border border-border/60 bg-background/70 p-6">
          <p className="text-sm font-medium text-foreground">현재 상태</p>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
              설계 축은 확보되었으며, 추후 실제 데이터셋과 KPI 정의가 정리되면 동일한 산업 UI 언어로 확장 가능합니다.
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
              현재 버전은 공정·품질 탭 구현에 집중되어 있습니다.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
