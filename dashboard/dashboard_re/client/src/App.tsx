import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ComingSoonPage from "./pages/ComingSoonPage";
import ProcessPage from "./pages/ProcessPage";
import QualityPage from "./pages/QualityPage";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/">
          <ProcessPage />
        </Route>
        <Route path="/process">
          <ProcessPage />
        </Route>
        <Route path="/quality">
          <QualityPage />
        </Route>
        <Route path="/orders">
          <ComingSoonPage
            title="주문량 레이어"
            description="주문량·납기·수주 편차 지표는 다음 단계에서 추가될 예정입니다. 현재는 공정과 품질 레이어를 우선 구현했습니다."
          />
        </Route>
        <Route path="/maintenance">
          <ComingSoonPage
            title="예지보전 레이어"
            description="설비 상태·이상 징후·잔존수명 예측 시나리오는 향후 예지보전 파트 확장 시 연결됩니다."
          />
        </Route>
        <Route path="/production">
          <ComingSoonPage
            title="생산량 레이어"
            description="생산량·UPH·목표 대비 실적 관제는 다음 단계에서 연결될 예정입니다."
          />
        </Route>
        <Route>
          <ProcessPage />
        </Route>
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
