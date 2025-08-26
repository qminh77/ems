import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: any;
}

export default function QRCodeModal({ isOpen, onClose, student }: QRCodeModalProps) {
  if (!student) return null;

  const handleDownload = () => {
    if (student.qrPath) {
      const link = document.createElement('a');
      link.href = `/${student.qrPath}`;
      link.download = `QR_${student.name}_${student.studentId || student.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && student.qrPath) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${student.name}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 20px; 
              }
              .qr-container {
                max-width: 300px;
                margin: 0 auto;
              }
              img {
                max-width: 100%;
                border: 1px solid #ddd;
                border-radius: 8px;
              }
              .info {
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h2>${student.name}</h2>
              <div class="info">
                <p><strong>MSSV:</strong> ${student.studentId || "—"}</p>
                <p><strong>Lớp:</strong> ${student.class || "—"}</p>
              </div>
              <img src="/${student.qrPath}" alt="QR Code" />
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="qr-code-modal">
        <DialogHeader>
          <DialogTitle>Mã QR sinh viên</DialogTitle>
        </DialogHeader>
        
        <div className="text-center">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2" data-testid="qr-student-name">
              {student.name}
            </h3>
            <p className="text-sm text-gray-600" data-testid="qr-student-id">
              MSSV: {student.studentId || "—"}
            </p>
            <p className="text-sm text-gray-600" data-testid="qr-student-class">
              Lớp: {student.class || "—"}
            </p>
          </div>
          
          {/* QR Code Display */}
          <div className="flex justify-center mb-6">
            {student.qrPath ? (
              <img 
                src={`/${student.qrPath}`} 
                alt="QR Code" 
                className="border border-gray-200 rounded-lg w-48 h-48"
                data-testid="qr-code-image"
              />
            ) : (
              <div className="w-48 h-48 border border-gray-200 rounded-lg flex items-center justify-center bg-gray-100">
                <div className="text-center text-gray-500">
                  <i className="fas fa-qrcode text-4xl mb-2"></i>
                  <p className="text-sm">QR không khả dụng</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center space-x-4">
            <Button 
              onClick={handleDownload}
              disabled={!student.qrPath}
              data-testid="button-download-qr"
            >
              <i className="fas fa-download mr-2"></i>
              Tải xuống
            </Button>
            <Button 
              variant="outline"
              onClick={handlePrint}
              disabled={!student.qrPath}
              data-testid="button-print-qr"
            >
              <i className="fas fa-print mr-2"></i>
              In
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
