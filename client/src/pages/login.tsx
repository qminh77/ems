import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Eye, EyeOff, GraduationCap, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { usePublicSystemSettings } from "@/hooks/useSystemSettings";

async function parseErrorResponse(response: Response, fallbackMessage: string) {
  const raw = await response.text();

  if (!raw) {
    return fallbackMessage;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.message) {
      return parsed.message;
    }
  } catch {
    // Non-JSON response
  }

  return fallbackMessage;
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { data: systemSettings } = usePublicSystemSettings();
  const isRegistrationEnabled = systemSettings?.registrationEnabled ?? true;

  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    firstName: "",
    lastName: "",
  });

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.username || !loginData.password) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/login-local", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
        credentials: "include",
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response, "Đăng nhập thất bại");
        throw new Error(message);
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Đăng nhập thất bại",
        description: error.message || "Email/tên đăng nhập hoặc mật khẩu không đúng",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isRegistrationEnabled) {
      toast({
        title: "Đăng ký tạm khóa",
        description: "Đăng ký tài khoản hiện đang tạm tắt bởi quản trị viên",
        variant: "destructive",
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu xác nhận không khớp",
        variant: "destructive",
      });
      return;
    }

    if (!registerData.username || !registerData.password || !registerData.email) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin bắt buộc",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: registerData.username,
          password: registerData.password,
          email: registerData.email,
          firstName: registerData.firstName,
          lastName: registerData.lastName,
        }),
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response, "Đăng ký thất bại");
        throw new Error(message);
      }

      toast({
        title: "Đăng ký thành công",
        description: "Bạn có thể đăng nhập ngay bây giờ",
      });

      setRegisterData({
        username: "",
        password: "",
        confirmPassword: "",
        email: "",
        firstName: "",
        lastName: "",
      });

      setLoginData({
        username: registerData.username,
        password: registerData.password,
      });

      setTimeout(() => handleLocalLogin({ preventDefault: () => {} } as any), 1000);
    } catch (error: any) {
      toast({
        title: "Đăng ký thất bại",
        description: error.message || "Có lỗi xảy ra, vui lòng thử lại",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-muted/30 p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.08),transparent_55%)]" />
      <Card className="relative w-full max-w-md border bg-card/95 backdrop-blur">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background">
                {systemSettings?.logoUrl ? (
                  <img src={systemSettings.logoUrl} alt="logo" className="h-5 w-5 rounded object-contain" />
                ) : (
                  <GraduationCap className="h-4 w-4" />
                )}
              </div>
              <CardTitle className="text-xl">{systemSettings?.systemName || "EMS Platform"}</CardTitle>
            </div>
          </div>
          <CardDescription>Truy cập hệ thống bằng tài khoản nội bộ.</CardDescription>
          <div className="inline-flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Kết nối bảo mật
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="mb-5 grid w-full grid-cols-2">
              <TabsTrigger value="login">Đăng nhập</TabsTrigger>
              <TabsTrigger value="register" disabled={!isRegistrationEnabled}>Đăng ký</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLocalLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Email hoặc tên đăng nhập</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="name@example.com"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    disabled={isLoading}
                    data-testid="input-username-login"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Nhập mật khẩu"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      disabled={isLoading}
                      className="pr-10"
                      data-testid="input-password-login"
                    />
                    <Button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login-local">
                  <LogIn className="mr-2 h-4 w-4" />
                  Đăng nhập
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              {!isRegistrationEnabled && (
                <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Đăng ký đang tạm tắt.</div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Họ</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={registerData.firstName}
                      onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                      disabled={isLoading}
                      data-testid="input-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Tên</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={registerData.lastName}
                      onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                      disabled={isLoading}
                      data-testid="input-lastname"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    disabled={isLoading}
                    required
                    data-testid="input-email-register"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newUsername">Tên đăng nhập</Label>
                  <Input
                    id="newUsername"
                    type="text"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    disabled={isLoading}
                    required
                    data-testid="input-username-register"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Mật khẩu</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    disabled={isLoading}
                    required
                    data-testid="input-password-register"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    disabled={isLoading}
                    required
                    data-testid="input-confirm-password"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || !isRegistrationEnabled} data-testid="button-register">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Tạo tài khoản
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <Separator className="my-5" />
          <p className="text-center text-xs text-muted-foreground">{systemSettings?.footerText || "© EMS Platform"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
