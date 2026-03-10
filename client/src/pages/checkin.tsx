import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import QRScanner from "@/components/qr-scanner";
import { useWebSocket } from "@/hooks/useWebSocket";
import { RealTimeIndicator } from "@/components/real-time-indicator";
import {
  Check,
  Clock3,
  Loader2,
  LogIn,
  LogOut,
  QrCode,
  ScanLine,
  User,
  Wifi,
  WifiOff,
  History,
} from "lucide-react";

export default function Checkin() {
  const [manualCode, setManualCode] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [realtimeUpdate, setRealtimeUpdate] = useState<any>(null);

  const { toast } = useToast();
  const { isConnected, lastMessage } = useWebSocket();

  const { data: recentCheckins = [] } = useQuery<any[]>({
    queryKey: ["/api/checkin/recent"],
    refetchInterval: isConnected ? false : 5000,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
  });

  const checkinMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      const response = await apiRequest("POST", "/api/checkin", { qrCode });
      return response.json();
    },
    onSuccess: (data) => {
      setLastResult(data);
      if (!isConnected) {
        queryClient.invalidateQueries({ queryKey: ["/api/checkin/recent"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      }
      toast({
        title: "Thành công",
        description: data.message,
      });
      setManualCode("");
      setScanCooldown(true);
      setTimeout(() => setScanCooldown(false), 3000);
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Mã QR không hợp lệ hoặc đã được sử dụng",
        variant: "destructive",
      });
      setScanCooldown(true);
      setTimeout(() => setScanCooldown(false), 1500);
    },
  });

  const handleManualCheckin = () => {
    if (manualCode.trim()) {
      checkinMutation.mutate(manualCode.trim());
    }
  };

  const handleQRScanned = (qrCode: string) => {
    setScannerActive(false);
    checkinMutation.mutate(qrCode);
  };

  const getActionColor = (action: string) => {
    return action === "check_in" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground";
  };

  const getActionText = (action: string) => {
    return action === "check_in" ? "Check-in" : "Check-out";
  };

  const getActionIcon = (action: string) => {
    return action === "check_in" ? LogIn : LogOut;
  };

  useEffect(() => {
    if (lastMessage?.type === "checkin_update" && lastMessage?.data) {
      setRealtimeUpdate({
        action: lastMessage.data.action,
        attendeeName: lastMessage.data.attendee.name,
        studentId: lastMessage.data.attendee.studentId,
        timestamp: lastMessage.data.timestamp,
      });
      setTimeout(() => setRealtimeUpdate(null), 6000);
    }
  }, [lastMessage]);

  const checkoutsToday = useMemo(
    () =>
      recentCheckins.filter(
        (c: any) => c.action === "check_out" && new Date(c.timestamp).toDateString() === new Date().toDateString()
      ).length,
    [recentCheckins]
  );

  const currentAttendees = Math.max((stats?.todayCheckins || 0) - checkoutsToday, 0);

  const resultPanel = (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Kết quả gần nhất</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {lastResult ? (
          <div className="space-y-3" data-testid="checkin-result">
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Người tham dự</p>
              <p className="mt-1 text-base font-semibold" data-testid="result-student-name">{lastResult.attendee.name}</p>
              <p className="text-sm text-muted-foreground" data-testid="result-student-id">MSSV/MSNV: {lastResult.attendee.studentId || "-"}</p>
              <p className="text-sm text-muted-foreground" data-testid="result-email">Email: {lastResult.attendee.email || "-"}</p>
              <Separator className="my-3" />
              <p className="text-sm font-medium" data-testid="result-status">{lastResult.message}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-lg border p-3 text-sm">
              <div>
                <p className="text-muted-foreground">Sự kiện</p>
                <p className="font-medium" data-testid="result-event-name">{lastResult.event.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Trạng thái</p>
                <Badge className={getActionColor(lastResult.action)} data-testid="result-action">{getActionText(lastResult.action)}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Thời gian</p>
                <p className="font-medium" data-testid="result-time">{new Date().toLocaleTimeString("vi-VN")}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground" data-testid="no-recent-result">
            <QrCode className="mx-auto mb-3 h-8 w-8" />
            <p>Chưa có kết quả check-in gần nhất.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const activityPanel = (
    <Card>
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Lịch sử gần nhất</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[560px] space-y-2 overflow-auto pt-4" data-testid="recent-checkins">
        {recentCheckins.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-muted-foreground" data-testid="no-recent-checkins">
            <p>Chưa có check-in nào hôm nay.</p>
          </div>
        ) : (
          recentCheckins.slice(0, 20).map((checkin: any, index: number) => (
            <div key={checkin.id} className="rounded-lg border p-3" data-testid={`recent-checkin-${index}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" data-testid={`checkin-name-${index}`}>{checkin.attendee.name}</p>
                  <p className="text-xs text-muted-foreground" data-testid={`checkin-id-${index}`}>
                    {checkin.attendee.studentId || "-"}
                    {checkin.attendee.faculty ? ` - ${checkin.attendee.faculty}` : ""}
                  </p>
                </div>
                <Badge className={getActionColor(checkin.action)} data-testid={`checkin-action-${index}`}>
                  {(() => {
                    const Icon = getActionIcon(checkin.action);
                    return <Icon className="mr-1 h-3 w-3" />;
                  })()}
                  {getActionText(checkin.action)}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground" data-testid={`checkin-time-${index}`}>
                {new Date(checkin.timestamp).toLocaleDateString("vi-VN")} - {new Date(checkin.timestamp).toLocaleTimeString("vi-VN")}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="page-shell" data-testid="page-checkin">
      {realtimeUpdate && <RealTimeIndicator {...realtimeUpdate} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Check-in</h1>
        <Badge variant={isConnected ? "default" : "secondary"} className="w-fit gap-1.5">
          {isConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {isConnected ? "Realtime đang bật" : "Realtime tạm ngắt"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tổng check-in hôm nay</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-2xl font-semibold sm:text-3xl" data-testid="stat-today-checkins">{stats?.todayCheckins || 0}</p>
              <LogIn className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Check-out hôm nay</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-2xl font-semibold sm:text-3xl" data-testid="stat-today-checkouts">{checkoutsToday}</p>
              <LogOut className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Đang tham dự</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-2xl font-semibold sm:text-3xl" data-testid="stat-current-attendees">{currentAttendees}</p>
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base">Trạm quét QR</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs defaultValue="scan" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="scan" className="gap-2">
                  <ScanLine className="h-4 w-4" />
                  Quét camera
                </TabsTrigger>
                <TabsTrigger value="manual" className="gap-2">
                  <QrCode className="h-4 w-4" />
                  Nhập mã tay
                </TabsTrigger>
              </TabsList>

              <TabsContent value="scan" className="space-y-4">
                <QRScanner
                  active={scannerActive}
                  onScan={handleQRScanned}
                  onActivate={() => !scanCooldown && setScannerActive(true)}
                  onDeactivate={() => setScannerActive(false)}
                />

                {scanCooldown && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-center text-sm text-muted-foreground">
                    <Clock3 className="mr-2 inline h-4 w-4" />
                    Hệ thống đang cooldown. Vui lòng quét mã tiếp theo sau vài giây.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="manual" className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type="text"
                    placeholder="Nhập mã QR..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleManualCheckin()}
                    className="flex-1"
                    data-testid="input-manual-qr"
                  />
                  <Button
                    onClick={handleManualCheckin}
                    disabled={!manualCode.trim() || checkinMutation.isPending}
                    className="sm:w-28"
                    data-testid="button-manual-checkin"
                  >
                    {checkinMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Xác nhận
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="hidden xl:block">{resultPanel}</div>
          <div className="hidden xl:block">{activityPanel}</div>

          <Card className="xl:hidden">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-base">Thông tin check-in</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs defaultValue="result" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="result" className="gap-2">
                    <QrCode className="h-4 w-4" />
                    Kết quả
                  </TabsTrigger>
                  <TabsTrigger value="history" className="gap-2">
                    <History className="h-4 w-4" />
                    Lịch sử
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="result" className="mt-0">{resultPanel}</TabsContent>
                <TabsContent value="history" className="mt-0">{activityPanel}</TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
