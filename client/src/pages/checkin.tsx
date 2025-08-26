import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import QRScanner from "@/components/qr-scanner";

export default function Checkin() {
  const [manualCode, setManualCode] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const { toast } = useToast();

  const { data: recentCheckins = [] } = useQuery({
    queryKey: ["/api/checkin/recent"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const checkinMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      const response = await apiRequest("POST", "/api/checkin", { qrCode });
      return response.json();
    },
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/checkin/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Thành công",
        description: data.message,
      });
      setManualCode("");
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: "Mã QR không hợp lệ hoặc đã được sử dụng",
        variant: "destructive",
      });
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
    return action === 'check_in' ? 'bg-secondary/10 text-secondary' : 'bg-red-100 text-red-600';
  };

  const getActionText = (action: string) => {
    return action === 'check_in' ? 'Check-in' : 'Check-out';
  };

  const getActionIcon = (action: string) => {
    return action === 'check_in' ? 'fa-sign-in-alt' : 'fa-sign-out-alt';
  };

  return (
    <div className="p-6" data-testid="page-checkin">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Check-in/Check-out</h1>
        <p className="text-gray-600 mt-2">Quét mã QR để check-in/check-out sinh viên</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* QR Scanner */}
        <Card className="border border-gray-100">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">Quét mã QR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* QR Scanner Component */}
              <QRScanner
                active={scannerActive}
                onScan={handleQRScanned}
                onActivate={() => setScannerActive(true)}
                onDeactivate={() => setScannerActive(false)}
              />

              {/* Manual QR Code Input */}
              <div className="border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-4">Nhập mã QR thủ công</h3>
                <div className="flex space-x-2">
                  <Input
                    type="text"
                    placeholder="Nhập mã QR..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleManualCheckin()}
                    className="flex-1"
                    data-testid="input-manual-qr"
                  />
                  <Button 
                    onClick={handleManualCheckin}
                    disabled={!manualCode.trim() || checkinMutation.isPending}
                    data-testid="button-manual-checkin"
                  >
                    {checkinMutation.isPending ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-check"></i>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check-in Results */}
        <Card className="border border-gray-100">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">Kết quả check-in</CardTitle>
          </CardHeader>
          <CardContent>
            {lastResult ? (
              <div className="text-center py-8" data-testid="checkin-result">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-check text-secondary text-2xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2" data-testid="result-student-name">
                  {lastResult.attendee.name}
                </h3>
                <p className="text-gray-600" data-testid="result-student-id">
                  MSSV/MSNV: {lastResult.attendee.studentId || "—"}
                </p>
                <p className="text-gray-600" data-testid="result-email">
                  Email: {lastResult.attendee.email || "—"}
                </p>
                <p className="text-gray-600 mb-4" data-testid="result-faculty-major">
                  Khoa: {lastResult.attendee.faculty || "—"} | Ngành: {lastResult.attendee.major || "—"}
                </p>
                <p className="text-secondary font-medium mb-6" data-testid="result-status">
                  ✓ {lastResult.message}
                </p>
                
                <div className="bg-gray-50 rounded-lg p-4 text-left">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Sự kiện:</span>
                      <p className="font-medium" data-testid="result-event-name">{lastResult.event.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Thời gian:</span>
                      <p className="font-medium" data-testid="result-time">
                        {new Date().toLocaleTimeString('vi-VN')}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Mã QR:</span>
                      <p className="font-medium" data-testid="result-qrcode">
                        {lastResult.attendee.qrCode || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Trạng thái:</span>
                      <p className="font-medium text-secondary" data-testid="result-action">
                        {getActionText(lastResult.action)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500" data-testid="no-recent-result">
                <i className="fas fa-qrcode text-4xl mb-4"></i>
                <p>Quét mã QR để xem kết quả</p>
              </div>
            )}

            {/* Recent Check-ins */}
            <div className="mt-8" data-testid="recent-checkins">
              <h3 className="font-medium text-gray-900 mb-4">Check-in gần đây</h3>
              {recentCheckins.length === 0 ? (
                <div className="text-center py-6 text-gray-500" data-testid="no-recent-checkins">
                  <p>Chưa có check-in nào hôm nay</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCheckins.slice(0, 5).map((checkin: any, index: number) => (
                    <div 
                      key={checkin.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      data-testid={`recent-checkin-${index}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center">
                          <i className="fas fa-user text-secondary text-sm"></i>
                        </div>
                        <div>
                          <p className="font-medium text-sm" data-testid={`checkin-name-${index}`}>
                            {checkin.attendee.name}
                          </p>
                          <p className="text-xs text-gray-500" data-testid={`checkin-id-${index}`}>
                            {checkin.attendee.studentId} - {checkin.attendee.faculty}
                          </p>
                          <p className="text-xs text-gray-500" data-testid={`checkin-time-${index}`}>
                            {new Date(checkin.timestamp).toLocaleTimeString('vi-VN')}
                          </p>
                        </div>
                      </div>
                      <Badge className={getActionColor(checkin.action)} data-testid={`checkin-action-${index}`}>
                        <i className={`fas ${getActionIcon(checkin.action)} mr-1`}></i>
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
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tổng check-in hôm nay</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="stat-today-checkins">
                  {stats?.todayCheckins || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-sign-in-alt text-secondary text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Check-out hôm nay</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="stat-today-checkouts">
                  {recentCheckins.filter((c: any) => c.action === 'check_out' && 
                    new Date(c.timestamp).toDateString() === new Date().toDateString()).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-sign-out-alt text-red-600 text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Đang tham dự</p>
                <p className="text-3xl font-bold text-gray-900" data-testid="stat-current-attendees">
                  {(stats?.todayCheckins || 0) - recentCheckins.filter((c: any) => 
                    c.action === 'check_out' && 
                    new Date(c.timestamp).toDateString() === new Date().toDateString()).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-users text-accent text-xl"></i>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
