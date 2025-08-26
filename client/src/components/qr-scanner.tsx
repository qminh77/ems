import { useState, useRef, useEffect } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, CameraOff, Upload, QrCode } from "lucide-react";

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
  const animationRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSupported, setIsSupported] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [scanningStatus, setScanningStatus] = useState<string>("Đang quét...");
  const [cameraReady, setCameraReady] = useState(false);

  const startScanning = async () => {
    if (isLoading || hasPermission) {
      console.log("Already loading or has permission, skipping...");
      return;
    }
    
    console.log("Starting scanner...");
    setIsLoading(true);
    setError("");
    setCameraReady(false);
    
    try {
      // Try simpler constraints first
      let stream: MediaStream;
      try {
        console.log("Requesting environment camera...");
        // Try with environment camera first
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        console.log("Environment camera success");
      } catch (envError) {
        console.log("Environment camera failed, trying any camera...", envError);
        // Fallback to any camera
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        console.log("Any camera success");
      }
      
      streamRef.current = stream;
      setHasPermission(true);
      console.log("Stream acquired, permission granted");
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Add timeout for loading
        const loadTimeout = setTimeout(() => {
          setError("Camera tải quá lâu. Vui lòng thử lại.");
          setIsLoading(false);
          stopScanning();
        }, 15000); // 15 second timeout
        
        // Handle video loading events
        const handleVideoReady = () => {
          clearTimeout(loadTimeout);
          console.log("Video ready, dimensions:", videoRef.current?.videoWidth, "x", videoRef.current?.videoHeight);
          setIsLoading(false);
          setCameraReady(true);
          console.log("Camera ready set to true");
          setScanningStatus("Đang quét mã QR...");
          // Start detection after video is ready
          startQRDetection();
        };
        
        const handleVideoError = (error: any) => {
          clearTimeout(loadTimeout);
          console.error("Video error:", error);
          setError("Lỗi khi tải video từ camera");
          setIsLoading(false);
        };
        
        // Set up event listeners
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded");
          handleVideoReady();
        };
        
        videoRef.current.oncanplay = () => {
          console.log("Video can play");
          if (!cameraReady) {
            handleVideoReady();
          }
        };
        
        videoRef.current.onplay = () => {
          console.log("Video playing");
          if (!cameraReady) {
            handleVideoReady();
          }
        };
        
        videoRef.current.onerror = handleVideoError;
        
        // Force play and ready state after a short delay if events don't fire
        setTimeout(async () => {
          if (videoRef.current && !cameraReady) {
            try {
              await videoRef.current.play();
              console.log("Manual play successful");
              // If video is playing but events haven't fired, force ready state
              if (videoRef.current.readyState >= 2) {
                console.log("Forcing camera ready state");
                handleVideoReady();
              }
            } catch (playError) {
              console.error("Manual play failed:", playError);
              // Try one more time
              setTimeout(() => {
                if (videoRef.current && !cameraReady) {
                  videoRef.current.play().then(() => {
                    console.log("Second manual play successful");
                    // Force ready after successful play
                    setTimeout(() => {
                      if (!cameraReady && videoRef.current?.readyState >= 2) {
                        console.log("Force setting camera ready after successful play");
                        handleVideoReady();
                      }
                    }, 500);
                  }).catch(() => {
                    setError("Không thể phát video từ camera. Vui lòng thử lại.");
                    setIsLoading(false);
                  });
                }
              }, 1000);
            }
          }
        }, 1000);
        
        // Force ready state after 1.5 seconds if we have stream
        setTimeout(() => {
          if (streamRef.current && videoRef.current && !cameraReady) {
            console.log("Force clearing loading state after 1.5s");
            setIsLoading(false);
            setCameraReady(true);
            setScanningStatus("Đang quét mã QR...");
            console.log("Force set camera ready = true");
            startQRDetection();
          }
        }, 1500);
        
      }
    } catch (err: any) {
      setIsLoading(false);
      setHasPermission(false);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Bạn đã từ chối quyền truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError("Không tìm thấy camera. Vui lòng kiểm tra thiết bị của bạn.");
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError("Camera đang được sử dụng bởi ứng dụng khác.");
      } else if (err.name === 'OverconstrainedError') {
        setError("Camera không hỗ trợ cài đặt được yêu cầu.");
      } else {
        setError("Không thể truy cập camera: " + (err.message || "Lỗi không xác định"));
      }
      console.error("Camera access error:", err);
    }
  };

  const stopScanning = () => {
    // Stop animation frame
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    
    // Stop all video tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setHasPermission(false);
    setCameraReady(false);
    setScanningStatus("Đã dừng quét");
  };

  const startQRDetection = () => {
    console.log("Starting QR detection...");
    
    const detectFrame = () => {
      if (!videoRef.current || !canvasRef.current) {
        console.log("Video or canvas not ready");
        animationRef.current = requestAnimationFrame(detectFrame);
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Check if video is actually playing and has dimensions
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        console.log("Video not ready, state:", video.readyState, "dimensions:", video.videoWidth, "x", video.videoHeight);
        animationRef.current = requestAnimationFrame(detectFrame);
        return;
      }
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        console.log("Canvas context not available");
        animationRef.current = requestAnimationFrame(detectFrame);
        return;
      }
      
      // Set canvas size to match video
      const width = video.videoWidth;
      const height = video.videoHeight;
      canvas.width = width;
      canvas.height = height;
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, width, height);
      
      try {
        // Get image data for QR detection
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Try multiple inversion attempts for better detection
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth"  // Try both inverted and normal
        });
        
        if (code && code.data) {
          // QR code found!
          console.log("QR Code detected:", code.data);
          setScanningStatus("Đã tìm thấy mã QR!");
          
          // Stop scanning first
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = 0;
          }
          
          // Call the scan handler
          onScan(code.data);
          
          // Stop camera and deactivate
          setTimeout(() => {
            stopScanning();
            onDeactivate();
          }, 100);
          
          return; // Exit the detection loop
        }
      } catch (error) {
        console.error("Error detecting QR code:", error);
      }
      
      // Continue scanning
      animationRef.current = requestAnimationFrame(detectFrame);
    };
    
    // Start detection loop after a small delay
    setTimeout(() => {
      console.log("Starting detection loop...");
      detectFrame();
    }, 100);
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
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          onScan(code.data);
          setError("");
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
    const checkSupport = async () => {
      try {
        const hasMediaDevices = !!navigator.mediaDevices?.getUserMedia;
        setIsSupported(hasMediaDevices);
        
        if (hasMediaDevices) {
          // Check if we have any video devices
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasVideoDevice = devices.some(device => device.kind === 'videoinput');
          setIsSupported(hasVideoDevice);
        }
      } catch {
        setIsSupported(false);
      }
    };
    
    checkSupport();
    
    // Cleanup on unmount
    return () => {
      stopScanning();
    };
  }, []);

  useEffect(() => {
    if (active) {
      if (!hasPermission && !isLoading) {
        console.log("Starting camera scan...");
        startScanning();
      }
    } else {
      if (hasPermission) {
        console.log("Stopping camera scan...");
        stopScanning();
      }
    }
  }, [active]);

  if (!isSupported) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <QrCode className="h-12 w-12 text-red-500 mb-4 mx-auto" />
          <p className="text-gray-600 font-medium">Camera không khả dụng</p>
          <p className="text-sm text-gray-500 mt-2">Vui lòng sử dụng nhập thủ công hoặc tải ảnh QR</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="qr-scanner">
      {/* Scanner Display */}
      <div className="relative mx-auto w-full max-w-md aspect-square bg-black rounded-lg overflow-hidden">
        {active ? (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
              autoPlay
              data-testid="scanner-video"
            />
            <canvas
              ref={canvasRef}
              className="hidden"
              aria-hidden="true"
            />
            
            {/* Scanning Overlay */}
            {hasPermission && (
              <>
                <div className="absolute inset-0 bg-black bg-opacity-40">
                  {/* Scanning Frame */}
                  <div className="absolute inset-12 border-2 border-white rounded-lg">
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                  </div>
                  
                  {/* Scanning Line Animation */}
                  <div className="absolute inset-12">
                    <div className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan"></div>
                  </div>
                </div>
                
                {/* Status Text */}
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <p className="text-white bg-black bg-opacity-60 px-4 py-2 rounded-full text-sm inline-block">
                    {scanningStatus}
                  </p>
                </div>
              </>
            )}
            
            {/* Loading Overlay - only show when actually loading */}
            {isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center pointer-events-none">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-sm">Đang khởi động camera...</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-900">
            <div className="text-center text-gray-300">
              <QrCode className="h-16 w-16 mb-4 mx-auto opacity-50" />
              <p className="text-lg">Nhấn nút bên dưới để bật camera</p>
              <p className="text-sm opacity-75 mt-2">Hoặc tải lên ảnh có mã QR</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm text-center">{error}</p>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-3 justify-center">
        {!active ? (
          <>
            <Button
              onClick={onActivate}
              className="flex items-center gap-2"
              data-testid="button-start-camera"
            >
              <Camera className="h-4 w-4" />
              <span>Bật camera</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
              data-testid="button-upload-qr"
            >
              <Upload className="h-4 w-4" />
              <span>Tải ảnh QR</span>
            </Button>
          </>
        ) : (
          <Button
            onClick={onDeactivate}
            variant="destructive"
            className="flex items-center gap-2"
            data-testid="button-stop-camera"
          >
            <CameraOff className="h-4 w-4" />
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
      <div className="text-center text-sm text-gray-500 space-y-1">
        <p>💡 Giữ mã QR trong khung vuông để quét tốt nhất</p>
        {active && cameraReady && (
          <>
            <p className="text-primary font-medium animate-pulse">🔍 Đang tìm mã QR...</p>
            <p className="text-xs">Camera đang hoạt động - Di chuyển mã QR vào khung hình</p>
          </>
        )}
        {active && !cameraReady && isLoading && (
          <p className="text-xs text-orange-500">⏳ Đang khởi động camera...</p>
        )}
      </div>
    </div>
  );
}