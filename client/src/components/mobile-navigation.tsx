import { useLocation } from "wouter";
import { BarChart3, Calendar, QrCode, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MobileNavigation() {
  const [location, setLocation] = useLocation();

  const navigation = [
    { name: "Tổng quan", href: "/", icon: BarChart3, page: "/" },
    { name: "Sự kiện", href: "/events", icon: Calendar, page: "/events" },
    { name: "Sinh viên", href: "/students", icon: Users, page: "/students" },
    { name: "Check-in", href: "/checkin", icon: QrCode, page: "/checkin" },
  ];

  const isActive = (page: string) => {
    return location === page;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden safe-area-pb" data-testid="mobile-navigation">
      <div className="grid grid-cols-4 h-16">
        {navigation.map((item) => (
          <Button
            key={item.page}
            onClick={() => setLocation(item.href)}
            variant="ghost"
            className={`h-auto rounded-none flex flex-col items-center justify-center space-y-1 transition-colors ${
              isActive(item.page) 
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid={`mobile-nav-${item.page.replace('/', '') || 'dashboard'}`}
          >
            <item.icon className="h-4 w-4" />
            <span className="text-xs font-medium">{item.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
