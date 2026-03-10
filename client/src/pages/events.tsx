import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import EventFormModal from "@/components/event-form-modal";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Calendar, CalendarCheck2, Clock, MapPin, Users, Plus, Edit2, Trash2 } from "lucide-react";
import type { Event } from "@shared/schema";

export default function Events() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const { toast } = useToast();
  const { isConnected } = useWebSocket();

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    refetchInterval: isConnected ? false : 10000,
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      await apiRequest("DELETE", `/api/events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Thành công",
        description: "Đã xóa sự kiện thành công!",
      });
    },
    onError: () => {
      toast({
        title: "Lỗi",
        description: "Không thể xóa sự kiện",
        variant: "destructive",
      });
    },
  });

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa sự kiện này?")) {
      deleteEventMutation.mutate(eventId);
    }
  };

  const getStatusColor = (event: Event) => {
    const today = new Date();
    const eventDate = new Date(event.eventDate);

    if (eventDate < today) {
      return "bg-muted text-muted-foreground";
    }

    if (eventDate.toDateString() === today.toDateString()) {
      return "bg-primary text-primary-foreground";
    }

    return "bg-secondary text-secondary-foreground";
  };

  const getStatusText = (event: Event) => {
    const today = new Date();
    const eventDate = new Date(event.eventDate);

    if (eventDate < today) {
      return "Đã kết thúc";
    }

    if (eventDate.toDateString() === today.toDateString()) {
      return "Đang diễn ra";
    }

    return "Sắp diễn ra";
  };

  if (eventsLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6" data-testid="events-loading">
        <div className="mb-8 space-y-3">
          <div className="h-10 w-1/3 animate-pulse rounded-md bg-muted" />
          <div className="h-5 w-1/2 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6" data-testid="page-events">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Quản lý sự kiện</h1>
          <p className="mt-2 text-muted-foreground">Tạo và quản lý các sự kiện của bạn</p>
        </div>
        <Button onClick={handleCreateEvent} className="w-full gap-2 sm:w-auto" data-testid="button-create-event">
          <Plus className="h-5 w-5" />
          <span>Tạo sự kiện mới</span>
        </Button>
      </div>

      {events.length === 0 ? (
        <Card className="py-14 text-center" data-testid="no-events">
          <CardContent>
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border bg-muted">
              <CalendarCheck2 className="h-8 w-8" />
            </div>
            <h3 className="mb-3 text-xl font-semibold">Chưa có sự kiện nào</h3>
            <p className="mb-8 text-muted-foreground">Hãy tạo sự kiện đầu tiên của bạn</p>
            <Button onClick={handleCreateEvent} className="w-full gap-2 sm:w-auto" data-testid="button-create-first-event">
              <Plus className="h-4 w-4" />
              Tạo sự kiện đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {events.map((event, index) => (
            <Card key={event.id} className="overflow-hidden" data-testid={`event-card-${index}`}>
              <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="mb-2 text-xl font-semibold" data-testid={`event-name-${index}`}>
                      {event.name}
                    </h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground" data-testid={`event-description-${index}`}>
                      {event.description || "Không có mô tả"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditEvent(event)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Chỉnh sửa"
                      data-testid={`button-edit-event-${index}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteEvent(event.id!)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Xóa"
                      data-testid={`button-delete-event-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg border bg-muted">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span data-testid={`event-date-${index}`}>{new Date(event.eventDate).toLocaleDateString("vi-VN")}</span>
                  </div>
                  {(event.startTime || event.endTime) && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg border bg-muted">
                        <Clock className="h-4 w-4" />
                      </div>
                      <span data-testid={`event-time-${index}`}>
                        {event.startTime} {event.endTime && `- ${event.endTime}`}
                      </span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg border bg-muted">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <span data-testid={`event-location-${index}`}>{event.location}</span>
                    </div>
                  )}
                </div>
              </CardContent>

              <div className="border-t bg-muted/30 px-6 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Badge className={getStatusColor(event)} data-testid={`event-status-${index}`}>
                    {getStatusText(event)}
                  </Badge>
                  <Button
                    variant="ghost"
                    className="h-auto justify-start gap-2 p-0 text-sm font-medium"
                    onClick={() => {
                      window.location.href = `/students?eventId=${event.id}`;
                    }}
                    data-testid={`link-view-attendees-${index}`}
                  >
                    <Users className="h-4 w-4" />
                    <span>Xem sinh viên</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <EventFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} event={editingEvent} />
    </div>
  );
}
