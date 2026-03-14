import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import MobileNavigation from "@/components/mobile-navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const LoginPage = lazy(() => import("@/pages/login"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Events = lazy(() => import("@/pages/events"));
const Students = lazy(() => import("@/pages/students"));
const Checkin = lazy(() => import("@/pages/checkin"));
const AdminPage = lazy(() => import("@/pages/admin"));
const NotFound = lazy(() => import("@/pages/not-found"));

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[60svh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Dang tai trang...</p>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-muted border-t-primary"></div>
          <p className="mt-4 text-sm font-medium">Đang khởi tạo hệ thống...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login page
  // Check both error and authentication status
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <LoginPage />
      </Suspense>
    );
  }

  // If authenticated, show main app
  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset className="min-h-svh min-w-0 bg-muted/20">
        <Navbar />
        <div className="flex-1 min-w-0 overflow-y-auto pb-24 md:pb-6">
          <Suspense fallback={<RouteLoadingFallback />}>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/login" component={Dashboard} />
              <Route path="/events" component={Events} />
              <Route path="/students" component={Students} />
              <Route path="/checkin" component={Checkin} />
              <Route path="/admin" component={AdminPage} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
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
