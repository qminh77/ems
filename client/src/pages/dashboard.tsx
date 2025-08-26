import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading, error } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
  });

  const { data: events } = useQuery({
    queryKey: ["/api/events"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  if (statsLoading) {
    return (
      <div className="p-6" data-testid="dashboard-loading">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const recentEvents = events?.slice(0, 3) || [];

  return (
    <div className="p-6" data-testid="page-dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tổng quan hệ thống</h1>
        <p className="text-gray-600 mt-2">Quản lý sự kiện và sinh viên một cách hiệu quả</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <Card className="border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tổng sự kiện</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="stat-total-events">
                  {stats?.totalEvents || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-calendar-alt text-primary text-xl"></i>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-secondary font-medium">+12%</span>
              <span className="text-gray-600 ml-2">so với tháng trước</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sinh viên đăng ký</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="stat-total-students">
                  {stats?.totalStudents || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-users text-secondary text-xl"></i>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-secondary font-medium">+8%</span>
              <span className="text-gray-600 ml-2">so với tháng trước</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Check-in hôm nay</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="stat-today-checkins">
                  {stats?.todayCheckins || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-qrcode text-accent text-xl"></i>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-secondary font-medium">+15%</span>
              <span className="text-gray-600 ml-2">so với hôm qua</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sự kiện hoạt động</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="stat-active-events">
                  {stats?.activeEvents || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-play-circle text-green-600 text-xl"></i>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">Đang diễn ra</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card className="border border-gray-100">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900">Sự kiện gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid="no-events">
              <i className="fas fa-calendar-alt text-4xl mb-4"></i>
              <p>Chưa có sự kiện nào</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentEvents.map((event: any, index: number) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between py-4 border-b border-gray-50 last:border-b-0"
                  data-testid={`recent-event-${index}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <i className="fas fa-calendar text-primary"></i>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900" data-testid={`event-name-${index}`}>
                        {event.name}
                      </h3>
                      <p className="text-sm text-gray-600" data-testid={`event-date-${index}`}>
                        {new Date(event.eventDate).toLocaleDateString('vi-VN')} - {event.startTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="px-3 py-1 bg-secondary/10 text-secondary text-sm font-medium rounded-full">
                      {event.location}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600" data-testid={`view-event-${index}`}>
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
