import { useLocation } from "wouter";
import { BarChart3, Calendar, QrCode, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export default function MobileNavigation() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth() as { user?: any };

  const navigation = [
    { name: "Tổng quan", href: "/", icon: BarChart3, page: "/" },
    { name: "Sự kiện", href: "/events", icon: Calendar, page: "/events" },
    { name: "Sinh viên", href: "/students", icon: Users, page: "/students" },
    { name: "Check-in", href: "/checkin", icon: QrCode, page: "/checkin" },
    ...(user?.isAdmin ? [{ name: "Admin", href: "/admin", icon: Settings, page: "/admin" }] : []),
  ];

  const isActive = (page: string) => {
    return location === page;
  };

  return (
    <div className="fixed inset-x-0 bottom-3 z-40 px-3 md:hidden safe-area-pb" data-testid="mobile-navigation">
      <div className="mx-auto max-w-md rounded-xl border bg-background p-1.5">
        <div className={cn("grid h-14 gap-1", user?.isAdmin ? "grid-cols-5" : "grid-cols-4")}>
        {navigation.map((item) => (
          <Button
            key={item.page}
            onClick={() => setLocation(item.href)}
            variant="ghost"
            className={cn(
              "h-auto rounded-xl px-1.5 py-1.5 transition-all",
              "flex flex-col items-center justify-center gap-1",
              isActive(item.page)
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            data-testid={`mobile-nav-${item.page.replace('/', '') || 'dashboard'}`}
          >
            <item.icon className="h-4 w-4" />
            <span className="text-[11px] font-medium leading-none">{item.name}</span>
          </Button>
        ))}
        </div>
      </div>
    </div>
  );
}
