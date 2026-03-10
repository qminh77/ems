import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Events from "@/pages/events";
import Students from "@/pages/students";
import Checkin from "@/pages/checkin";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import MobileNavigation from "@/components/mobile-navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary"></div>
          <p className="mt-4 text-sm font-medium">Đang khởi tạo hệ thống...</p>
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
      <SidebarInset className="min-h-svh bg-muted/20">
        <Navbar />
        <div className="flex-1 overflow-y-auto pb-24 md:pb-6">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/events" component={Events} />
            <Route path="/students" component={Students} />
            <Route path="/checkin" component={Checkin} />
            <Route path="/admin" component={AdminPage} />
            <Route component={NotFound} />
          </Switch>
        </div>
        <MobileNavigation />
      </SidebarInset>
    </SidebarProvider>
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
