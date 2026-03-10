import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Tổng quan",
    subtitle: "Theo dõi trạng thái hệ thống sự kiện",
  },
  "/events": {
    title: "Quản lý sự kiện",
    subtitle: "Tạo, chỉnh sửa và theo dõi sự kiện",
  },
  "/students": {
    title: "Quản lý sinh viên",
    subtitle: "Tổ chức danh sách tham dự theo sự kiện",
  },
  "/checkin": {
    title: "Check-in/Check-out",
    subtitle: "Ghi nhận điểm danh bằng QR theo thời gian thực",
  },
};

export default function Navbar() {
  const [location] = useLocation();
  const { user } = useAuth() as { user?: any };

  const currentPage = pageMeta[location] ?? {
    title: "EMS",
    subtitle: "Event Management System",
  };

  const initials = user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U";
  const displayName = user?.firstName || user?.email || "User";

  return (
    <header
      className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      data-testid="navbar"
    >
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <SidebarTrigger data-testid="button-mobile-menu" />
        <Separator orientation="vertical" className="hidden h-6 sm:block" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{currentPage.title}</p>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">{currentPage.subtitle}</p>
        </div>

        <div className="hidden max-w-[180px] text-right sm:block">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
        </div>

        <Avatar className="h-9 w-9 border">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
