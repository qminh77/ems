import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, UserPlus, LogIn, GraduationCap, UserCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { queryClient } from "@/lib/queryClient";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Login form
  const [loginData, setLoginData] = useState({
    username: "",
    password: ""
  });
  
  // Register form
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    firstName: "",
    lastName: ""
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
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/login-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Đăng nhập thất bại');
      }
      
      // Refresh user data and redirect
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: "Đăng nhập thất bại",
        description: error.message || "Email/tên đăng nhập hoặc mật khẩu không đúng",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Lỗi",
        description: "Mật khẩu xác nhận không khớp",
        variant: "destructive"
      });
      return;
    }

    if (!registerData.username || !registerData.password || !registerData.email) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin bắt buộc",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: registerData.username,
          password: registerData.password,
          email: registerData.email,
          firstName: registerData.firstName,
          lastName: registerData.lastName
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Đăng ký thất bại');
      }
      
      toast({
        title: "Đăng ký thành công",
        description: "Bạn có thể đăng nhập ngay bây giờ"
      });
      
      // Switch to login tab
      // Clear form and switch to login
      setRegisterData({
        username: "",
        password: "",
        confirmPassword: "",
        email: "",
        firstName: "",
        lastName: ""
      });
      setLoginData({
        username: registerData.username,
        password: registerData.password
      });
      
      // Auto login after registration
      setTimeout(() => handleLocalLogin({ preventDefault: () => {} } as any), 1000);
    } catch (error: any) {
      toast({
        title: "Đăng ký thất bại",
        description: error.message || "Có lỗi xảy ra, vui lòng thử lại",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg py-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center shadow-lg">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Hệ Thống Quản Lý Sự Kiện</CardTitle>
          <CardDescription className="text-white/90 mt-2">EMS - Event Management System Việt Nam</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="font-semibold">Đăng nhập</TabsTrigger>
              <TabsTrigger value="register" className="font-semibold">Đăng ký mới</TabsTrigger>
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
                    onChange={(e) => setLoginData({...loginData, username: e.target.value})}
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
                      onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                      disabled={isLoading}
                      className="pr-10"
                      data-testid="input-password-login"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white" disabled={isLoading} data-testid="button-login-local">
                  <LogIn className="mr-2 h-4 w-4" />
                  Đăng nhập
                </Button>
              </form>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Hoặc</span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full border-2 border-gray-300 hover:bg-gray-50" 
                onClick={handleReplitLogin}
                disabled={isLoading}
                data-testid="button-login-replit"
              >
                <UserCircle className="mr-2 h-5 w-5" />
                Đăng nhập với Replit
              </Button>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Họ</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Nhập họ"
                      value={registerData.firstName}
                      onChange={(e) => setRegisterData({...registerData, firstName: e.target.value})}
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
                      onChange={(e) => setRegisterData({...registerData, lastName: e.target.value})}
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
                    onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
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
                    onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
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
                    placeholder="Tạo mật khẩu mạnh"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
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
                    onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                    disabled={isLoading}
                    required
                    data-testid="input-confirm-password"
                  />
                </div>
                
                <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white" disabled={isLoading} data-testid="button-register">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Đăng ký tài khoản
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}