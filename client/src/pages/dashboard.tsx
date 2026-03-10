import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Calendar, CalendarCheck2, ChevronRight, PlayCircle, QrCode, Users, Wifi, WifiOff } from "lucide-react";

export default function Dashboard() {
  const { isConnected } = useWebSocket();

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: isConnected ? false : 10000,
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
    refetchInterval: isConnected ? false : 10000,
  });

  if (statsLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6" data-testid="dashboard-loading">
        <div className="mb-8 space-y-3">
          <div className="h-10 w-1/3 animate-pulse rounded-md bg-muted" />
          <div className="h-5 w-1/2 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const recentEvents = events?.slice(0, 3) || [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6" data-testid="page-dashboard">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tổng quan hệ thống</h1>
          <p className="mt-2 text-muted-foreground">Quản lý sự kiện và sinh viên một cách hiệu quả</p>
        </div>
        <Badge variant={isConnected ? "default" : "secondary"} className="w-fit gap-1">
          {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {isConnected ? "Realtime" : "Polling"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Tổng sự kiện</p>
                <p className="text-3xl font-semibold" data-testid="stat-total-events">
                  {stats?.totalEvents || 0}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Cập nhật theo thời gian thực</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Sinh viên đăng ký</p>
                <p className="text-3xl font-semibold" data-testid="stat-total-students">
                  {stats?.totalStudents || 0}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Dữ liệu đồng bộ tự động</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Check-in hôm nay</p>
                <p className="text-3xl font-semibold" data-testid="stat-today-checkins">
                  {stats?.todayCheckins || 0}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted">
                <QrCode className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Tổng số lượt ghi nhận hôm nay</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Sự kiện hoạt động</p>
                <p className="text-3xl font-semibold" data-testid="stat-active-events">
                  {stats?.activeEvents || 0}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted">
                <PlayCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="secondary">Đang diễn ra</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-xl">Sự kiện gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground" data-testid="no-events">
              <CalendarCheck2 className="mx-auto mb-4 h-10 w-10" />
              <p>Chưa có sự kiện nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event: any, index: number) => (
                <div
                  key={event.id}
                  className="flex cursor-pointer flex-col gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                  data-testid={`recent-event-${index}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-medium" data-testid={`event-name-${index}`}>
                        {event.name}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid={`event-date-${index}`}>
                        {new Date(event.eventDate).toLocaleDateString("vi-VN")} - {event.startTime}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary" className="max-w-[220px] truncate font-medium">
                      {event.location}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`view-event-${index}`}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
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
