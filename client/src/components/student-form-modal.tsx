import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

const studentSchema = z.object({
  name: z.string().min(1, "Họ và tên là bắt buộc"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  phone: z.string().optional(),
  studentId: z.string().optional(),
  class: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: any;
  eventId: number;
  events: any[];
}

export default function StudentFormModal({ isOpen, onClose, student, eventId, events }: StudentFormModalProps) {
  const { toast } = useToast();
  const isEditing = !!student;

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      studentId: "",
      class: "",
    },
  });

  useEffect(() => {
    if (student) {
      form.reset({
        name: student.name || "",
        email: student.email || "",
        phone: student.phone || "",
        studentId: student.studentId || "",
        class: student.class || "",
      });
    } else {
      form.reset({
        name: "",
        email: "",
        phone: "",
        studentId: "",
        class: "",
      });
    }
  }, [student, form]);

  const mutation = useMutation({
    mutationFn: async (data: StudentFormData) => {
      if (isEditing) {
        await apiRequest("PUT", `/api/attendees/${student.id}`, data);
      } else {
        await apiRequest("POST", `/api/events/${eventId}/attendees`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId.toString(), "attendees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Thành công",
        description: isEditing ? "Đã cập nhật thông tin sinh viên!" : "Đã thêm sinh viên thành công!",
      });
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Lỗi",
        description: "Không thể lưu thông tin sinh viên. Vui lòng thử lại.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StudentFormData) => {
    mutation.mutate(data);
  };

  const selectedEvent = events.find(e => e.id === eventId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-screen overflow-y-auto" data-testid="student-form-modal">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Chỉnh sửa sinh viên" : "Thêm sinh viên"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {!isEditing && (
            <div>
              <Label>Sự kiện</Label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900" data-testid="selected-event-display">
                  {selectedEvent?.name || "Chưa chọn sự kiện"}
                </p>
              </div>
            </div>
          )}
          
          <div>
            <Label htmlFor="name">Họ và tên *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Nhập họ và tên"
              data-testid="input-student-name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              placeholder="email@student.edu.vn"
              data-testid="input-student-email"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                type="tel"
                {...form.register("phone")}
                placeholder="0123456789"
                data-testid="input-student-phone"
              />
            </div>
            <div>
              <Label htmlFor="studentId">MSSV</Label>
              <Input
                id="studentId"
                {...form.register("studentId")}
                placeholder="20210001"
                data-testid="input-student-id"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="class">Lớp</Label>
            <Input
              id="class"
              {...form.register("class")}
              placeholder="CNTT01-K22"
              data-testid="input-student-class"
            />
          </div>
          
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              data-testid="button-cancel"
            >
              Hủy
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              data-testid="button-save-student"
            >
              {mutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Đang lưu...
                </>
              ) : (
                isEditing ? "Cập nhật" : "Thêm sinh viên"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
