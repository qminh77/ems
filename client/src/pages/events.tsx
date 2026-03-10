import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import EventFormModal from "@/components/event-form-modal";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Calendar, Clock, Edit2, MapPin, Plus, Search, Trash2, Users } from "lucide-react";
import type { Event } from "@shared/schema";

type EventStatus = "all" | "upcoming" | "today" | "past";

export default function Events() {
  const [, setLocation] = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EventStatus>("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const { toast } = useToast();
  const { isConnected } = useWebSocket();
  const { user } = useAuth() as { user?: any };
  const canCreateEvents = Boolean(user?.canCreateEvents) || Boolean(user?.isAdmin);

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

  const getEventStatus = (event: Event): Exclude<EventStatus, "all"> => {
    const eventDate = new Date(event.eventDate);
    const normalizedEventDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const now = new Date();
    const normalizedToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (normalizedEventDate.getTime() < normalizedToday.getTime()) return "past";
    if (normalizedEventDate.getTime() === normalizedToday.getTime()) return "today";
    return "upcoming";
  };

  const getStatusText = (event: Event) => {
    const status = getEventStatus(event);
    if (status === "past") return "Đã kết thúc";
    if (status === "today") return "Đang diễn ra";
    return "Sắp diễn ra";
  };

  const getStatusClass = (event: Event) => {
    const status = getEventStatus(event);
    if (status === "past") return "bg-muted text-muted-foreground";
    if (status === "today") return "bg-primary text-primary-foreground";
    return "bg-secondary text-secondary-foreground";
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const status = getEventStatus(event);
      const matchesStatus = statusFilter === "all" ? true : status === statusFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        query.length === 0 ||
        event.name.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [events, statusFilter, searchQuery]);

  const summary = useMemo(() => {
    return events.reduce(
      (acc, event) => {
        const status = getEventStatus(event);
        acc.total += 1;
        acc[status] += 1;
        return acc;
      },
      { total: 0, upcoming: 0, today: 0, past: 0 }
    );
  }, [events]);

  const statusTabs: { label: string; value: EventStatus; count: number }[] = [
    { label: "Tất cả", value: "all", count: summary.total },
    { label: "Sắp diễn ra", value: "upcoming", count: summary.upcoming },
    { label: "Hôm nay", value: "today", count: summary.today },
    { label: "Đã kết thúc", value: "past", count: summary.past },
  ];

  if (eventsLoading) {
    return (
      <div className="page-shell" data-testid="events-loading">
        <div className="rounded-xl border bg-card p-6">
          <div className="mb-4 h-9 w-1/3 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell" data-testid="page-events">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Quản lý sự kiện</h1>
          <p className="page-description">Tạo, theo dõi và điều phối toàn bộ sự kiện trong một không gian tập trung.</p>
        </div>
        <Button
          onClick={handleCreateEvent}
          className="w-full gap-2 sm:w-auto"
          data-testid="button-create-event"
          disabled={!canCreateEvents}
          title={canCreateEvents ? "Tạo sự kiện" : "Tài khoản không có quyền tạo sự kiện"}
        >
          <Plus className="h-4 w-4" />
          <span>Tạo sự kiện mới</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng sự kiện</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sắp diễn ra</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.upcoming}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Diễn ra hôm nay</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.today}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Đã kết thúc</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{summary.past}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, mô tả hoặc địa điểm"
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as EventStatus)}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="upcoming">Sắp diễn ra</SelectItem>
              <SelectItem value="today">Đang diễn ra</SelectItem>
              <SelectItem value="past">Đã kết thúc</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
        <CardContent className="flex flex-wrap gap-2 border-t p-4 pt-3">
          {statusTabs.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              size="sm"
              variant={statusFilter === tab.value ? "default" : "outline"}
              onClick={() => setStatusFilter(tab.value)}
              className="gap-2"
            >
              {tab.label}
              <Badge variant="secondary" className="rounded-md px-1.5 py-0 text-[11px]">
                {tab.count}
              </Badge>
            </Button>
          ))}
        </CardContent>
      </Card>

      {filteredEvents.length === 0 ? (
        <Card className="shadow-sm" data-testid="no-events">
          <CardContent className="p-4 sm:p-6">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Calendar className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>{events.length === 0 ? "Chưa có sự kiện" : "Không có kết quả phù hợp"}</EmptyTitle>
                <EmptyDescription>
                  {events.length === 0
                    ? "Bắt đầu bằng cách tạo sự kiện đầu tiên cho hệ thống của bạn."
                    : "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái."}
                </EmptyDescription>
              </EmptyHeader>
              {events.length === 0 && canCreateEvents && (
                <Button onClick={handleCreateEvent} className="gap-2" data-testid="button-create-first-event">
                  <Plus className="h-4 w-4" />
                  Tạo sự kiện đầu tiên
                </Button>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "table" | "cards")}>
          <div className="mb-3 flex justify-end">
            <TabsList>
              <TabsTrigger value="table">Bảng</TabsTrigger>
              <TabsTrigger value="cards">Thẻ</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="table" className="mt-0">
            <Card className="overflow-hidden shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Tên sự kiện</TableHead>
                      <TableHead>Ngày / giờ</TableHead>
                      <TableHead>Địa điểm</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event, index) => (
                      <TableRow key={event.id} data-testid={`event-row-${index}`}>
                        <TableCell>
                          <p className="font-medium" data-testid={`event-name-${index}`}>{event.name}</p>
                          <p className="line-clamp-1 text-xs text-muted-foreground" data-testid={`event-description-${index}`}>
                            {event.description || "Không có mô tả"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p data-testid={`event-date-${index}`}>{new Date(event.eventDate).toLocaleDateString("vi-VN")}</p>
                            <p className="text-xs text-muted-foreground" data-testid={`event-time-${index}`}>
                              {event.startTime || "--:--"}
                              {event.endTime ? ` - ${event.endTime}` : ""}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`event-location-${index}`}>{event.location || "Chưa có địa điểm"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusClass(event)} data-testid={`event-status-${index}`}>
                            {getStatusText(event)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditEvent(event)}
                              className="h-8 w-8"
                              title="Chỉnh sửa"
                              data-testid={`button-edit-event-${index}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteEvent(event.id!)}
                              className="h-8 w-8"
                              title="Xóa"
                              data-testid={`button-delete-event-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="ml-1 gap-2"
                              onClick={() => {
                                setLocation(`/students?eventId=${event.id}`);
                              }}
                              data-testid={`link-view-attendees-${index}`}
                            >
                              <Users className="h-4 w-4" />
                              <span className="hidden sm:inline">Xem sinh viên</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cards" className="mt-0">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filteredEvents.map((event, index) => (
                <Card key={event.id} className="overflow-hidden shadow-sm" data-testid={`event-card-${index}`}>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <h3 className="truncate text-lg font-semibold" data-testid={`event-name-${index}`}>
                          {event.name}
                        </h3>
                        <p className="line-clamp-2 text-sm text-muted-foreground" data-testid={`event-description-${index}`}>
                          {event.description || "Không có mô tả"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditEvent(event)}
                          className="h-8 w-8"
                          title="Chỉnh sửa"
                          data-testid={`button-edit-event-${index}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteEvent(event.id!)}
                          className="h-8 w-8"
                          title="Xóa"
                          data-testid={`button-delete-event-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-sm text-muted-foreground">
                      <div className="inline-flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span data-testid={`event-date-${index}`}>{new Date(event.eventDate).toLocaleDateString("vi-VN")}</span>
                      </div>
                      {(event.startTime || event.endTime) && (
                        <div className="inline-flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span data-testid={`event-time-${index}`}>
                            {event.startTime || "--:--"}
                            {event.endTime ? ` - ${event.endTime}` : ""}
                          </span>
                        </div>
                      )}
                      <div className="inline-flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span data-testid={`event-location-${index}`}>{event.location || "Chưa có địa điểm"}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                      <Badge className={getStatusClass(event)} data-testid={`event-status-${index}`}>
                        {getStatusText(event)}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          setLocation(`/students?eventId=${event.id}`);
                        }}
                        data-testid={`link-view-attendees-${index}`}
                      >
                        <Users className="h-4 w-4" />
                        Xem sinh viên
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      <EventFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} event={editingEvent} />
    </div>
  );
}
