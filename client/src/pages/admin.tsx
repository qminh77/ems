import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type AdminSettings = {
  id: number;
  systemName: string;
  systemDescription: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl: string | null;
  footerText: string;
  registrationEnabled: boolean;
};

type AdminUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  isAdmin: boolean;
  canCreateEvents: boolean;
  isActive: boolean;
  username?: string | null;
};

export default function AdminPage() {
  const { user } = useAuth() as { user: any };
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [keyword, setKeyword] = useState("");

  const { data: settings, isLoading: loadingSettings } = useQuery<AdminSettings>({
    queryKey: ["/api/admin/settings"],
    retry: false,
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: Omit<AdminSettings, "id">) => {
      const response = await apiRequest("PUT", "/api/admin/settings", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/settings"] });
      toast({ title: "Thành công", description: "Đã cập nhật cấu hình hệ thống" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, payload }: { userId: string; payload: Partial<AdminUser> }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Thành công", description: "Đã cập nhật quyền tài khoản" });
    },
    onError: (error: Error) => {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    },
  });

  const [formState, setFormState] = useState<Omit<AdminSettings, "id">>({
    systemName: "",
    systemDescription: "",
    contactEmail: "",
    contactPhone: "",
    logoUrl: "",
    footerText: "",
    registrationEnabled: true,
  });

  useEffect(() => {
    if (!settings) return;
    setFormState({
      systemName: settings.systemName,
      systemDescription: settings.systemDescription,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      logoUrl: settings.logoUrl || "",
      footerText: settings.footerText,
      registrationEnabled: settings.registrationEnabled,
    });
  }, [settings]);

  useEffect(() => {
    if (user && !user.isAdmin) {
      setLocation("/");
    }
  }, [setLocation, user]);

  if (!user?.isAdmin) {
    return (
      <div className="page-shell">
        <Card>
          <CardHeader>
            <CardTitle>Không có quyền truy cập</CardTitle>
            <CardDescription>Chỉ tài khoản admin mới truy cập được AdminCP.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const filteredUsers = users.filter((item) => {
    const q = keyword.toLowerCase().trim();
    if (!q) return true;
    const fullName = `${item.firstName || ""} ${item.lastName || ""}`.trim().toLowerCase();
    return (
      item.email?.toLowerCase().includes(q) ||
      item.username?.toLowerCase().includes(q) ||
      fullName.includes(q)
    );
  });

  return (
    <div className="page-shell space-y-4" data-testid="page-admin">
      <div>
        <h1 className="page-title">Admin Control Panel</h1>
        <p className="page-description">Quản trị cấu hình hệ thống và phân quyền tài khoản.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Cấu hình hệ thống</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSettings ? (
            <p className="text-sm text-muted-foreground">Đang tải cấu hình...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tên hệ thống</Label>
                  <Input value={formState.systemName} onChange={(e) => setFormState((prev) => ({ ...prev, systemName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Email liên hệ</Label>
                  <Input type="email" value={formState.contactEmail} onChange={(e) => setFormState((prev) => ({ ...prev, contactEmail: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Số điện thoại</Label>
                  <Input value={formState.contactPhone} onChange={(e) => setFormState((prev) => ({ ...prev, contactPhone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input value={formState.logoUrl || ""} onChange={(e) => setFormState((prev) => ({ ...prev, logoUrl: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Input value={formState.systemDescription} onChange={(e) => setFormState((prev) => ({ ...prev, systemDescription: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label>Footer</Label>
                <Input value={formState.footerText} onChange={(e) => setFormState((prev) => ({ ...prev, footerText: e.target.value }))} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Bật đăng ký tài khoản</p>
                  <p className="text-xs text-muted-foreground">Tắt để chặn tạo tài khoản mới từ trang đăng nhập.</p>
                </div>
                <Switch
                  checked={formState.registrationEnabled}
                  onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, registrationEnabled: checked }))}
                />
              </div>

              <Button onClick={() => updateSettingsMutation.mutate(formState)} disabled={updateSettingsMutation.isPending}>
                {updateSettingsMutation.isPending ? "Đang lưu..." : "Lưu cấu hình"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Quản lý tài khoản</CardTitle>
          <CardDescription>Bật/tắt quyền tạo sự kiện, quyền admin và trạng thái hoạt động.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Tìm theo email, username, họ tên"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />

          {loadingUsers ? (
            <p className="text-sm text-muted-foreground">Đang tải danh sách tài khoản...</p>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((account) => (
                <div key={account.id} className="rounded-lg border p-3">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <p className="font-medium">{account.email || account.username || account.id}</p>
                    {account.isAdmin && <Badge>Admin</Badge>}
                    {!account.isActive && <Badge variant="destructive">Disabled</Badge>}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="flex items-center justify-between rounded-md border p-2">
                      <span className="text-sm">Admin</span>
                      <Switch
                        checked={account.isAdmin}
                        onCheckedChange={(checked) => updateUserMutation.mutate({ userId: account.id, payload: { isAdmin: checked } })}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-2">
                      <span className="text-sm">Tạo sự kiện</span>
                      <Switch
                        checked={account.canCreateEvents}
                        onCheckedChange={(checked) =>
                          updateUserMutation.mutate({ userId: account.id, payload: { canCreateEvents: checked } })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-2">
                      <span className="text-sm">Kích hoạt</span>
                      <Switch
                        checked={account.isActive}
                        onCheckedChange={(checked) => updateUserMutation.mutate({ userId: account.id, payload: { isActive: checked } })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
