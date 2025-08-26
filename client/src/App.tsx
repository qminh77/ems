import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Events from "@/pages/events";
import Students from "@/pages/students";
import Checkin from "@/pages/checkin";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <div className="min-h-screen bg-background">
            <Sidebar />
            <Navbar />
            <div className="lg:ml-64">
              <Route path="/" component={Dashboard} />
              <Route path="/events" component={Events} />
              <Route path="/students" component={Students} />
              <Route path="/checkin" component={Checkin} />
            </div>
          </div>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
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
