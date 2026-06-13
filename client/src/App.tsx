import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Assessment from "@/pages/assessment";
import AlertsPage from "@/pages/alerts";
import Analytics from "@/pages/analytics";
import MapView from "@/pages/map-view";
import LidarPage from "@/pages/lidar";
import RealtimePage from "@/pages/realtime";
import PipelinePage from "@/pages/pipeline";
import DecisionSupportPage from "@/pages/decision-support";
import Layout from "@/components/layout";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/lidar" component={LidarPage} />
        <Route path="/realtime" component={RealtimePage} />
        <Route path="/pipeline" component={PipelinePage} />
        <Route path="/decision" component={DecisionSupportPage} />
        <Route path="/assessment" component={Assessment} />
        <Route path="/alerts" component={AlertsPage} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/map" component={MapView} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
