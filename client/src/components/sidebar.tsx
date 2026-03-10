import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BarChart3, Calendar, LogOut, QrCode, Users } from "lucide-react";
import type { User } from "@shared/schema";

const navigation = [
  { name: "Tổng quan", href: "/", page: "/", icon: BarChart3 },
  { name: "Quản lý sự kiện", href: "/events", page: "/events", icon: Calendar },
  { name: "Quản lý sinh viên", href: "/students", page: "/students", icon: Users },
  { name: "Check-in/out", href: "/checkin", page: "/checkin", icon: QrCode },
];

export default function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth() as { user: User | null };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const isActive = (page: string) => location === page;
  const initials = (user as any)?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <Sidebar collapsible="icon" className="border-r" data-testid="sidebar">
      <SidebarHeader className="border-b px-2 py-3">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-muted text-foreground">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-semibold">EMS</p>
              <p className="text-xs text-muted-foreground">Event Management</p>
            </div>
          </div>
          <Badge variant="secondary" className="group-data-[collapsible=icon]:hidden">
            v1
          </Badge>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[11px] uppercase tracking-wide text-muted-foreground group-data-[collapsible=icon]:hidden">
            Navigation
          </SidebarGroupLabel>
          <SidebarMenu data-testid="sidebar-navigation">
            {navigation.map((item) => (
              <SidebarMenuItem key={item.page}>
                <SidebarMenuButton
                  isActive={isActive(item.page)}
                  onClick={() => setLocation(item.href)}
                  tooltip={item.name}
                  data-testid={`nav-${item.page.replace("/", "") || "dashboard"}`}
                >
                  <item.icon />
                  <span>{item.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <div className="flex items-center gap-2 rounded-md border p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:p-0">
          <Avatar className="h-8 w-8">
            <AvatarFallback data-testid="user-initials">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium" data-testid="user-name">
              {(user as any)?.firstName && (user as any)?.lastName
                ? `${(user as any).firstName} ${(user as any).lastName}`
                : user?.email || "User"}
            </p>
            <p className="truncate text-xs text-muted-foreground" data-testid="user-email">
              {user?.email || "user@example.com"}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          data-testid="button-logout"
          className="mt-2 w-full justify-start gap-2 group-data-[collapsible=icon]:hidden"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          title="Đăng xuất"
          className="hidden h-8 w-8 group-data-[collapsible=icon]:inline-flex"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
