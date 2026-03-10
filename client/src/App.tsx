import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import WebSocketStatus from "@/components/websocket-status";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Events from "@/pages/events";
import Students from "@/pages/students";
import Checkin from "@/pages/checkin";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login page
  // Check both error and authentication status
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // If authenticated, show main app
  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="min-h-svh">
        <Navbar />
        <div className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/events" component={Events} />
            <Route path="/students" component={Students} />
            <Route path="/checkin" component={Checkin} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <WebSocketStatus />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
