import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Attendee } from "@shared/schema";
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, QrCode, Search, Trash2, UserPlus2, UserX, Users } from "lucide-react";

export type SortKey = "name" | "studentId" | "email" | "faculty" | "major" | "status";
export type StudentStatusFilter = "all" | "checked_in" | "checked_out" | "pending";

type StatusChip = {
  key: StudentStatusFilter;
  label: string;
  count: number;
};

type StudentsListCardProps = {
  attendees: Attendee[];
  filteredAttendees: Attendee[];
  sortedAttendees: Attendee[];
  selectedStudentIds: Set<number>;
  selectAll: boolean;
  searchQuery: string;
  statusFilter: StudentStatusFilter;
  statusChips: StatusChip[];
  sortBy: SortKey;
  sortDirection: "asc" | "desc";
  isBulkDeleting: boolean;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: StudentStatusFilter) => void;
  onSort: (key: SortKey) => void;
  onSelectAll: (checked: boolean) => void;
  onSelectStudent: (studentId: number, checked: boolean) => void;
  onBulkDelete: () => void;
  onShowQR: (student: Attendee) => void;
  onEditStudent: (student: Attendee) => void;
  onDeleteStudent: (studentId: number) => void;
  onAddStudent: () => void;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
};

export function StudentsListCard({
  attendees,
  filteredAttendees,
  sortedAttendees,
  selectedStudentIds,
  selectAll,
  searchQuery,
  statusFilter,
  statusChips,
  sortBy,
  sortDirection,
  isBulkDeleting,
  onSearchChange,
  onStatusFilterChange,
  onSort,
  onSelectAll,
  onSelectStudent,
  onBulkDelete,
  onShowQR,
  onEditStudent,
  onDeleteStudent,
  onAddStudent,
  getStatusColor,
  getStatusText,
}: StudentsListCardProps) {
  const getSortIcon = (key: SortKey) => {
    if (sortBy !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5" />;
    }

    return sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-4 border-b bg-muted/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Danh sách sinh viên</h2>
            {selectedStudentIds.size > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-foreground">Đã chọn {selectedStudentIds.size} sinh viên</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onBulkDelete}
                  disabled={isBulkDeleting}
                  className="flex items-center gap-2"
                  data-testid="button-bulk-delete"
                >
                  <UserX className="h-4 w-4" />
                  {isBulkDeleting ? "Đang xóa..." : `Xóa đã chọn (${selectedStudentIds.size})`}
                </Button>
              </div>
            )}
          </div>

          <div className="flex min-w-0 w-full flex-col gap-2 lg:w-auto lg:items-end">
            <div className="relative w-full lg:w-80 lg:max-w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Tìm kiếm sinh viên..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-9 pl-10"
                data-testid="input-search-students"
              />
            </div>

            <Badge variant="secondary" className="font-normal">
              {sortedAttendees.length}/{attendees.length} sinh viên
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {statusChips.map((chip) => (
            <Button
              key={chip.key}
              type="button"
              size="sm"
              variant={statusFilter === chip.key ? "default" : "outline"}
              className="h-8 gap-2"
              onClick={() => onStatusFilterChange(chip.key)}
            >
              {chip.label}
              <Badge variant="secondary" className="rounded px-1.5 py-0 text-[11px]">
                {chip.count}
              </Badge>
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filteredAttendees.length === 0 ? (
          <Empty className="rounded-none border-0 py-12" data-testid="no-students">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users className="size-5" />
              </EmptyMedia>
              <EmptyTitle>{searchQuery ? "Không tìm thấy sinh viên" : "Chưa có sinh viên nào"}</EmptyTitle>
              <EmptyDescription>
                {searchQuery ? "Thử tìm kiếm với từ khóa khác" : "Hãy thêm sinh viên đầu tiên cho sự kiện này"}
              </EmptyDescription>
            </EmptyHeader>
            {!searchQuery && (
              <EmptyContent>
                <Button onClick={onAddStudent} data-testid="button-add-first-student">
                  <UserPlus2 className="mr-2 h-4 w-4" />
                  Thêm sinh viên đầu tiên
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {sortedAttendees.map((student) => {
                const isSelected = selectedStudentIds.has(student.id!);
                return (
                  <div key={student.id} className={`rounded-lg border p-3 ${isSelected ? "bg-muted/50" : "bg-background"}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectStudent(student.id!, checked as boolean)}
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div>
                          <p className="truncate text-sm font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.studentId || "-"}</p>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>{student.email || "-"}</p>
                          <p>
                            {student.faculty || "-"}
                            {student.major ? ` • ${student.major}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <Badge className={getStatusColor(student.status || "pending")}>{getStatusText(student.status || "pending")}</Badge>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => onShowQR(student)} className="h-8 w-8" title="Hiển thị mã QR">
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => onEditStudent(student)} className="h-8 w-8" title="Chỉnh sửa">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => student.id && onDeleteStudent(student.id)}
                              className="h-8 w-8"
                              title="Xóa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden max-h-[62vh] min-w-0 overflow-x-auto md:block">
              <Table>
                <TableHeader className="bg-muted/40 [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-muted/90">
                  <TableRow>
                    <TableHead className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectAll}
                          onCheckedChange={(checked) => onSelectAll(checked as boolean)}
                          disabled={filteredAttendees.length === 0}
                          data-testid="checkbox-select-all"
                        />
                        <button
                          type="button"
                          onClick={() => onSort("name")}
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
                        onClick={() => onSort("studentId")}
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                      >
                        <span>MSSV/MSNV</span>
                        {getSortIcon("studentId")}
                      </button>
                    </TableHead>
                    <TableHead className="hidden px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground lg:table-cell">
                      <button
                        type="button"
                        onClick={() => onSort("email")}
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                      >
                        <span>Email</span>
                        {getSortIcon("email")}
                      </button>
                    </TableHead>
                    <TableHead className="hidden px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground xl:table-cell">
                      <button
                        type="button"
                        onClick={() => onSort("faculty")}
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                      >
                        <span>Khoa</span>
                        {getSortIcon("faculty")}
                      </button>
                    </TableHead>
                    <TableHead className="hidden px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground xl:table-cell">
                      <button
                        type="button"
                        onClick={() => onSort("major")}
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                      >
                        <span>Ngành</span>
                        {getSortIcon("major")}
                      </button>
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => onSort("status")}
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
                        className={`transition-colors hover:bg-muted/40 ${isSelected ? "bg-muted" : "even:bg-muted/20"}`}
                        data-testid={`student-row-${index}`}
                      >
                        <TableCell className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => onSelectStudent(student.id!, checked as boolean)}
                              data-testid={`checkbox-student-${index}`}
                            />
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-muted">
                              <span className="text-sm font-medium" data-testid={`student-initials-${index}`}>
                                {student.name
                                  .split(" ")
                                  .map((namePart: string) => namePart[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-1">
                              <div className="text-sm font-medium" data-testid={`student-name-${index}`}>
                                {student.name}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap px-4 py-3 text-sm md:table-cell" data-testid={`student-id-${index}`}>
                          {student.studentId || "—"}
                        </TableCell>
                        <TableCell
                          className="hidden whitespace-nowrap px-4 py-3 text-sm text-muted-foreground lg:table-cell"
                          data-testid={`student-email-2-${index}`}
                        >
                          {student.email || "—"}
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap px-4 py-3 text-sm xl:table-cell" data-testid={`student-faculty-${index}`}>
                          {student.faculty || "—"}
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap px-4 py-3 text-sm xl:table-cell" data-testid={`student-major-${index}`}>
                          {student.major || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-4 py-3">
                          <Badge className={getStatusColor(student.status || "pending")} data-testid={`student-status-${index}`}>
                            {getStatusText(student.status || "pending")}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onShowQR(student)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Hiển thị mã QR"
                              data-testid={`button-show-qr-${index}`}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onEditStudent(student)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Chỉnh sửa"
                              data-testid={`button-edit-student-${index}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => student.id && onDeleteStudent(student.id)}
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
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
