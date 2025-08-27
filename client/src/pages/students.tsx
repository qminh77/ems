import { useState, useEffect, useRef } from "react";
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
import { Upload, Download, FileSpreadsheet, Users, QrCode, Archive, Pencil, Trash2 } from "lucide-react";
import type { Event, Attendee } from "@shared/schema";

export default function Students() {
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Attendee | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Attendee | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: attendees = [], isLoading: attendeesLoading } = useQuery<Attendee[]>({
    queryKey: ["/api/events", selectedEventId, "attendees"],
    enabled: !!selectedEventId,
  });

  // Set default event if URL has eventId parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('eventId');
    if (eventId && events.length > 0) {
      setSelectedEventId(eventId);
    } else if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id!.toString());
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

  const handleEditStudent = (student: Attendee) => {
    setEditingStudent(student);
    setIsStudentModalOpen(true);
  };

  const handleDeleteStudent = async (studentId: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa sinh viên này?")) {
      deleteStudentMutation.mutate(studentId);
    }
  };

  const handleShowQR = (student: Attendee) => {
    setSelectedStudent(student);
    setIsQRModalOpen(true);
  };

  const handleDownloadTemplate = () => {
    window.open('/api/attendees/template', '_blank');
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsImporting(true);
    try {
      const response = await fetch(`/api/events/${selectedEventId}/attendees/bulk`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import thất bại');
      }

      const result = await response.json();
      toast({
        title: "Thành công",
        description: result.message,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "attendees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      if (result.errors && result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể import danh sách",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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

  const filteredAttendees = attendees.filter((attendee) =>
    attendee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attendee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attendee.studentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attendee.faculty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attendee.major?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedEvent = events.find((e) => e.id?.toString() === selectedEventId);

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
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-64" data-testid="select-event-filter">
              <SelectValue placeholder="Chọn sự kiện" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id!.toString()}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
              title="Tải file mẫu Excel/CSV"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">File mẫu</span>
            </Button>
            <Button
              onClick={() => {
                if (selectedEventId) {
                  window.location.href = `/api/events/${selectedEventId}/attendees/export`;
                }
              }}
              variant="outline"
              className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
              disabled={!selectedEventId || attendees.length === 0}
              title="Xuất danh sách kèm mã QR"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">Xuất Excel</span>
            </Button>
            <Button
              onClick={() => {
                if (selectedEventId) {
                  window.location.href = `/api/events/${selectedEventId}/attendees/export-zip`;
                }
              }}
              variant="outline"
              className="flex items-center gap-2 border-blue-300 hover:bg-blue-50 text-blue-700 border-2"
              disabled={!selectedEventId || attendees.length === 0}
              title="Tải file ZIP chứa Excel và tất cả ảnh QR"
              data-testid="button-export-zip"
            >
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Tải QR ZIP</span>
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
              disabled={!selectedEventId || isImporting}
              title="Nhập danh sách từ file Excel/CSV"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">{isImporting ? 'Đang xử lý...' : 'Import Excel/CSV'}</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportFile}
              className="hidden"
            />
            <Button 
              onClick={handleAddStudent}
              className="bg-primary hover:bg-blue-700 text-white px-4 sm:px-6 py-3 rounded-lg font-semibold flex items-center gap-2 shadow-lg transition-all hover:shadow-xl"
              disabled={!selectedEventId}
              data-testid="button-add-student"
            >
              <Users className="h-5 w-5" />
              <span className="hidden sm:inline">Thêm sinh viên</span>
              <span className="sm:hidden">Thêm</span>
            </Button>
          </div>
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
        <Card className="border border-gray-200 shadow-lg overflow-hidden">
          <CardHeader className="border-b border-gray-200 bg-gray-50">
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
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tên
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        MSSV/MSNV
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Khoa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ngành
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAttendees.map((student, index) => (
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
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`student-id-${index}`}>
                          {student.studentId || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-testid={`student-email-2-${index}`}>
                          {student.email || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`student-faculty-${index}`}>
                          {student.faculty || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`student-major-${index}`}>
                          {student.major || "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusColor(student.status || 'pending')} data-testid={`student-status-${index}`}>
                            {getStatusText(student.status || 'pending')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleShowQR(student)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Hiển thị mã QR"
                              data-testid={`button-show-qr-${index}`}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditStudent(student)}
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              title="Chỉnh sửa"
                              data-testid={`button-edit-student-${index}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteStudent(student.id!)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Xóa"
                              data-testid={`button-delete-student-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
