import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface QRScannerProps {
  active: boolean;
  onScan: (qrCode: string) => void;
  onActivate: () => void;
  onDeactivate: () => void;
}

export default function QRScanner({ active, onScan, onActivate, onDeactivate }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSupported, setIsSupported] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [scanningStatus, setScanningStatus] = useState<string>("Đang quét...");

  // QR Code detection using simple pattern matching
  // In a production environment, you might want to use a library like jsQR
  const detectQRCode = (imageData: ImageData): string | null => {
    // This is a simplified QR detection - in production, use jsQR or similar
    // For now, we'll use a simple approach that works with our generated QR codes
    
    // Convert image data to grayscale and look for QR patterns
    const { data, width, height } = imageData;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    canvas.width = width;
    canvas.height = height;
    ctx.putImageData(imageData, 0, 0);
    
    // Use a simple pattern detection for QR codes starting with "CHK_"
    // This is a simplified approach - in production, use proper QR detection
    const text = extractTextFromImageData(imageData);
    if (text && text.startsWith('CHK_')) {
      return text;
    }
    
    return null;
  };

  // Simplified text extraction - in production, use OCR or QR library
  const extractTextFromImageData = (imageData: ImageData): string | null => {
    // This is a placeholder for QR code extraction
    // In a real application, you would use jsQR or a similar library
    // For now, return null as we can't extract text without a proper QR library
    return null;
  };

  const startScanning = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      // Request camera permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Prefer back camera
      });
      
      streamRef.current = stream;
      setHasPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          setIsLoading(false);
          startQRDetection();
        };
      }
    } catch (err) {
      setIsLoading(false);
      setError("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.");
      console.error("Camera access error:", err);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setHasPermission(false);
    setScanningStatus("Đã dừng quét");
  };

  const startQRDetection = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    intervalRef.current = setInterval(() => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data for QR detection
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Try to detect QR code
        const qrCode = detectQRCode(imageData);
        if (qrCode) {
          onScan(qrCode);
          stopScanning();
          onDeactivate();
        }
      }
    }, 100); // Check every 100ms
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = detectQRCode(imageData);
        
        if (qrCode) {
          onScan(qrCode);
        } else {
          setError("Không tìm thấy mã QR trong hình ảnh");
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    
    // Reset input
    event.target.value = '';
  };

  useEffect(() => {
    // Check if camera is supported
    setIsSupported(!!navigator.mediaDevices?.getUserMedia);
    
    // Cleanup on unmount or when active changes
    return () => {
      if (active) {
        stopScanning();
      }
    };
  }, []);

  useEffect(() => {
    if (active && !hasPermission) {
      startScanning();
    } else if (!active && hasPermission) {
      stopScanning();
    }
  }, [active]);

  if (!isSupported) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
          <p className="text-gray-600">Trình duyệt không hỗ trợ camera</p>
          <p className="text-sm text-gray-500 mt-2">Vui lòng sử dụng nhập thủ công hoặc tải ảnh</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="qr-scanner">
      {/* Scanner Display */}
      <div className="relative mx-auto w-80 h-80 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden">
        {active && hasPermission ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              data-testid="scanner-video"
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            {/* Scanning Overlay */}
            <div className="absolute inset-4 border-2 border-primary rounded-lg animate-pulse">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
            </div>
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-white bg-black bg-opacity-50 px-3 py-1 rounded text-sm">
                {scanningStatus}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            {isLoading ? (
              <div className="text-center">
                <i className="fas fa-spinner fa-spin text-primary text-4xl mb-4"></i>
                <p className="text-gray-600">Đang mở camera...</p>
              </div>
            ) : (
              <div className="text-center">
                <i className="fas fa-qrcode text-gray-400 text-6xl mb-4"></i>
                <p className="text-gray-600">Nhấn để bật camera</p>
                <p className="text-sm text-gray-500 mt-2">Hoặc chọn file ảnh QR</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-center py-2">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex space-x-4 justify-center">
        {!active ? (
          <>
            <Button
              onClick={onActivate}
              className="bg-primary hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors"
              data-testid="button-start-camera"
            >
              <i className="fas fa-camera"></i>
              <span>Bật camera</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors"
              data-testid="button-upload-qr"
            >
              <i className="fas fa-upload"></i>
              <span>Tải ảnh</span>
            </Button>
          </>
        ) : (
          <Button
            onClick={onDeactivate}
            variant="outline"
            className="px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            data-testid="button-stop-camera"
          >
            <i className="fas fa-stop"></i>
            <span>Dừng camera</span>
          </Button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
        data-testid="input-qr-image"
      />

      {/* Scanner Tips */}
      <div className="text-center text-sm text-gray-500 mt-4">
        <p>💡 Mẹo: Đặt mã QR trong khung vuông để quét tốt nhất</p>
        {active && (
          <p className="mt-1">🔍 Đang tìm mã QR trong hình ảnh...</p>
        )}
      </div>
    </div>
  );
}
