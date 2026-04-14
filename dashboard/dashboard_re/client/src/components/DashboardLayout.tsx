import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Factory,
  Gauge,
  LogOut,
  Radar,
  ShieldAlert,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: BarChart3, label: "주문량", path: "/orders", status: "Coming Soon" },
  { icon: Activity, label: "공정", path: "/process", status: "Live" },
  { icon: ShieldAlert, label: "품질", path: "/quality", status: "Live" },
  { icon: Radar, label: "예지보전", path: "/maintenance", status: "Coming Soon" },
  { icon: Gauge, label: "생산량", path: "/production", status: "Coming Soon" },
] as const;

function LayoutFrame({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { user, logout } = useAuth();

  const activeMenuItem = useMemo(() => {
    return menuItems.find((item) => location === item.path) ?? menuItems[1];
  }, [location]);

  return (
    <SidebarProvider style={{ "--sidebar-width": "300px" } as CSSProperties}>
      <Sidebar className="border-r border-sidebar-border/70 bg-sidebar/95 backdrop-blur-xl">
        <SidebarHeader className="border-b border-sidebar-border/60 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-[0_0_35px_rgba(45,212,191,0.22)]">
              <Factory className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">MES Edge</p>
              <h1 className="truncate text-base font-semibold text-sidebar-foreground">Smart Factory Command</h1>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/8 p-3 shadow-[inset_0_0_30px_rgba(45,212,191,0.06)]">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>System Status</span>
              <span className="inline-flex items-center gap-2 text-primary">
                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(45,212,191,0.8)]" />
                ONLINE
              </span>
            </div>
            <p className="mt-2 text-sm text-sidebar-foreground">공정·품질 실시간 모니터링 중심으로 재구성된 산업 대시보드입니다.</p>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 py-4">
          <SidebarMenu className="gap-2">
            {menuItems.map((item, index) => {
              const isActive = location === item.path || (location === "/" && item.path === "/process");
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.label}
                    onClick={() => setLocation(item.path)}
                    className="h-auto rounded-2xl border border-transparent px-3 py-3 data-[active=true]:border-primary/20 data-[active=true]:bg-primary/12 data-[active=true]:shadow-[0_0_24px_rgba(45,212,191,0.12)]"
                  >
                    <div className="flex w-full items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isActive ? "bg-primary/18 text-primary" : "bg-muted/60 text-muted-foreground"}`}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-sidebar-foreground">L0{index + 1}. {item.label}</p>
                          <p className="truncate text-xs text-muted-foreground">{item.status}</p>
                        </div>
                        <ChevronRight className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground/60"}`} />
                      </div>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border/60 p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-3 text-left shadow-[0_0_20px_rgba(8,15,30,0.2)] transition hover:border-primary/20 hover:bg-card/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-10 w-10 border border-primary/20">
                  <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                    {user?.name?.charAt(0).toUpperCase() ?? "M"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">{user?.name ?? "Manus User"}</p>
                  <p className="truncate text-xs text-muted-foreground">Manufacturing Operator</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-border/70 bg-popover/95 backdrop-blur-xl">
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              {isMobile ? <SidebarTrigger className="h-9 w-9 rounded-xl border border-border/60 bg-card/80" /> : null}
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Industrial Monitoring</p>
                <h2 className="text-lg font-semibold text-foreground">{activeMenuItem.label} 레이어</h2>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              {activeMenuItem.status === "Live" ? "Monitoring Enabled" : "Rollout Pending"}
            </div>
          </div>
        </header>
        <main className="min-h-[calc(100vh-73px)] p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.16),transparent_28%),linear-gradient(180deg,#06111f_0%,#020611_100%)] px-6">
        <div className="w-full max-w-md rounded-[28px] border border-border/60 bg-card/85 p-8 shadow-[0_0_80px_rgba(6,182,212,0.12)] backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.34em] text-primary">MES Access</p>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">스마트 팩토리 대시보드에 로그인하세요</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            공정·품질 레이어는 인증된 사용자만 확인할 수 있습니다. 로그인 후 샘플 데이터 또는 업로드한 CSV로 대시보드를 검증할 수 있습니다.
          </p>
          <Button onClick={() => { window.location.href = getLoginUrl(); }} className="mt-6 h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-[0_0_30px_rgba(45,212,191,0.24)] hover:bg-primary/90">
            로그인 후 진입
          </Button>
        </div>
      </div>
    );
  }

  return <LayoutFrame>{children}</LayoutFrame>;
}
