import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import L01Orders from "./layers/L01Orders";
import L02Process from "./layers/L02Process";
import L03Quality from "./layers/L03Quality";
import L04Maintenance from "./layers/L04Maintenance";

function PaintDashboard() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/paint" component={L03Quality} />
        <Route path="/paint/l01" component={L01Orders} />
        <Route path="/paint/l02" component={L02Process} />
        <Route path="/paint/l03" component={L03Quality} />
        <Route path="/paint/l04" component={L04Maintenance} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/paint/:rest*">
        <PaintDashboard />
      </Route>
      <Route path="/paint">
        <PaintDashboard />
      </Route>
      <Route>
        <Home />
      </Route>
    </Switch>
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
