import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import QRCodeModal from "@/components/qr-code-modal";
import StudentFormModal from "@/components/student-form-modal";
import {
  SortKey,
  StudentsListCard,
  StudentStatusFilter,
} from "@/components/students/students-list-card";
import { StudentsToolbar } from "@/components/students/students-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Attendee, Event } from "@shared/schema";
import { Calendar } from "lucide-react";

export default function Students() {
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Attendee | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Attendee | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: attendees = [], isLoading: attendeesLoading } = useQuery<Attendee[]>({
    queryKey: ["/api/events", selectedEventId, "attendees"],
    enabled: !!selectedEventId,
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get("eventId");

    if (eventId && events.length > 0) {
      setSelectedEventId(eventId);
      return;
    }

    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id!.toString());
    }
  }, [events, selectedEventId]);

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
      toast({ title: "Thành công", description: "Đã xóa sinh viên thành công!" });
    },
    onError: () => {
      toast({ title: "Lỗi", description: "Không thể xóa sinh viên", variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (attendeeIds: number[]) => {
      const response = await apiRequest("POST", "/api/attendees/bulk-delete", { attendeeIds });
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "attendees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setSelectedStudentIds(new Set());
      setSelectAll(false);
      toast({ title: "Thành công", description: result.message });
    },
    onError: (error: Error) => {
      const message = error.message.includes(":") ? error.message.split(":").slice(1).join(":").trim() : "Không thể xóa sinh viên đã chọn";
      toast({ title: "Lỗi", description: message, variant: "destructive" });
    },
  });

  const filteredAttendees = useMemo(
    () =>
      attendees.filter((attendee) => {
        const attendeeStatus = attendee.status || "pending";
        const normalizedQuery = searchQuery.toLowerCase();

        const matchesStatus = statusFilter === "all" || attendeeStatus === statusFilter;
        const matchesQuery =
          attendee.name.toLowerCase().includes(normalizedQuery) ||
          attendee.email?.toLowerCase().includes(normalizedQuery) ||
          attendee.studentId?.toLowerCase().includes(normalizedQuery) ||
          attendee.faculty?.toLowerCase().includes(normalizedQuery) ||
          attendee.major?.toLowerCase().includes(normalizedQuery);

        return matchesStatus && matchesQuery;
      }),
    [attendees, searchQuery, statusFilter]
  );

  const sortedAttendees = useMemo(() => {
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

    return [...filteredAttendees].sort((a, b) => {
      const valueA = getSortValue(a, sortBy);
      const valueB = getSortValue(b, sortBy);
      const comparison = valueA.localeCompare(valueB, "vi", { numeric: true, sensitivity: "base" });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredAttendees, sortBy, sortDirection]);

  const attendeeSummary = useMemo(() => {
    return attendees.reduce(
      (acc, attendee) => {
        const status = attendee.status || "pending";
        acc.total += 1;

        if (status === "checked_in") {
          acc.checkedIn += 1;
        } else if (status === "checked_out") {
          acc.checkedOut += 1;
        } else {
          acc.pending += 1;
        }

        return acc;
      },
      { total: 0, checkedIn: 0, checkedOut: 0, pending: 0 }
    );
  }, [attendees]);

  const statusChips: { key: StudentStatusFilter; label: string; count: number }[] = [
    { key: "all", label: "Tất cả", count: attendeeSummary.total },
    { key: "checked_in", label: "Đã check-in", count: attendeeSummary.checkedIn },
    { key: "checked_out", label: "Đã check-out", count: attendeeSummary.checkedOut },
    { key: "pending", label: "Chờ check-in", count: attendeeSummary.pending },
  ];

  useEffect(() => {
    if (filteredAttendees.length === 0) {
      setSelectAll(false);
      return;
    }

    const allCurrentIds = filteredAttendees.map((student) => student.id!);
    const selectedCurrentIds = allCurrentIds.filter((id) => selectedStudentIds.has(id));
    setSelectAll(selectedCurrentIds.length === allCurrentIds.length);
  }, [filteredAttendees, selectedStudentIds]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortBy(key);
    setSortDirection("asc");
  };

  const handleSelectStudent = (studentId: number, checked: boolean) => {
    const newSelected = new Set(selectedStudentIds);

    if (checked) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }

    setSelectedStudentIds(newSelected);
    setSelectAll(newSelected.size === filteredAttendees.length && filteredAttendees.length > 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(new Set(filteredAttendees.map((student) => student.id!)));
      setSelectAll(true);
      return;
    }

    setSelectedStudentIds(new Set());
    setSelectAll(false);
  };

  const handleAddStudent = () => {
    setEditingStudent(null);
    setIsStudentModalOpen(true);
  };

  const handleEditStudent = (student: Attendee) => {
    setEditingStudent(student);
    setIsStudentModalOpen(true);
  };

  const handleShowQR = (student: Attendee) => {
    setSelectedStudent(student);
    setIsQRModalOpen(true);
  };

  const handleDeleteStudent = (studentId: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa sinh viên này?")) {
      deleteStudentMutation.mutate(studentId);
    }
  };

  const handleBulkDelete = () => {
    if (selectedStudentIds.size === 0) return;

    const count = selectedStudentIds.size;
    if (confirm(`Bạn có chắc chắn muốn xóa ${count} sinh viên đã chọn?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedStudentIds));
    }
  };

  const handleDownloadTemplate = () => {
    window.open("/api/attendees/template", "_blank");
  };

  const handleExportExcel = () => {
    if (!selectedEventId) return;
    window.location.href = `/api/events/${selectedEventId}/attendees/export`;
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsImporting(true);
    try {
      const response = await fetch(`/api/events/${selectedEventId}/attendees/bulk`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Import thất bại");
      }

      const result = await response.json();
      toast({ title: "Thành công", description: result.message });

      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "attendees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    } catch (error: any) {
      toast({ title: "Lỗi", description: error.message || "Không thể import danh sách", variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "checked_in":
        return "bg-primary text-primary-foreground";
      case "checked_out":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "checked_in":
        return "Đã check-in";
      case "checked_out":
        return "Đã check-out";
      default:
        return "Chờ check-in";
    }
  };

  if (attendeesLoading) {
    return (
      <div className="page-shell" data-testid="students-loading">
        <div className="animate-pulse">
          <div className="mb-8 h-8 w-1/4 rounded bg-muted" />
          <div className="h-64 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell min-w-0" data-testid="page-students">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="page-title">Quản lý sinh viên</h1>

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

        <StudentsToolbar
          selectedEventId={selectedEventId}
          attendeesCount={attendees.length}
          isImporting={isImporting}
          onImport={() => fileInputRef.current?.click()}
          onDownloadTemplate={handleDownloadTemplate}
          onExportExcel={handleExportExcel}
          onAddStudent={handleAddStudent}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>

      {!selectedEventId ? (
        <Card className="py-12 text-center" data-testid="no-event-selected">
          <CardContent>
            <Calendar className="mx-auto mb-4 h-14 w-14 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">Chọn sự kiện</h3>
            <p className="text-muted-foreground">Vui lòng chọn một sự kiện để xem danh sách sinh viên</p>
          </CardContent>
        </Card>
      ) : (
        <StudentsListCard
          attendees={attendees}
          filteredAttendees={filteredAttendees}
          sortedAttendees={sortedAttendees}
          selectedStudentIds={selectedStudentIds}
          selectAll={selectAll}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          statusChips={statusChips}
          sortBy={sortBy}
          sortDirection={sortDirection}
          isBulkDeleting={bulkDeleteMutation.isPending}
          onSearchChange={setSearchQuery}
          onStatusFilterChange={setStatusFilter}
          onSort={handleSort}
          onSelectAll={handleSelectAll}
          onSelectStudent={handleSelectStudent}
          onBulkDelete={handleBulkDelete}
          onShowQR={handleShowQR}
          onEditStudent={handleEditStudent}
          onDeleteStudent={handleDeleteStudent}
          onAddStudent={handleAddStudent}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
        />
      )}

      <StudentFormModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        student={editingStudent}
        eventId={Number.parseInt(selectedEventId || "0", 10)}
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
