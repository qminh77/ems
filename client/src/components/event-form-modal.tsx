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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

const eventSchema = z.object({
  name: z.string().min(1, "Tên sự kiện là bắt buộc"),
  description: z.string().optional(),
  eventDate: z.string().min(1, "Ngày diễn ra là bắt buộc"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: any;
}

export default function EventFormModal({ isOpen, onClose, event }: EventFormModalProps) {
  const { toast } = useToast();
  const isEditing = !!event;

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: "",
      description: "",
      eventDate: "",
      startTime: "",
      endTime: "",
      location: "",
    },
  });

  useEffect(() => {
    if (event) {
      form.reset({
        name: event.name || "",
        description: event.description || "",
        eventDate: event.eventDate || "",
        startTime: event.startTime || "",
        endTime: event.endTime || "",
        location: event.location || "",
      });
    } else {
      form.reset({
        name: "",
        description: "",
        eventDate: "",
        startTime: "",
        endTime: "",
        location: "",
      });
    }
  }, [event, form]);

  const mutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      if (isEditing) {
        await apiRequest("PUT", `/api/events/${event.id}`, data);
      } else {
        await apiRequest("POST", "/api/events", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Thành công",
        description: isEditing ? "Đã cập nhật sự kiện!" : "Đã tạo sự kiện mới!",
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
        description: "Không thể lưu sự kiện. Vui lòng thử lại.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EventFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto" data-testid="event-form-modal">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Chỉnh sửa sự kiện" : "Tạo sự kiện mới"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Label htmlFor="name">Tên sự kiện *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Nhập tên sự kiện"
              data-testid="input-event-name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Mô tả chi tiết về sự kiện"
              rows={3}
              data-testid="input-event-description"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="eventDate">Ngày diễn ra *</Label>
              <Input
                id="eventDate"
                type="date"
                {...form.register("eventDate")}
                data-testid="input-event-date"
              />
              {form.formState.errors.eventDate && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.eventDate.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="location">Địa điểm</Label>
              <Input
                id="location"
                {...form.register("location")}
                placeholder="Địa điểm tổ chức"
                data-testid="input-event-location"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="startTime">Thời gian bắt đầu</Label>
              <Input
                id="startTime"
                type="time"
                {...form.register("startTime")}
                data-testid="input-event-start-time"
              />
            </div>
            <div>
              <Label htmlFor="endTime">Thời gian kết thúc</Label>
              <Input
                id="endTime"
                type="time"
                {...form.register("endTime")}
                data-testid="input-event-end-time"
              />
            </div>
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
              data-testid="button-save-event"
            >
              {mutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Đang lưu...
                </>
              ) : (
                isEditing ? "Cập nhật" : "Tạo sự kiện"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
