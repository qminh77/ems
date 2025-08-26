import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import EventFormModal from "@/components/event-form-modal";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Clock, MapPin, Users, Plus, Edit2, Trash2 } from "lucide-react";
import type { Event } from "@shared/schema";

export default function Events() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: events = [], isLoading: eventsLoading, error } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

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
      return "bg-gray-100 text-gray-600";
    } else if (eventDate.toDateString() === today.toDateString()) {
      return "bg-secondary/10 text-secondary";
    } else {
      return "bg-accent/10 text-accent";
    }
  };

  const getStatusText = (event: Event) => {
    const today = new Date();
    const eventDate = new Date(event.eventDate);
    
    if (eventDate < today) {
      return "Đã kết thúc";
    } else if (eventDate.toDateString() === today.toDateString()) {
      return "Đang diễn ra";
    } else {
      return "Sắp diễn ra";
    }
  };

  if (eventsLoading) {
    return (
      <div className="p-6" data-testid="events-loading">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="page-events">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý sự kiện</h1>
          <p className="text-gray-600 mt-2">Tạo và quản lý các sự kiện của bạn</p>
        </div>
        <Button 
          onClick={handleCreateEvent}
          className="bg-primary hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-lg transition-all hover:shadow-xl"
          data-testid="button-create-event"
        >
          <Plus className="h-5 w-5" />
          <span>Tạo sự kiện mới</span>
        </Button>
      </div>

      {events.length === 0 ? (
        <Card className="text-center py-12" data-testid="no-events">
          <CardContent>
            <i className="fas fa-calendar-alt text-gray-400 text-6xl mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có sự kiện nào</h3>
            <p className="text-gray-600 mb-6">Hãy tạo sự kiện đầu tiên của bạn</p>
            <Button onClick={handleCreateEvent} data-testid="button-create-first-event">
              <i className="fas fa-plus mr-2"></i>
              Tạo sự kiện đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {events.map((event, index) => (
            <Card key={event.id} className="border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1" data-testid={`event-card-${index}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2" data-testid={`event-name-${index}`}>
                      {event.name}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2" data-testid={`event-description-${index}`}>
                      {event.description || "Không có mô tả"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 ml-4">
                    <button 
                      onClick={() => handleEditEvent(event)}
                      className="text-gray-400 hover:text-primary p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Chỉnh sửa"
                      data-testid={`button-edit-event-${index}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteEvent(event.id!)}
                      className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Xóa"
                      data-testid={`button-delete-event-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="text-gray-400 h-4 w-4 mr-3" />
                    <span data-testid={`event-date-${index}`}>
                      {new Date(event.eventDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  {(event.startTime || event.endTime) && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="text-gray-400 h-4 w-4 mr-3" />
                      <span data-testid={`event-time-${index}`}>
                        {event.startTime} {event.endTime && `- ${event.endTime}`}
                      </span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="text-gray-400 h-4 w-4 mr-3" />
                      <span data-testid={`event-location-${index}`}>{event.location}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span 
                    className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(event)}`}
                    data-testid={`event-status-${index}`}
                  >
                    {getStatusText(event)}
                  </span>
                  <button 
                    className="text-primary hover:text-blue-700 text-sm font-semibold flex items-center gap-1 transition-colors"
                    onClick={() => window.location.href = `/students?eventId=${event.id}`}
                    data-testid={`link-view-attendees-${index}`}
                  >
                    <Users className="h-4 w-4" />
                    <span>Xem sinh viên</span>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <EventFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={editingEvent}
      />
    </div>
  );
}
