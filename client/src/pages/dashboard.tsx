import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  if (statsLoading) {
    return (
      <div className="p-6 animate-fade-in" data-testid="dashboard-loading">
        <div className="mb-8">
          <div className="h-10 skeleton rounded-lg w-1/3 mb-3"></div>
          <div className="h-6 skeleton rounded-lg w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 skeleton rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  const recentEvents = events?.slice(0, 3) || [];

  return (
    <div className="p-6 animate-fade-in" data-testid="page-dashboard">
      <div className="mb-8 animate-slide-up">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Tổng quan hệ thống</h1>
        <p className="text-gray-600 mt-2 text-lg">Quản lý sự kiện và sinh viên một cách hiệu quả</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-md hover-lift group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Tổng sự kiện</p>
                <p className="text-4xl font-bold text-gray-900 group-hover:scale-105 transition-transform" data-testid="stat-total-events">
                  {stats?.totalEvents || 0}
                </p>
              </div>
              <div className="w-14 h-14 gradient-primary rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <i className="fas fa-calendar-alt text-white text-xl"></i>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">↑ 12%</span>
              <span className="text-gray-600">so với tháng trước</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover-lift group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Sinh viên đăng ký</p>
                <p className="text-4xl font-bold text-gray-900 group-hover:scale-105 transition-transform" data-testid="stat-total-students">
                  {stats?.totalStudents || 0}
                </p>
              </div>
              <div className="w-14 h-14 gradient-secondary rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <i className="fas fa-users text-white text-xl"></i>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">↑ 8%</span>
              <span className="text-gray-600">so với tháng trước</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover-lift group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Check-in hôm nay</p>
                <p className="text-4xl font-bold text-gray-900 group-hover:scale-105 transition-transform" data-testid="stat-today-checkins">
                  {stats?.todayCheckins || 0}
                </p>
              </div>
              <div className="w-14 h-14 gradient-accent rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <i className="fas fa-qrcode text-white text-xl"></i>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">↑ 15%</span>
              <span className="text-gray-600">so với hôm qua</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md hover-lift group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Sự kiện hoạt động</p>
                <p className="text-4xl font-bold text-gray-900 group-hover:scale-105 transition-transform" data-testid="stat-active-events">
                  {stats?.activeEvents || 0}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <i className="fas fa-play-circle text-white text-xl"></i>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold animate-pulse">● Đang diễn ra</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card className="border-0 shadow-md animate-slide-up" style={{animationDelay: '0.2s'}}>
        <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-white rounded-t-xl">
          <CardTitle className="text-xl font-bold text-gray-900">Sự kiện gần đây</CardTitle>
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
                  className="flex items-center justify-between py-4 px-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                  data-testid={`recent-event-${index}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center shadow-md">
                      <i className="fas fa-calendar text-white"></i>
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
                    <span className="px-3 py-1 bg-gradient-to-r from-secondary/10 to-secondary/5 text-secondary text-sm font-semibold rounded-full">
                      {event.location}
                    </span>
                    <button className="text-gray-400 hover:text-primary transition-colors" data-testid={`view-event-${index}`}>
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
