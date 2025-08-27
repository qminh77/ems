import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X } from "lucide-react";
import type { User } from "@shared/schema";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth() as { user: User | null };
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
      {/* Mobile header */}
      <div className="lg:hidden bg-white/80 backdrop-blur-md shadow-lg border-b fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 text-gray-600 hover:text-primary hover:bg-primary/10 rounded-xl transition-all transform hover:scale-105"
            data-testid="button-mobile-menu"
          >
            <i className="fas fa-bars text-xl"></i>
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-md">
              <i className="fas fa-graduation-cap text-white text-lg"></i>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">EMS Admin</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 gradient-primary rounded-full flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-bold">
                {(user as any)?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-all duration-300 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="sidebar"
      >
        {/* Header */}
        <div className="flex items-center justify-between h-20 gradient-primary px-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center shadow-lg">
              <i className="fas fa-graduation-cap text-white text-xl"></i>
            </div>
            <span className="text-white font-bold text-xl">EMS Admin</span>
          </div>
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-white hover:bg-white/20 p-2 rounded-xl transition-all transform hover:scale-110"
            data-testid="button-close-sidebar"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="mt-8" data-testid="sidebar-navigation">
          <div className="px-5 space-y-2">
            {navigation.map((item) => (
              <button
                key={item.page}
                onClick={() => {
                  setLocation(item.href);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-5 py-3.5 rounded-xl transition-all transform hover:scale-[1.02] ${
                  isActive(item.page) 
                    ? 'gradient-primary text-white shadow-lg' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                data-testid={`nav-${item.page.replace('/', '') || 'dashboard'}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isActive(item.page) ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  <i className={`${item.icon} ${
                    isActive(item.page) ? 'text-white' : 'text-gray-600'
                  }`}></i>
                </div>
                <span className="font-semibold">{item.name}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-6 left-5 right-5">
          <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-bold" data-testid="user-initials">
                {(user as any)?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate" data-testid="user-name">
                {(user as any)?.firstName && (user as any)?.lastName 
                  ? `${(user as any).firstName} ${(user as any).lastName}` 
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
              className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all transform hover:scale-110"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
          data-testid="mobile-overlay"
        ></div>
      )}
    </>
  );
}
