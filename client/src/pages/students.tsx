import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import StudentFormModal from "@/components/student-form-modal";
import QRCodeModal from "@/components/qr-code-modal";
import { Upload, Download, FileSpreadsheet, Users, QrCode, Archive, Pencil, Trash2, UserX, UsersIcon, Shield, Calendar, Search, UserPlus2, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { Event, Attendee } from "@shared/schema";
import { CollaboratorsManager } from "@/components/collaborators-manager";

type SortKey = "name" | "studentId" | "email" | "faculty" | "major" | "status";

export default function Students() {
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Attendee | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Attendee | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [activeTab, setActiveTab] = useState<"students" | "collaborators">("students");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isCompactRows, setIsCompactRows] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: attendees = [], isLoading: attendeesLoading } = useQuery<Attendee[]>({
    queryKey: ["/api/events", selectedEventId, "attendees"],
    enabled: !!selectedEventId,
  });

  // Get user role in event
  const { data: eventAccess } = useQuery({
    queryKey: [`/api/events/${selectedEventId}/access`],
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

  // Reset selection when event changes
  useEffect(() => {
    setSelectedStudentIds(new Set());
    setSelectAll(false);
  }, [selectedEventId]);


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

  const bulkDeleteMutation = useMutation({
    mutationFn: async (attendeeIds: number[]) => {
      const response = await apiRequest("DELETE", "/api/attendees/bulk", {
        attendeeIds
      });
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "attendees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setSelectedStudentIds(new Set());
      setSelectAll(false);
      
      toast({
        title: "Thành công",
        description: result.message,
      });
      
      if (result.errors && result.errors.length > 0) {
        console.warn("Some deletions failed:", result.errors);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: "Không thể xóa sinh viên đã chọn",
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

  const handleBulkDelete = async () => {
    if (selectedStudentIds.size === 0) return;
    
    const count = selectedStudentIds.size;
    if (confirm(`Bạn có chắc chắn muốn xóa ${count} sinh viên đã chọn?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedStudentIds));
    }
  };

  const filteredAttendees = useMemo(
    () =>
      attendees.filter((attendee) =>
        attendee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attendee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attendee.studentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attendee.faculty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attendee.major?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [attendees, searchQuery]
  );

  const getSortValue = (attendee: Attendee, key: SortKey) => {
    switch (key) {
      case "name":
        return attendee.name || "";
      case "studentId":
        return attendee.studentId || "";
      case "email":
        return attendee.email || "";
      case "faculty":
        return attendee.faculty || "";
      case "major":
        return attendee.major || "";
      case "status":
        return attendee.status || "pending";
      default:
        return "";
    }
  };

  const sortedAttendees = useMemo(() => {
    return [...filteredAttendees].sort((a, b) => {
      const valueA = getSortValue(a, sortBy);
      const valueB = getSortValue(b, sortBy);
      const comparison = valueA.localeCompare(valueB, "vi", { numeric: true, sensitivity: "base" });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredAttendees, sortBy, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(key);
    setSortDirection("asc");
  };

  const getSortIcon = (key: SortKey) => {
    if (sortBy !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5" />;
    }

    return sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  const handleSelectStudent = (studentId: number, checked: boolean) => {
    const newSelected = new Set(selectedStudentIds);
    if (checked) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudentIds(newSelected);
    
    // Update select all state
    setSelectAll(newSelected.size === filteredAttendees.length && filteredAttendees.length > 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredAttendees.map(s => s.id!));
      setSelectedStudentIds(allIds);
      setSelectAll(true);
    } else {
      setSelectedStudentIds(new Set());
      setSelectAll(false);
    }
  };

  // Update select all state when filtered attendees change
  useEffect(() => {
    if (filteredAttendees.length === 0) {
      setSelectAll(false);
    } else {
      const allCurrentIds = filteredAttendees.map(s => s.id!);
      const selectedCurrentIds = allCurrentIds.filter(id => selectedStudentIds.has(id));
      setSelectAll(selectedCurrentIds.length === allCurrentIds.length);
    }
  }, [filteredAttendees, selectedStudentIds]);

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
        return 'bg-primary text-primary-foreground';
      case 'checked_out':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
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

  const selectedEvent = events.find((e) => e.id?.toString() === selectedEventId);

  if (attendeesLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6" data-testid="students-loading">
        <div className="animate-pulse">
          <div className="mb-8 h-8 w-1/4 rounded bg-muted"></div>
          <div className="h-64 rounded-xl bg-muted"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6" data-testid="page-students">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Quản lý sinh viên</h1>
            <p className="mt-2 text-muted-foreground">Quản lý danh sách tham dự theo từng sự kiện.</p>
          </div>

          <div className="w-full sm:w-[320px]">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger data-testid="select-event-filter">
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
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 pt-6">
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              size="sm"
              className="gap-2"
              title="Tải file mẫu Excel/CSV"
            >
              <Download className="h-4 w-4" />
              <span>File mẫu</span>
            </Button>

            <Button
              onClick={() => {
                if (selectedEventId) {
                  window.location.href = `/api/events/${selectedEventId}/attendees/export`;
                }
              }}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!selectedEventId || attendees.length === 0}
              title="Xuất danh sách kèm mã QR"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Xuất Excel</span>
            </Button>

            <Button
              onClick={() => {
                if (selectedEventId) {
                  window.location.href = `/api/events/${selectedEventId}/attendees/export-zip`;
                }
              }}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!selectedEventId || attendees.length === 0}
              title="Tải file ZIP chứa Excel và tất cả ảnh QR"
              data-testid="button-export-zip"
            >
              <Archive className="h-4 w-4" />
              <span>Tải QR ZIP</span>
            </Button>

            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!selectedEventId || isImporting}
              title="Nhập danh sách từ file Excel/CSV"
            >
              <Upload className="h-4 w-4" />
              <span>{isImporting ? "Đang xử lý..." : "Import Excel/CSV"}</span>
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
              size="sm"
              className="gap-2 sm:ml-auto"
              disabled={!selectedEventId}
              data-testid="button-add-student"
            >
              <Users className="h-4 w-4" />
              <span>Thêm sinh viên</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {!selectedEventId ? (
        <Card className="text-center py-12" data-testid="no-event-selected">
          <CardContent>
            <Calendar className="mx-auto mb-4 h-14 w-14 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">Chọn sự kiện</h3>
            <p className="text-muted-foreground">Vui lòng chọn một sự kiện để xem danh sách sinh viên</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "students" | "collaborators")}>
          <TabsList className="mb-4 grid h-auto w-full grid-cols-2">
            <TabsTrigger value="students" className="flex items-center gap-2 py-2.5">
              <Users className="h-4 w-4" />
              Sinh viên
            </TabsTrigger>
            <TabsTrigger value="collaborators" className="flex items-center gap-2 py-2.5">
              <UsersIcon className="h-4 w-4" />
              Cộng tác viên
              {(eventAccess as any)?.role === 'owner' && <Shield className="ml-1 hidden h-4 w-4 sm:inline-block" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Danh sách sinh viên</h2>
                {selectedEvent && (
                  <p className="text-sm text-muted-foreground" data-testid="selected-event-name">
                    Sự kiện: {selectedEvent.name}
                  </p>
                )}
                {selectedStudentIds.size > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-foreground">
                      Đã chọn {selectedStudentIds.size} sinh viên
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkDelete}
                      disabled={bulkDeleteMutation.isPending}
                      className="flex items-center gap-2"
                      data-testid="button-bulk-delete"
                    >
                      <UserX className="h-4 w-4" />
                      {bulkDeleteMutation.isPending ? "Đang xóa..." : `Xóa đã chọn (${selectedStudentIds.size})`}
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex w-full flex-col gap-2 lg:w-auto lg:items-end">
                <div className="relative w-full lg:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Tìm kiếm sinh viên..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-students"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-normal">
                    {sortedAttendees.length}/{attendees.length} sinh viên
                  </Badge>

                  <div className="flex items-center rounded-md border bg-background p-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={isCompactRows ? "ghost" : "secondary"}
                      className="h-7 px-2 text-xs"
                      onClick={() => setIsCompactRows(false)}
                    >
                      Thoáng
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={isCompactRows ? "secondary" : "ghost"}
                      className="h-7 px-2 text-xs"
                      onClick={() => setIsCompactRows(true)}
                    >
                      Gọn
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {filteredAttendees.length === 0 ? (
              <div className="text-center py-12" data-testid="no-students">
                <Users className="mx-auto mb-4 h-14 w-14 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">
                  {searchQuery ? "Không tìm thấy sinh viên" : "Chưa có sinh viên nào"}
                </h3>
                <p className="mb-6 text-muted-foreground">
                  {searchQuery ? "Thử tìm kiếm với từ khóa khác" : "Hãy thêm sinh viên đầu tiên cho sự kiện này"}
                </p>
                {!searchQuery && (
                  <Button onClick={handleAddStudent} data-testid="button-add-first-student">
                    <UserPlus2 className="mr-2 h-4 w-4" />
                    Thêm sinh viên đầu tiên
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table containerClassName="max-h-[62vh]">
                  <TableHeader className="bg-muted/40 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-muted/90">
                    <TableRow>
                      <TableHead className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectAll}
                            onCheckedChange={handleSelectAll}
                            disabled={filteredAttendees.length === 0}
                            data-testid="checkbox-select-all"
                          />
                          <button
                            type="button"
                            onClick={() => handleSort("name")}
                            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                          >
                            <span>Tên</span>
                            {getSortIcon("name")}
                          </button>
                        </div>
                      </TableHead>
                      <TableHead className="hidden px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground md:table-cell">
                        <button
                          type="button"
                          onClick={() => handleSort("studentId")}
                          className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                        >
                          <span>MSSV/MSNV</span>
                          {getSortIcon("studentId")}
                        </button>
                      </TableHead>
                      <TableHead className="hidden px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground lg:table-cell">
                        <button
                          type="button"
                          onClick={() => handleSort("email")}
                          className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                        >
                          <span>Email</span>
                          {getSortIcon("email")}
                        </button>
                      </TableHead>
                      <TableHead className="hidden px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground xl:table-cell">
                        <button
                          type="button"
                          onClick={() => handleSort("faculty")}
                          className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                        >
                          <span>Khoa</span>
                          {getSortIcon("faculty")}
                        </button>
                      </TableHead>
                      <TableHead className="hidden px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground xl:table-cell">
                        <button
                          type="button"
                          onClick={() => handleSort("major")}
                          className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                        >
                          <span>Ngành</span>
                          {getSortIcon("major")}
                        </button>
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => handleSort("status")}
                          className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                        >
                          <span>Trạng thái</span>
                          {getSortIcon("status")}
                        </button>
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs uppercase tracking-wider text-muted-foreground">
                        Thao tác
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAttendees.map((student, index) => {
                      const isSelected = selectedStudentIds.has(student.id!);
                      return (
                        <TableRow
                          key={student.id} 
                          className={`transition-colors hover:bg-muted/40 ${
                            isSelected ? 'bg-muted' : 'even:bg-muted/20'
                          }`} 
                          data-testid={`student-row-${index}`}
                        >
                          <TableCell className={`whitespace-nowrap px-4 ${isCompactRows ? "py-2" : "py-3"}`}>
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectStudent(student.id!, checked as boolean)}
                                data-testid={`checkbox-student-${index}`}
                              />
                              <div className={`flex items-center justify-center rounded-full border bg-muted ${isCompactRows ? "h-8 w-8" : "h-10 w-10"}`}>
                                <span className="text-sm font-medium" data-testid={`student-initials-${index}`}>
                                  {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div className="ml-1">
                                <div className="text-sm font-medium" data-testid={`student-name-${index}`}>
                                  {student.name}
                                </div>
                                <div className="mt-0.5 text-xs text-muted-foreground md:hidden">
                                  {student.studentId || "—"}
                                  {student.email ? ` • ${student.email}` : ""}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        <TableCell className={`hidden whitespace-nowrap px-4 text-sm md:table-cell ${isCompactRows ? "py-2" : "py-3"}`} data-testid={`student-id-${index}`}>
                          {student.studentId || "—"}
                        </TableCell>
                        <TableCell className={`hidden whitespace-nowrap px-4 text-sm text-muted-foreground lg:table-cell ${isCompactRows ? "py-2" : "py-3"}`} data-testid={`student-email-2-${index}`}>
                          {student.email || "—"}
                        </TableCell>
                        <TableCell className={`hidden whitespace-nowrap px-4 text-sm xl:table-cell ${isCompactRows ? "py-2" : "py-3"}`} data-testid={`student-faculty-${index}`}>
                          {student.faculty || "—"}
                        </TableCell>
                        <TableCell className={`hidden whitespace-nowrap px-4 text-sm xl:table-cell ${isCompactRows ? "py-2" : "py-3"}`} data-testid={`student-major-${index}`}>
                          {student.major || "—"}
                        </TableCell>
                        <TableCell className={`whitespace-nowrap px-4 ${isCompactRows ? "py-2" : "py-3"}`}>
                          <Badge className={getStatusColor(student.status || 'pending')} data-testid={`student-status-${index}`}>
                            {getStatusText(student.status || 'pending')}
                          </Badge>
                        </TableCell>
                        <TableCell className={`whitespace-nowrap px-4 text-right text-sm font-medium ${isCompactRows ? "py-2" : "py-3"}`}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleShowQR(student)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Hiển thị mã QR"
                              data-testid={`button-show-qr-${index}`}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditStudent(student)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Chỉnh sửa"
                              data-testid={`button-edit-student-${index}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => student.id && handleDeleteStudent(student.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Xóa"
                              data-testid={`button-delete-student-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableCaption>
                    Hiển thị {sortedAttendees.length} trên tổng {attendees.length} sinh viên
                  </TableCaption>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="collaborators">
        <CollaboratorsManager eventId={Number(selectedEventId)} userRole={(eventAccess as any)?.role || ''} />
      </TabsContent>
    </Tabs>
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
