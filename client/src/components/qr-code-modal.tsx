import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, QrCode } from "lucide-react";
import type { Attendee } from "@shared/schema";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Attendee | null;
}

export default function QRCodeModal({ isOpen, onClose, student }: QRCodeModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (student && isOpen) {
      fetchQRCode();
    }
  }, [student, isOpen]);
  
  const fetchQRCode = async () => {
    if (!student) return;
    
    setLoading(true);
    try {
      // If we have a data URL, use it directly
      if (student.qrPath?.startsWith('data:')) {
        setQrCodeUrl(student.qrPath);
        setLoading(false);
        return;
      }
      
      // Otherwise fetch from server
      const response = await fetch(`/api/attendees/${student.id}/qr`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setQrCodeUrl(data.qrCode || '');
      }
    } catch (error) {
      console.error('Error fetching QR code:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const handleDownload = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `QR_${student.name}_${student.studentId || student.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && qrCodeUrl) {
      const safeName = escapeHtml(student.name || "");
      const safeStudentId = escapeHtml(student.studentId || "—");
      const safeEmail = escapeHtml(student.email || "—");
      const safeFaculty = escapeHtml(student.faculty || "—");
      const safeMajor = escapeHtml(student.major || "—");

      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${safeName}</title>
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
              <h2>${safeName}</h2>
              <div class="info">
                <p><strong>MSSV/MSNV:</strong> ${safeStudentId}</p>
                <p><strong>Email:</strong> ${safeEmail}</p>
                <p><strong>Khoa:</strong> ${safeFaculty}</p>
                <p><strong>Ngành:</strong> ${safeMajor}</p>
              </div>
              <img src="${qrCodeUrl}" alt="QR Code" />
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
            <h3 className="mb-2 font-semibold" data-testid="qr-student-name">
              {student.name}
            </h3>
            <p className="text-sm text-muted-foreground" data-testid="qr-student-id">
              MSSV/MSNV: {student.studentId || "—"}
            </p>
            <p className="text-sm text-muted-foreground" data-testid="qr-student-email">
              Email: {student.email || "—"}
            </p>
            <p className="text-sm text-muted-foreground" data-testid="qr-student-faculty">
              Khoa: {student.faculty || "—"}
            </p>
            <p className="text-sm text-muted-foreground" data-testid="qr-student-major">
              Ngành: {student.major || "—"}
            </p>
          </div>
          
          {/* QR Code Display */}
          <div className="flex justify-center mb-6">
            {loading ? (
              <div className="flex h-64 w-64 items-center justify-center rounded-lg border bg-muted/30">
                <div className="text-center text-muted-foreground">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-sm">Đang tải mã QR...</p>
                </div>
              </div>
            ) : qrCodeUrl ? (
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="h-64 w-64 rounded-lg border object-contain bg-background p-2"
                data-testid="qr-code-image"
              />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-lg border bg-muted/30">
                <div className="text-center text-muted-foreground">
                  <QrCode className="h-16 w-16 mb-2 mx-auto" />
                  <p className="text-sm">Mã QR không khả dụng</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center space-x-4">
            <Button 
              onClick={handleDownload}
              disabled={!qrCodeUrl || loading}
              className="flex items-center gap-2"
              data-testid="button-download-qr"
            >
              <Download className="h-4 w-4" />
              Tải xuống
            </Button>
            <Button 
              variant="outline"
              onClick={handlePrint}
              disabled={!qrCodeUrl || loading}
              className="flex items-center gap-2"
              data-testid="button-print-qr"
            >
              <Printer className="h-4 w-4" />
              In
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
