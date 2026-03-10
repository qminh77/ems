import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import QRScanner from "@/components/qr-scanner";
import { useWebSocket } from "@/hooks/useWebSocket";
import { RealTimeIndicator } from "@/components/real-time-indicator";
import { Check, Clock3, Loader2, LogIn, LogOut, QrCode, User } from "lucide-react";

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
    refetchInterval: isConnected ? false : 5000, // Only poll if WebSocket is not connected
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
      
      // Thêm cooldown 3 giây sau khi quét thành công
      setScanCooldown(true);
      setTimeout(() => {
        setScanCooldown(false);
      }, 3000);
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: "Mã QR không hợp lệ hoặc đã được sử dụng",
        variant: "destructive",
      });
      
      // Thêm cooldown ngắn hơn khi lỗi (1.5 giây)
      setScanCooldown(true);
      setTimeout(() => {
        setScanCooldown(false);
      }, 1500);
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
    return action === 'check_in' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground';
  };

  const getActionText = (action: string) => {
    return action === 'check_in' ? 'Check-in' : 'Check-out';
  };

  const getActionIcon = (action: string) => {
    return action === 'check_in' ? LogIn : LogOut;
  };

  // Handle real-time updates from WebSocket
  useEffect(() => {
    if (lastMessage?.type === 'checkin_update' && lastMessage?.data) {
      setRealtimeUpdate({
        action: lastMessage.data.action,
        attendeeName: lastMessage.data.attendee.name,
        studentId: lastMessage.data.attendee.studentId,
        timestamp: lastMessage.data.timestamp
      });
      // Clear after animation
      setTimeout(() => setRealtimeUpdate(null), 6000);
    }
  }, [lastMessage]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6" data-testid="page-checkin">
      {/* Real-time update indicator */}
      {realtimeUpdate && (
        <RealTimeIndicator {...realtimeUpdate} />
      )}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Check-in/Check-out</h1>
        <p className="mt-2 text-muted-foreground">Quét mã QR để check-in/check-out sinh viên</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* QR Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Quét mã QR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* QR Scanner Component */}
              <QRScanner
                active={scannerActive}
                onScan={handleQRScanned}
                onActivate={() => !scanCooldown && setScannerActive(true)}
                onDeactivate={() => setScannerActive(false)}
              />
              
              {/* Thông báo cooldown */}
              {scanCooldown && (
                <div className="rounded-lg border bg-muted/40 p-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    <Clock3 className="mr-2 inline h-4 w-4" />
                    Vui lòng đợi 3 giây trước khi quét mã tiếp theo...
                  </p>
                </div>
              )}

              {/* Manual QR Code Input */}
              <div className="border-t pt-6">
                <h3 className="mb-4 font-medium">Nhập mã QR thủ công</h3>
                <div className="flex flex-col gap-2 sm:flex-row sm:space-x-0">
                  <Input
                    type="text"
                    placeholder="Nhập mã QR..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualCheckin()}
                    className="flex-1"
                    data-testid="input-manual-qr"
                  />
                  <Button 
                    onClick={handleManualCheckin}
                    disabled={!manualCode.trim() || checkinMutation.isPending}
                    data-testid="button-manual-checkin"
                  >
                    {checkinMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check-in Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Kết quả check-in</CardTitle>
          </CardHeader>
          <CardContent>
            {lastResult ? (
              <div className="text-center py-8" data-testid="checkin-result">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border bg-muted">
                  <Check className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-lg font-semibold" data-testid="result-student-name">
                  {lastResult.attendee.name}
                </h3>
                <p className="text-muted-foreground" data-testid="result-student-id">
                  MSSV/MSNV: {lastResult.attendee.studentId || "—"}
                </p>
                <p className="text-muted-foreground" data-testid="result-email">
                  Email: {lastResult.attendee.email || "—"}
                </p>
                <p className="mb-4 text-muted-foreground" data-testid="result-faculty-major">
                  Khoa: {lastResult.attendee.faculty || "—"} | Ngành: {lastResult.attendee.major || "—"}
                </p>
                <p className="mb-6 font-medium" data-testid="result-status">
                  ✓ {lastResult.message}
                </p>
                
                <div className="rounded-lg border bg-muted/30 p-4 text-left">
                  <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-muted-foreground">Sự kiện:</span>
                      <p className="font-medium" data-testid="result-event-name">{lastResult.event.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Thời gian:</span>
                      <p className="font-medium" data-testid="result-time">
                        {new Date().toLocaleTimeString('vi-VN')}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mã QR:</span>
                      <p className="font-medium" data-testid="result-qrcode">
                        {lastResult.attendee.qrCode || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Trạng thái:</span>
                      <p className="font-medium" data-testid="result-action">
                        {getActionText(lastResult.action)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground" data-testid="no-recent-result">
                <QrCode className="mx-auto mb-4 h-10 w-10" />
                <p>Quét mã QR để xem kết quả</p>
              </div>
            )}

            {/* Recent Check-ins */}
            <div className="mt-8" data-testid="recent-checkins">
              <h3 className="mb-4 font-medium">Check-in gần đây</h3>
              {recentCheckins.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground" data-testid="no-recent-checkins">
                  <p>Chưa có check-in nào hôm nay</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentCheckins.slice(0, 5).map((checkin: any, index: number) => (
                    <div 
                      key={checkin.id} 
                      className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                      data-testid={`recent-checkin-${index}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm" data-testid={`checkin-name-${index}`}>
                            {checkin.attendee.name}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`checkin-id-${index}`}>
                            {checkin.attendee.studentId} - {checkin.attendee.faculty}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`checkin-time-${index}`}>
                            {new Date(checkin.timestamp).toLocaleTimeString('vi-VN')}
                          </p>
                        </div>
                      </div>
                      <Badge className={getActionColor(checkin.action)} data-testid={`checkin-action-${index}`}>
                        {(() => {
                          const Icon = getActionIcon(checkin.action);
                          return <Icon className="mr-1 h-3 w-3" />;
                        })()}
                        {getActionText(checkin.action)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tổng check-in hôm nay</p>
                <p className="text-3xl font-semibold" data-testid="stat-today-checkins">
                  {stats?.todayCheckins || 0}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted">
                <LogIn className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Check-out hôm nay</p>
                <p className="text-3xl font-semibold" data-testid="stat-today-checkouts">
                  {recentCheckins.filter((c: any) => c.action === 'check_out' && 
                    new Date(c.timestamp).toDateString() === new Date().toDateString()).length}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted">
                <LogOut className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Đang tham dự</p>
                <p className="text-3xl font-semibold" data-testid="stat-current-attendees">
                  {(stats?.todayCheckins || 0) - recentCheckins.filter((c: any) => 
                    c.action === 'check_out' && 
                    new Date(c.timestamp).toDateString() === new Date().toDateString()).length}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted">
                <User className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
