import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Landing() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      window.location.href = "/";
    }
  }, [isAuthenticated, isLoading]);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-blue-600 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-graduation-cap text-white text-2xl"></i>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Đăng nhập hệ thống</h1>
            <p className="text-gray-600 mt-2">Quản lý sự kiện và sinh viên</p>
          </div>

          <div className="space-y-4">
            <Button 
              onClick={handleLogin}
              className="w-full bg-primary hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              data-testid="button-login-replit"
            >
              <i className="fab fa-python"></i>
              <span>Đăng nhập với Replit</span>
            </Button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Sử dụng tài khoản Replit để truy cập an toàn</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
