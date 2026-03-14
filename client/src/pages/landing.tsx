import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { GraduationCap, UserCircle2 } from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const handleLogin = () => {
    setLocation("/login");
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border bg-muted">
              <GraduationCap className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-semibold">Đăng nhập hệ thống</h1>
            <p className="mt-2 text-muted-foreground">Quản lý sự kiện và sinh viên</p>
          </div>

          <div className="space-y-4">
            <Button 
              onClick={handleLogin}
              className="w-full"
              data-testid="button-login-local"
            >
              <UserCircle2 className="h-4 w-4" />
              <span>Đăng nhập tài khoản</span>
            </Button>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Sử dụng tài khoản nội bộ để truy cập hệ thống</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
