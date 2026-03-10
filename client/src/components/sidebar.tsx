import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { usePublicSystemSettings } from "@/hooks/useSystemSettings";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Calendar,
  CalendarClock,
  CirclePlus,
  LayoutGrid,
  LogOut,
  Settings,
  QrCode,
  Users,
} from "lucide-react";
import type { User } from "@shared/schema";

const mainNav = [
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "Sự kiện", href: "/events", icon: Calendar },
  { label: "Sinh viên", href: "/students", icon: Users },
  { label: "Check-in", href: "/checkin", icon: QrCode },
];

const quickLinks = [
  { label: "Lịch sự kiện", href: "/events", icon: CalendarClock },
  { label: "Báo cáo nhanh", href: "/", icon: BarChart3 },
];

export default function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth() as { user: User | null };
  const { data: systemSettings } = usePublicSystemSettings();

  const isAdmin = Boolean((user as any)?.isAdmin);
  const canCreateEvents = Boolean((user as any)?.canCreateEvents) || isAdmin;

  const initials = (user as any)?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U";
  const fullName =
    (user as any)?.firstName && (user as any)?.lastName
      ? `${(user as any).firstName} ${(user as any).lastName}`
      : user?.email || "User";

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const isActive = (href: string) => location === href;

  return (
    <Sidebar collapsible="icon" variant="inset" data-testid="sidebar">
      <SidebarHeader className="gap-3 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
              <SidebarMenuButton className="h-11" isActive onClick={() => setLocation("/")}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-background">
                {systemSettings?.logoUrl ? (
                  <img src={systemSettings.logoUrl} alt="logo" className="h-5 w-5 rounded object-contain" />
                ) : (
                  <CalendarClock className="h-4 w-4" />
                )}
              </div>
                <div className="grid text-left">
                  <span className="text-sm font-semibold leading-none">{systemSettings?.systemName || "EMS Platform"}</span>
                  <span className="text-xs text-muted-foreground">Workspace</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>

        <Button
          className="h-9 w-full justify-start gap-2 group-data-[collapsible=icon]:hidden"
          onClick={() => setLocation("/events")}
          disabled={!canCreateEvents}
          title={canCreateEvents ? "Tạo sự kiện" : "Tài khoản không có quyền tạo sự kiện"}
        >
          <CirclePlus className="h-4 w-4" />
          Tạo sự kiện
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel>Điều hướng chính</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                    onClick={() => setLocation(item.href)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              {isAdmin && (
                <SidebarMenuItem key="/admin">
                  <SidebarMenuButton
                    isActive={isActive("/admin")}
                    tooltip="AdminCP"
                    onClick={() => setLocation("/admin")}
                  >
                    <Settings />
                    <span>AdminCP</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Truy cập nhanh</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {quickLinks.map((item) => (
                <SidebarMenuItem key={item.href + item.label}>
                  <SidebarMenuButton onClick={() => setLocation(item.href)} tooltip={item.label}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <div className="rounded-lg border bg-background p-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium">{fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email || "user@example.com"}</p>
            </div>
            <Badge variant="secondary" className="group-data-[collapsible=icon]:hidden">Online</Badge>
          </div>
        </div>

        <Button
          variant="outline"
          className="mt-2 w-full justify-start gap-2 group-data-[collapsible=icon]:hidden"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
