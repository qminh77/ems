import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="border-b pb-4">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/40">
            <AlertCircle className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl">Không tìm thấy trang</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <p className="text-sm text-muted-foreground">
            Đường dẫn bạn truy cập không tồn tại hoặc đã bị thay đổi. Vui lòng quay lại trang chính để tiếp tục làm việc.
          </p>
          <Button onClick={() => (window.location.href = "/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Quay lại trang tổng quan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
