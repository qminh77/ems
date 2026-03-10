import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, GraduationCap, LogIn, ShieldCheck, UserCircle, UserPlus } from "lucide-react";
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

  const handleReplitLogin = () => {
    window.location.href = "/api/login";
  };

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
      window.location.href = "/";
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
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-2xl border bg-card shadow-sm lg:grid-cols-[1.15fr_1fr]">
        <section className="hidden border-r bg-muted/40 p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-background">
              {systemSettings?.logoUrl ? (
                <img src={systemSettings.logoUrl} alt="logo" className="h-7 w-7 rounded object-contain" />
              ) : (
                <GraduationCap className="h-6 w-6" />
              )}
            </div>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight">{systemSettings?.systemName || "EMS Platform"}</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              {systemSettings?.systemDescription || "Nền tảng quản lý sự kiện nội bộ tập trung, tối ưu quy trình check-in và theo dõi dữ liệu người tham gia theo thời gian thực."}
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border bg-background p-4">
              <p className="text-sm font-medium">Quản lý toàn bộ sự kiện trong một giao diện duy nhất</p>
            </div>
            <div className="rounded-xl border bg-background p-4">
              <p className="text-sm font-medium">Theo dõi sinh viên và cộng tác viên theo từng sự kiện</p>
            </div>
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Xác thực bảo mật qua Replit và tài khoản nội bộ
            </div>
          </div>
        </section>

        <section className="p-4 sm:p-8 lg:p-10">
          <Card className="border-0 shadow-none">
            <CardHeader className="px-0 pb-5 pt-0 text-center sm:text-left">
              <CardTitle className="text-2xl font-semibold tracking-tight">Đăng nhập hệ thống</CardTitle>
              <CardDescription>Nhập thông tin để truy cập EMS hoặc tạo tài khoản mới.</CardDescription>
            </CardHeader>

            <CardContent className="px-0">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="mb-6 grid w-full grid-cols-2">
                  <TabsTrigger value="login" className="font-semibold">
                    Đăng nhập
                  </TabsTrigger>
                  <TabsTrigger value="register" className="font-semibold" disabled={!isRegistrationEnabled}>
                    Đăng ký mới
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLocalLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Email hoặc tên đăng nhập</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Nhập email hoặc tên đăng nhập"
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
                          className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
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

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Hoặc</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleReplitLogin}
                    disabled={isLoading}
                    data-testid="button-login-replit"
                  >
                    <UserCircle className="mr-2 h-5 w-5" />
                    Đăng nhập với Replit
                  </Button>
                </TabsContent>

                <TabsContent value="register" className="space-y-4">
                  {!isRegistrationEnabled && (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      Đăng ký tài khoản hiện đang tạm tắt bởi quản trị viên.
                    </div>
                  )}
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Họ</Label>
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="Nhập họ"
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
                          placeholder="Nhập tên"
                          value={registerData.lastName}
                          onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                          disabled={isLoading}
                          data-testid="input-lastname"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="example@email.com"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        disabled={isLoading}
                        required
                        data-testid="input-email-register"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newUsername">Tên đăng nhập *</Label>
                      <Input
                        id="newUsername"
                        type="text"
                        placeholder="Chọn tên đăng nhập"
                        value={registerData.username}
                        onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                        disabled={isLoading}
                        required
                        data-testid="input-username-register"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Mật khẩu *</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder="Tạo mật khẩu"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        disabled={isLoading}
                        required
                        data-testid="input-password-register"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Xác nhận mật khẩu *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Nhập lại mật khẩu"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        disabled={isLoading}
                        required
                        data-testid="input-confirm-password"
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading || !isRegistrationEnabled} data-testid="button-register">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Đăng ký tài khoản
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">{systemSettings?.footerText || "© EMS Platform"}</p>
    </div>
  );
}
