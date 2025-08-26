import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navigation = [
    { name: "Tổng quan", href: "/", icon: "fas fa-chart-bar", page: "/" },
    { name: "Quản lý sự kiện", href: "/events", icon: "fas fa-calendar-alt", page: "/events" },
    { name: "Quản lý sinh viên", href: "/students", icon: "fas fa-users", page: "/students" },
    { name: "Check-in/out", href: "/checkin", icon: "fas fa-qrcode", page: "/checkin" },
  ];

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const isActive = (page: string) => {
    return location === page;
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="text-gray-600 hover:text-gray-900"
            data-testid="button-mobile-menu"
          >
            <i className="fas fa-bars text-xl"></i>
          </button>
          <div className="flex items-center space-x-2">
            <i className="fas fa-graduation-cap text-primary text-xl"></i>
            <span className="font-bold text-lg">EMS Admin</span>
          </div>
          <div className="w-6"></div>
        </div>
      </div>

      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="sidebar"
      >
        {/* Header */}
        <div className="flex items-center justify-center h-16 bg-primary">
          <div className="flex items-center space-x-2">
            <i className="fas fa-graduation-cap text-white text-xl"></i>
            <span className="text-white font-bold text-lg">EMS Admin</span>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="mt-8" data-testid="sidebar-navigation">
          <div className="px-4 space-y-2">
            {navigation.map((item) => (
              <button
                key={item.page}
                onClick={() => {
                  setLocation(item.href);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors ${
                  isActive(item.page) 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-gray-700'
                }`}
                data-testid={`nav-${item.page.replace('/', '') || 'dashboard'}`}
              >
                <i className={`${item.icon} text-gray-500`}></i>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium" data-testid="user-initials">
                {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate" data-testid="user-name">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user?.email || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate" data-testid="user-email">
                {user?.email || 'user@example.com'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 p-1"
              data-testid="button-logout"
            >
              <i className="fas fa-sign-out-alt"></i>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
          data-testid="mobile-overlay"
        ></div>
      )}
    </>
  );
}
