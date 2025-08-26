import { useLocation } from "wouter";

export default function MobileNavigation() {
  const [location, setLocation] = useLocation();

  const navigation = [
    { name: "Tổng quan", href: "/", icon: "fas fa-chart-bar", page: "/" },
    { name: "Sự kiện", href: "/events", icon: "fas fa-calendar-alt", page: "/events" },
    { name: "Sinh viên", href: "/students", icon: "fas fa-users", page: "/students" },
    { name: "Check-in", href: "/checkin", icon: "fas fa-qrcode", page: "/checkin" },
  ];

  const isActive = (page: string) => {
    return location === page;
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb" data-testid="mobile-navigation">
      <div className="grid grid-cols-4 h-16">
        {navigation.map((item) => (
          <button
            key={item.page}
            onClick={() => setLocation(item.href)}
            className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
              isActive(item.page) 
                ? 'text-primary bg-primary/5' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            data-testid={`mobile-nav-${item.page.replace('/', '') || 'dashboard'}`}
          >
            <i className={`${item.icon} text-sm`}></i>
            <span className="text-xs font-medium">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}