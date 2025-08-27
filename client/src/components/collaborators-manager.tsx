import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, UserPlus, UserMinus, Shield, Eye, Edit, CheckCircle } from "lucide-react";

interface Collaborator {
  id: number;
  eventId: number;
  userId: string;
  role: string;
  permissions: string[];
  invitedBy: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
}

interface CollaboratorsManagerProps {
  eventId: number;
  userRole?: string;
}

const PERMISSIONS = [
  { value: 'view', label: 'Xem sự kiện', icon: Eye },
  { value: 'checkin', label: 'Check-in sinh viên', icon: CheckCircle },
  { value: 'manage_attendees', label: 'Quản lý sinh viên', icon: Edit },
  { value: 'edit_event', label: 'Chỉnh sửa sự kiện', icon: Shield },
];

export function CollaboratorsManager({ eventId, userRole }: CollaboratorsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedPermissions, setSelectedPermissions] = useState(['view', 'checkin']);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const isOwner = userRole === 'owner';

  // Fetch collaborators
  const { data: collaborators, isLoading } = useQuery({
    queryKey: [`/api/events/${eventId}/collaborators`],
    enabled: !!eventId,
  });

  // Search users
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
          if (response.ok) {
            const users = await response.json();
            setSearchResults(users);
          }
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Add collaborator mutation
  const addCollaboratorMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser) return;
      
      return apiRequest('POST', `/api/events/${eventId}/collaborators`, {
        userId: selectedUser.id,
        permissions: selectedPermissions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/collaborators`] });
      toast({
        title: "Thành công",
        description: "Đã thêm cộng tác viên mới",
      });
      setIsOpen(false);
      setSelectedUser(null);
      setSearchQuery("");
      setSelectedPermissions(['view', 'checkin']);
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm cộng tác viên",
        variant: "destructive",
      });
    },
  });

  // Remove collaborator mutation
  const removeCollaboratorMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest('DELETE', `/api/events/${eventId}/collaborators/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/collaborators`] });
      toast({
        title: "Thành công",
        description: "Đã xóa cộng tác viên",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa cộng tác viên",
        variant: "destructive",
      });
    },
  });

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissions }: { userId: string; permissions: string[] }) => {
      return apiRequest('PATCH', `/api/events/${eventId}/collaborators/${userId}`, { permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/collaborators`] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật quyền hạn",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật quyền hạn",
        variant: "destructive",
      });
    },
  });

  const getUserDisplayName = (user: any) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email || 'Người dùng';
  };

  const getInitials = (user: any) => {
    const name = getUserDisplayName(user);
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cộng tác viên</CardTitle>
        <CardDescription>
          Quản lý người dùng có quyền truy cập sự kiện này
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isOwner && (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Thêm cộng tác viên
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Thêm cộng tác viên</DialogTitle>
                  <DialogDescription>
                    Tìm và thêm người dùng để cộng tác trong sự kiện này
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="search">Tìm kiếm theo email hoặc tên đăng nhập</Label>
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Nhập email hoặc tên đăng nhập..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {isSearching && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="space-y-2">
                      <Label>Kết quả tìm kiếm</Label>
                      <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer hover:bg-accent ${
                              selectedUser?.id === user.id ? 'bg-accent' : ''
                            }`}
                            onClick={() => setSelectedUser(user)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.profileImageUrl} />
                              <AvatarFallback>{getInitials(user)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{getUserDisplayName(user)}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedUser && (
                    <div>
                      <Label>Quyền hạn</Label>
                      <div className="mt-2 space-y-2">
                        {PERMISSIONS.map((perm) => (
                          <div key={perm.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={perm.value}
                              checked={selectedPermissions.includes(perm.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedPermissions([...selectedPermissions, perm.value]);
                                } else {
                                  setSelectedPermissions(selectedPermissions.filter(p => p !== perm.value));
                                }
                              }}
                            />
                            <Label
                              htmlFor={perm.value}
                              className="flex items-center space-x-2 cursor-pointer"
                            >
                              <perm.icon className="h-4 w-4" />
                              <span>{perm.label}</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => addCollaboratorMutation.mutate()}
                    disabled={!selectedUser || addCollaboratorMutation.isPending}
                  >
                    {addCollaboratorMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang thêm...
                      </>
                    ) : (
                      'Thêm cộng tác viên'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {Array.isArray(collaborators) && collaborators.map((collab: Collaborator) => (
                <div
                  key={collab.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={collab.user.profileImageUrl || undefined} />
                      <AvatarFallback>{getInitials(collab.user)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{getUserDisplayName(collab.user)}</p>
                      <p className="text-sm text-muted-foreground">{collab.user.email}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {collab.permissions.map(perm => {
                          const permission = PERMISSIONS.find(p => p.value === perm);
                          return permission ? (
                            <Badge key={perm} variant="secondary" className="text-xs">
                              <permission.icon className="mr-1 h-3 w-3" />
                              {permission.label}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCollaboratorMutation.mutate(collab.userId)}
                      disabled={removeCollaboratorMutation.isPending}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}