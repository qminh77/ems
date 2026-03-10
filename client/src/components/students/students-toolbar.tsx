import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileSpreadsheet, Upload, Users } from "lucide-react";

type StudentsToolbarProps = {
  selectedEventId: string;
  attendeesCount: number;
  isImporting: boolean;
  onImport: () => void;
  onDownloadTemplate: () => void;
  onExportExcel: () => void;
  onAddStudent: () => void;
};

export function StudentsToolbar({
  selectedEventId,
  attendeesCount,
  isImporting,
  onImport,
  onDownloadTemplate,
  onExportExcel,
  onAddStudent,
}: StudentsToolbarProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex flex-wrap items-center gap-2 pt-5 sm:pt-6">
        <Button
          onClick={onImport}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!selectedEventId || isImporting}
          title="Nhập danh sách từ file Excel/CSV"
        >
          <Upload className="h-4 w-4" />
          <span>{isImporting ? "Đang xử lý..." : "Nhập Excel/CSV"}</span>
        </Button>

        <Button
          onClick={onDownloadTemplate}
          variant="outline"
          size="sm"
          className="gap-2"
          title="Tải file mẫu Excel/CSV"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>File mẫu</span>
        </Button>

        <Button
          onClick={onExportExcel}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!selectedEventId || attendeesCount === 0}
          title="Xuất danh sách sinh viên"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Xuất Excel</span>
        </Button>

        <Button
          onClick={onAddStudent}
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
  );
}
