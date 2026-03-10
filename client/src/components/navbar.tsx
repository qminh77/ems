import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useWebSocket } from "@/hooks/useWebSocket";
import { usePublicSystemSettings } from "@/hooks/useSystemSettings";
import { Bell, CalendarPlus, Search, Wifi, WifiOff } from "lucide-react";

const pageMeta: Record<string, { title: string }> = {
  "/": { title: "Dashboard" },
  "/events": { title: "Sự kiện" },
  "/students": { title: "Sinh viên" },
  "/checkin": { title: "Check-in" },
  "/admin": { title: "AdminCP" },
};

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth() as { user?: any };
  const { isConnected } = useWebSocket();
  const { data: systemSettings } = usePublicSystemSettings();
  const canCreateEvents = Boolean(user?.canCreateEvents) || Boolean(user?.isAdmin);

  const currentPage = pageMeta[location] ?? {
    title: "EMS",
  };

  const initials = user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80" data-testid="navbar">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <SidebarTrigger className="h-8 w-8" data-testid="button-mobile-menu" />
        <Separator orientation="vertical" className="mx-1 h-5" />

        <div className="hidden min-w-0 flex-1 md:flex">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Tìm sự kiện, sinh viên, mã QR..." className="h-9 pl-9" />
          </div>
        </div>

        <Badge variant={isConnected ? "default" : "secondary"} className="hidden gap-1.5 sm:inline-flex">
          {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {isConnected ? "Realtime" : "Polling"}
        </Badge>

        <Button
          variant="outline"
          size="sm"
          className="hidden gap-2 md:inline-flex"
          onClick={() => setLocation("/events")}
          disabled={!canCreateEvents}
          title={canCreateEvents ? "Tạo sự kiện" : "Tài khoản không có quyền tạo sự kiện"}
        >
          <CalendarPlus className="h-4 w-4" />
          Tạo sự kiện
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[140px] truncate text-sm sm:inline">{user?.email || "User"}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{user?.email || "user@example.com"}</DropdownMenuItem>
            {user?.isAdmin && <DropdownMenuItem onClick={() => setLocation("/admin")}>AdminCP</DropdownMenuItem>}
            <DropdownMenuItem onClick={() => (window.location.href = "/api/logout")}>Đăng xuất</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-4 pb-3 sm:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>{systemSettings?.systemName || "EMS Platform"}</BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentPage.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
