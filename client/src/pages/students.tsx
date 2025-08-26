import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import StudentFormModal from "@/components/student-form-modal";
import QRCodeModal from "@/components/qr-code-modal";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";

export default function Students() {
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
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

  const { data: events = [], error: eventsError } = useQuery({
    queryKey: ["/api/events"],
    enabled: isAuthenticated,
  });

  const { data: attendees = [], isLoading: attendeesLoading, error: attendeesError } = useQuery({
    queryKey: ["/api/events", selectedEventId, "attendees"],
    enabled: isAuthenticated && !!selectedEventId,
  });

  useEffect(() => {
    const error = eventsError || attendeesError;
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
  }, [eventsError, attendeesError, toast]);

  // Set default event if URL has eventId parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('eventId');
    if (eventId && events.length > 0) {
      setSelectedEventId(eventId);
    } else if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id.toString());
    }
  }, [events, selectedEventId]);

  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      await apiRequest("DELETE", `/api/attendees/${studentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "attendees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Thành công",
        description: "Đã xóa sinh viên thành công!",
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
        description: "Không thể xóa sinh viên",
        variant: "destructive",
      });
    },
  });

  const handleAddStudent = () => {
    setEditingStudent(null);
    setIsStudentModalOpen(true);
  };

  const handleEditStudent = (student: any) => {
    setEditingStudent(student);
    setIsStudentModalOpen(true);
  };

  const handleDeleteStudent = async (studentId: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa sinh viên này?")) {
      deleteStudentMutation.mutate(studentId);
    }
  };

  const handleShowQR = (student: any) => {
    setSelectedStudent(student);
    setIsQRModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'bg-secondary/10 text-secondary';
      case 'checked_out':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'Đã check-in';
      case 'checked_out':
        return 'Đã check-out';
      default:
        return 'Chờ check-in';
    }
  };

  const filteredAttendees = attendees.filter((attendee: any) =>
    attendee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attendee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attendee.studentId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedEvent = events.find((e: any) => e.id.toString() === selectedEventId);

  if (attendeesLoading) {
    return (
      <div className="p-6" data-testid="students-loading">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="page-students">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý sinh viên</h1>
          <p className="text-gray-600 mt-2">Quản lý thông tin sinh viên tham gia sự kiện</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-64" data-testid="select-event-filter">
              <SelectValue placeholder="Chọn sự kiện" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event: any) => (
                <SelectItem key={event.id} value={event.id.toString()}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleAddStudent}
            className="bg-primary hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            disabled={!selectedEventId}
            data-testid="button-add-student"
          >
            <i className="fas fa-plus"></i>
            <span>Thêm sinh viên</span>
          </Button>
        </div>
      </div>

      {!selectedEventId ? (
        <Card className="text-center py-12" data-testid="no-event-selected">
          <CardContent>
            <i className="fas fa-calendar-alt text-gray-400 text-6xl mb-4"></i>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Chọn sự kiện</h3>
            <p className="text-gray-600">Vui lòng chọn một sự kiện để xem danh sách sinh viên</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-gray-100 overflow-hidden">
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Danh sách sinh viên</h2>
                {selectedEvent && (
                  <p className="text-sm text-gray-600 mt-1" data-testid="selected-event-name">
                    Sự kiện: {selectedEvent.name}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Tìm kiếm sinh viên..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                    data-testid="input-search-students"
                  />
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {filteredAttendees.length === 0 ? (
              <div className="text-center py-12" data-testid="no-students">
                <i className="fas fa-users text-gray-400 text-6xl mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery ? "Không tìm thấy sinh viên" : "Chưa có sinh viên nào"}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery ? "Thử tìm kiếm với từ khóa khác" : "Hãy thêm sinh viên đầu tiên cho sự kiện này"}
                </p>
                {!searchQuery && (
                  <Button onClick={handleAddStudent} data-testid="button-add-first-student">
                    <i className="fas fa-plus mr-2"></i>
                    Thêm sinh viên đầu tiên
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sinh viên
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        MSSV
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lớp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        QR Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAttendees.map((student: any, index: number) => (
                      <tr key={student.id} className="hover:bg-gray-50" data-testid={`student-row-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-primary font-medium text-sm" data-testid={`student-initials-${index}`}>
                                {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900" data-testid={`student-name-${index}`}>
                                {student.name}
                              </div>
                              {student.email && (
                                <div className="text-sm text-gray-500" data-testid={`student-email-${index}`}>
                                  {student.email}
                                </div>
                              )}
                              {student.phone && (
                                <div className="text-sm text-gray-500" data-testid={`student-phone-${index}`}>
                                  {student.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`student-id-${index}`}>
                          {student.studentId || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`student-class-${index}`}>
                          {student.class || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusColor(student.status)} data-testid={`student-status-${index}`}>
                            {getStatusText(student.status)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShowQR(student)}
                            data-testid={`button-show-qr-${index}`}
                          >
                            <i className="fas fa-qrcode mr-1"></i>
                            Xem QR
                          </Button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleEditStudent(student)}
                              className="text-primary hover:text-blue-700"
                              data-testid={`button-edit-student-${index}`}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              onClick={() => handleDeleteStudent(student.id)}
                              className="text-red-600 hover:text-red-800"
                              data-testid={`button-delete-student-${index}`}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <StudentFormModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        student={editingStudent}
        eventId={parseInt(selectedEventId)}
        events={events}
      />

      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        student={selectedStudent}
      />
    </div>
  );
}
