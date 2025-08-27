import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import EventFormModal from "@/components/event-form-modal";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Calendar, Clock, MapPin, Users, Plus, Edit2, Trash2 } from "lucide-react";
import type { Event } from "@shared/schema";

export default function Events() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const { toast } = useToast();
  const { isConnected } = useWebSocket();

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    refetchInterval: isConnected ? false : 10000, // Only poll if WebSocket is not connected
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
    onError: (error) => {
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
      <div className="p-6 animate-fade-in" data-testid="events-loading">
        <div className="mb-8">
          <div className="h-10 skeleton rounded-lg w-1/3 mb-3"></div>
          <div className="h-6 skeleton rounded-lg w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-72 skeleton rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in" data-testid="page-events">
      <div className="flex items-center justify-between mb-8 animate-slide-up">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Quản lý sự kiện</h1>
          <p className="text-gray-600 mt-2 text-lg">Tạo và quản lý các sự kiện của bạn</p>
        </div>
        <Button 
          onClick={handleCreateEvent}
          className="gradient-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          data-testid="button-create-event"
        >
          <Plus className="h-5 w-5" />
          <span>Tạo sự kiện mới</span>
        </Button>
      </div>

      {events.length === 0 ? (
        <Card className="text-center py-16 border-0 shadow-md" data-testid="no-events">
          <CardContent>
            <div className="w-20 h-20 mx-auto mb-6 gradient-primary rounded-full flex items-center justify-center shadow-lg">
              <i className="fas fa-calendar-alt text-white text-3xl"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Chưa có sự kiện nào</h3>
            <p className="text-gray-600 mb-8 text-lg">Hãy tạo sự kiện đầu tiên của bạn</p>
            <Button 
              onClick={handleCreateEvent} 
              className="gradient-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              data-testid="button-create-first-event"
            >
              <i className="fas fa-plus mr-2"></i>
              Tạo sự kiện đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {events.map((event, index) => (
            <Card key={event.id} className="border-0 shadow-md overflow-hidden hover-lift group animate-fade-in" style={{animationDelay: `${index * 0.1}s`}} data-testid={`event-card-${index}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors" data-testid={`event-name-${index}`}>
                      {event.name}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2" data-testid={`event-description-${index}`}>
                      {event.description || "Không có mô tả"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditEvent(event)}
                      className="text-gray-400 hover:text-primary p-2 rounded-lg hover:bg-primary/10 transition-all transform hover:scale-110"
                      title="Chỉnh sửa"
                      data-testid={`button-edit-event-${index}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteEvent(event.id!)}
                      className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all transform hover:scale-110"
                      title="Xóa"
                      data-testid={`button-delete-event-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                      <Calendar className="text-primary h-4 w-4" />
                    </div>
                    <span data-testid={`event-date-${index}`}>
                      {new Date(event.eventDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  {(event.startTime || event.endTime) && (
                    <div className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center mr-3">
                        <Clock className="text-secondary h-4 w-4" />
                      </div>
                      <span data-testid={`event-time-${index}`}>
                        {event.startTime} {event.endTime && `- ${event.endTime}`}
                      </span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mr-3">
                        <MapPin className="text-accent h-4 w-4" />
                      </div>
                      <span data-testid={`event-location-${index}`}>{event.location}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span 
                    className={`px-4 py-1.5 text-sm font-semibold rounded-full ${getStatusColor(event)} shadow-sm`}
                    data-testid={`event-status-${index}`}
                  >
                    {getStatusText(event)}
                  </span>
                  <button 
                    className="text-primary hover:text-blue-700 text-sm font-bold flex items-center gap-2 transition-all transform hover:scale-105"
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
