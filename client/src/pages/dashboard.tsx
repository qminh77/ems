import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  ArrowRight,
  Calendar,
  CalendarCheck2,
  Clock3,
  FolderKanban,
  PlayCircle,
  QrCode,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { isConnected } = useWebSocket();

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: isConnected ? false : 10000,
  });

  const { data: events = [] } = useQuery<any[]>({
    queryKey: ["/api/events"],
    refetchInterval: isConnected ? false : 10000,
  });

  const { data: recentCheckins = [] } = useQuery<any[]>({
    queryKey: ["/api/checkin/recent"],
    refetchInterval: isConnected ? false : 10000,
  });

  if (statsLoading) {
    return (
      <div className="page-shell" data-testid="dashboard-loading">
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-5 h-8 w-1/3 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  const recentEvents = events?.slice(0, 4) || [];
  const checkinChartData = useMemo(() => {
    const buckets = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (5 - i));
      return {
        label: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        key: d.toDateString(),
        checkin: 0,
      };
    });

    recentCheckins.forEach((item: any) => {
      const key = new Date(item.timestamp).toDateString();
      const bucket = buckets.find((b) => b.key === key);
      if (bucket && item.action === "check_in") {
        bucket.checkin += 1;
      }
    });

    return buckets.map(({ label, checkin }) => ({ label, checkin }));
  }, [recentCheckins]);

  const chartConfig = {
    checkin: {
      label: "Check-in",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  return (
    <div className="page-shell" data-testid="page-dashboard">
      <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="page-title">Tổng quan hệ thống</h1>
            <p className="page-description">Theo dõi vận hành sự kiện, điểm danh và dữ liệu sinh viên theo thời gian thực.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"} className="gap-1.5">
              {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {isConnected ? "WebSocket đang kết nối" : "Đang dùng polling"}
            </Badge>
            <Button variant="outline" onClick={() => setLocation("/events")} className="gap-2">
              Quản lý sự kiện
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng sự kiện</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-semibold" data-testid="stat-total-events">
                {stats?.totalEvents || 0}
              </p>
              <div className="rounded-lg border bg-muted p-2.5">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sinh viên đăng ký</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-semibold" data-testid="stat-total-students">
                {stats?.totalStudents || 0}
              </p>
              <div className="rounded-lg border bg-muted p-2.5">
                <Users className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Check-in hôm nay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-semibold" data-testid="stat-today-checkins">
                {stats?.todayCheckins || 0}
              </p>
              <div className="rounded-lg border bg-muted p-2.5">
                <QrCode className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sự kiện hoạt động</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-semibold" data-testid="stat-active-events">
                {stats?.activeEvents || 0}
              </p>
              <div className="rounded-lg border bg-muted p-2.5">
                <PlayCircle className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Điều phối sự kiện</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Tạo lịch mới, cập nhật địa điểm và theo dõi trạng thái từng sự kiện.</p>
            <Button className="w-full justify-between" variant="outline" onClick={() => setLocation("/events")}>
              Mở quản lý sự kiện
              <FolderKanban className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quản lý danh sách tham dự</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Quản lý sinh viên, import/export Excel và phân quyền cộng tác viên theo sự kiện.</p>
            <Button className="w-full justify-between" variant="outline" onClick={() => setLocation("/students")}>
              Mở quản lý sinh viên
              <Users className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vận hành check-in trực tiếp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Quét QR theo thời gian thực, theo dõi kết quả tức thì và lịch sử check-in.</p>
            <Button className="w-full justify-between" variant="outline" onClick={() => setLocation("/checkin")}>
              Mở màn hình check-in
              <QrCode className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="shadow-sm xl:col-span-2">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Xu hướng check-in 6 ngày gần nhất</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart accessibilityLayer data={checkinChartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} tickMargin={10} axisLine={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="checkin" fill="var(--color-checkin)" radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Sự kiện gần đây</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {recentEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground" data-testid="no-events">
                <CalendarCheck2 className="mx-auto mb-3 h-10 w-10" />
                <p>Chưa có sự kiện nào trong hệ thống.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentEvents.map((event: any, index: number) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setLocation(`/students?eventId=${event.id}`)}
                    className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted/40"
                    data-testid={`recent-event-${index}`}
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium" data-testid={`event-name-${index}`}>
                        {event.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span data-testid={`event-date-${index}`}>
                            {new Date(event.eventDate).toLocaleDateString("vi-VN")}
                          </span>
                        </span>
                        {event.startTime && (
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {event.startTime}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="max-w-[180px] truncate font-normal">
                      {event.location || "Chưa có địa điểm"}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Nhịp vận hành</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Tỉ lệ hoạt động sự kiện</p>
              <p className="mt-2 text-2xl font-semibold">
                {stats?.totalEvents ? Math.round(((stats?.activeEvents || 0) / stats.totalEvents) * 100) : 0}%
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Mức độ tham gia trong ngày</p>
              <p className="mt-2 text-2xl font-semibold">
                {stats?.totalStudents ? Math.round(((stats?.todayCheckins || 0) / stats.totalStudents) * 100) : 0}%
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setLocation("/checkin")}>Chuyển tới Check-in/Check-out</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
