import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupLocalAuth } from "./localAuth";
import { insertEventSchema, insertAttendeeSchema } from "@shared/schema";
import QRCode from "qrcode";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import os from "os";
import multer from 'multer';
import csvParser from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { z } from "zod";
import archiver from 'archiver';
import { wsManager } from './websocket';
import { cacheManager } from './cacheManager';

const upload = multer({ storage: multer.memoryStorage() });

// Helper function to generate unique QR code
function generateUniqueQRCode(): string {
  // Generate 10 random digits
  const randomNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
  return `CK_${randomNumber}`;
}

// Helper function to check if QR code exists
async function ensureUniqueQRCode(): Promise<string> {
  let qrCode: string;
  let attempts = 0;
  const maxAttempts = 10;
  
  do {
    qrCode = generateUniqueQRCode();
    const existing = await storage.getAttendeeByQrCode(qrCode);
    if (!existing) {
      return qrCode;
    }
    attempts++;
  } while (attempts < maxAttempts);
  
  // Fallback to timestamp if can't generate unique in 10 attempts
  return `CK_${Date.now()}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  setupLocalAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Support both Replit auth and local auth
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats with caching
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      // Check cache first
      const cacheKey = `stats:${userId}`;
      const cachedStats = cacheManager.get(cacheKey);
      
      if (cachedStats) {
        return res.json(cachedStats);
      }
      
      // If not cached, fetch from database
      const stats = await storage.getDashboardStats(userId);
      
      // Cache for 5 seconds
      cacheManager.set(cacheKey, stats, 5000);
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Event routes
  app.get("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      // Support both Replit auth and local auth
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      const events = await storage.getEventsByUserId(userId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.post("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      // Xử lý chuỗi rỗng cho time fields
      const processedData = {
        ...req.body,
        userId,
        startTime: req.body.startTime === "" ? undefined : req.body.startTime,
        endTime: req.body.endTime === "" ? undefined : req.body.endTime,
      };
      
      const eventData = insertEventSchema.parse(processedData);
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      
      // Trả về thông báo lỗi chi tiết hơn
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dữ liệu không hợp lệ",
          errors: error.errors 
        });
      }
      
      // Kiểm tra lỗi từ database về thời gian
      if (error instanceof Error && error.message.includes('time')) {
        return res.status(400).json({ 
          message: "Định dạng thời gian không hợp lệ. Vui lòng kiểm tra lại thời gian bắt đầu và kết thúc." 
        });
      }
      
      res.status(400).json({ message: "Không thể tạo sự kiện" });
    }
  });

  app.put("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      
      // Xử lý chuỗi rỗng cho time fields
      const processedData = {
        ...req.body,
        startTime: req.body.startTime === "" ? undefined : req.body.startTime,
        endTime: req.body.endTime === "" ? undefined : req.body.endTime,
      };
      
      const eventData = insertEventSchema.partial().parse(processedData);
      const event = await storage.updateEvent(eventId, eventData);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);
      
      // Trả về thông báo lỗi chi tiết hơn
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dữ liệu không hợp lệ",
          errors: error.errors 
        });
      }
      
      // Kiểm tra lỗi từ database về thời gian
      if (error instanceof Error && error.message.includes('time')) {
        return res.status(400).json({ 
          message: "Định dạng thời gian không hợp lệ. Vui lòng kiểm tra lại thời gian bắt đầu và kết thúc." 
        });
      }
      
      res.status(400).json({ message: "Không thể cập nhật sự kiện" });
    }
  });

  app.delete("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      const eventId = parseInt(req.params.id);
      const success = await storage.deleteEvent(eventId, userId);
      if (!success) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Attendee routes
  app.get("/api/events/:eventId/attendees", isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const attendees = await storage.getAttendeesByEventId(eventId);
      res.json(attendees);
    } catch (error) {
      console.error("Error fetching attendees:", error);
      res.status(500).json({ message: "Failed to fetch attendees" });
    }
  });

  app.post("/api/events/:eventId/attendees", isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      
      // Get student ID from request
      const { studentId } = req.body;
      if (!studentId) {
        return res.status(400).json({ message: "MSSV/MSNV là bắt buộc" });
      }
      
      // Generate unique QR code
      const qrCode = await ensureUniqueQRCode();
      
      // Generate QR code as Data URL (stored in database)
      const qrDataUrl = await QRCode.toDataURL(qrCode);
      
      const attendeeData = insertAttendeeSchema.parse({
        ...req.body,
        eventId,
        qrCode,
        qrPath: qrDataUrl,
      });
      
      const attendee = await storage.createAttendee(attendeeData);
      res.status(201).json(attendee);
    } catch (error) {
      console.error("Error creating attendee:", error);
      res.status(400).json({ message: "Failed to create attendee" });
    }
  });

  app.put("/api/attendees/:id", isAuthenticated, async (req: any, res) => {
    try {
      const attendeeId = parseInt(req.params.id);
      const attendeeData = insertAttendeeSchema.partial().parse(req.body);
      const attendee = await storage.updateAttendee(attendeeId, attendeeData);
      if (!attendee) {
        return res.status(404).json({ message: "Attendee not found" });
      }
      res.json(attendee);
    } catch (error) {
      console.error("Error updating attendee:", error);
      res.status(400).json({ message: "Failed to update attendee" });
    }
  });

  app.delete("/api/attendees/:id", isAuthenticated, async (req: any, res) => {
    try {
      const attendeeId = parseInt(req.params.id);
      
      // Get attendee to delete QR file
      const attendee = await storage.getAttendeeById(attendeeId);
      if (attendee?.qrPath) {
        const fullPath = path.join(process.cwd(), attendee.qrPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
      
      const success = await storage.deleteAttendee(attendeeId);
      if (!success) {
        return res.status(404).json({ message: "Attendee not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting attendee:", error);
      res.status(500).json({ message: "Failed to delete attendee" });
    }
  });

  // Bulk delete attendees
  app.delete("/api/attendees/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { attendeeIds } = req.body;
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      if (!attendeeIds || !Array.isArray(attendeeIds) || attendeeIds.length === 0) {
        return res.status(400).json({ message: "Danh sách ID sinh viên không hợp lệ" });
      }

      // Verify user owns all attendees by checking their events
      const attendeesToDelete = await Promise.all(
        attendeeIds.map(async (id: number) => {
          const attendee = await storage.getAttendeeById(id);
          if (!attendee) return null;
          
          const event = await storage.getEventById(attendee.eventId);
          if (!event || event.userId !== userId) {
            return null;
          }
          
          return attendee;
        })
      );

      const validAttendees = attendeesToDelete.filter(Boolean);
      const validIds = validAttendees.map(a => a!.id);

      if (validIds.length === 0) {
        return res.status(403).json({ message: "Bạn không có quyền xóa những sinh viên này" });
      }

      // Delete QR files first
      for (const attendee of validAttendees) {
        if (attendee?.qrPath) {
          const fullPath = path.join(process.cwd(), attendee.qrPath);
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath);
            } catch (error) {
              console.error(`Failed to delete QR file for attendee ${attendee.id}:`, error);
            }
          }
        }
      }

      const result = await storage.deleteMultipleAttendees(validIds);
      
      // Invalidate cache
      cacheManager.invalidate(`stats:${userId}`);
      
      res.json({
        message: `Đã xóa thành công ${result.deletedCount}/${attendeeIds.length} sinh viên`,
        deletedCount: result.deletedCount,
        totalRequested: attendeeIds.length,
        errors: result.errors
      });
    } catch (error) {
      console.error("Error bulk deleting attendees:", error);
      res.status(500).json({ message: "Lỗi khi xóa sinh viên" });
    }
  });

  // Check-in routes
  app.post("/api/checkin", isAuthenticated, async (req: any, res) => {
    try {
      const { qrCode } = req.body;
      const userId = req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      if (!qrCode) {
        return res.status(400).json({ message: "QR code is required" });
      }
      
      // Get attendee and event in single optimized query
      const result = await storage.getAttendeeWithEvent(qrCode);
      if (!result) {
        return res.status(404).json({ message: "Invalid QR code or attendee not found" });
      }
      
      const { attendee, event } = result;
      
      // CRITICAL SECURITY CHECK: Verify user owns this event
      if (event.userId !== userId) {
        return res.status(403).json({ message: "Bạn không có quyền check-in cho sự kiện này" });
      }
      
      let action: 'check_in' | 'check_out';
      let newStatus: string;
      let message: string;
      
      if (attendee.status === 'pending') {
        action = 'check_in';
        newStatus = 'checked_in';
        message = 'Check-in successful!';
        
        await storage.updateAttendee(attendee.id, {
          status: newStatus,
          checkinTime: new Date(),
        });
      } else if (attendee.status === 'checked_in') {
        action = 'check_out';
        newStatus = 'checked_out';
        message = 'Check-out successful!';
        
        await storage.updateAttendee(attendee.id, {
          status: newStatus,
          checkoutTime: new Date(),
        });
      } else {
        return res.status(400).json({ message: "This attendee has already checked out" });
      }
      
      // Prepare response data first
      const responseData = {
        success: true,
        action,
        message,
        attendee: {
          ...attendee,
          status: newStatus,
        },
        event,
      };
      
      // Send response immediately to reduce latency
      res.json(responseData);
      
      // Process logging and broadcasts asynchronously after response
      setImmediate(async () => {
        try {
          // Create checkin log and get stats in parallel
          const [checkinLog, stats] = await Promise.all([
            storage.createCheckinLog({
              attendeeId: attendee.id,
              action,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent') || '',
            }),
            storage.getDashboardStats(userId)
          ]);
          
          // Broadcast all updates at once
          const broadcastData = {
            ...checkinLog,
            attendee: {
              ...attendee,
              status: newStatus,
              checkinTime: action === 'check_in' ? new Date() : attendee.checkinTime,
              checkoutTime: action === 'check_out' ? new Date() : attendee.checkoutTime,
            },
            event,
            action,
            timestamp: new Date(),
          };
          
          // Invalidate cache for this user
          cacheManager.invalidate(`stats:${userId}`);
          
          // Send all broadcasts
          wsManager.broadcastCheckinUpdate(userId, broadcastData);
          wsManager.broadcastStatsUpdate(userId, stats);
          wsManager.broadcastAttendeeUpdate(userId, attendee.eventId, broadcastData.attendee);
        } catch (error) {
          console.error('Error in async checkin processing:', error);
        }
      });
    } catch (error) {
      console.error("Error processing check-in:", error);
      res.status(500).json({ message: "Failed to process check-in" });
    }
  });

  app.get("/api/checkin/recent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      
      const limit = parseInt(req.query.limit as string) || 10;
      const recentCheckins = await storage.getRecentCheckinsByUserId(userId, limit);
      res.json(recentCheckins);
    } catch (error) {
      console.error("Error fetching recent check-ins:", error);
      res.status(500).json({ message: "Failed to fetch recent check-ins" });
    }
  });

  // Get QR code for attendee
  app.get('/api/attendees/:id/qr', isAuthenticated, async (req, res) => {
    const attendeeId = parseInt(req.params.id);
    
    try {
      const attendee = await storage.getAttendeeById(attendeeId);
      if (!attendee) {
        return res.status(404).json({ message: "Sinh viên không tồn tại" });
      }
      
      // Regenerate QR if missing
      if (!attendee.qrCode || !attendee.qrPath) {
        const qrCode = await ensureUniqueQRCode();
        const qrDataUrl = await QRCode.toDataURL(qrCode);
        
        await storage.updateAttendee(attendeeId, {
          qrCode: qrCode,
          qrPath: qrDataUrl
        });
        
        res.json({ qrCode: qrDataUrl });
      } else if (attendee.qrPath?.startsWith('data:')) {
        res.json({ qrCode: attendee.qrPath });
      } else {
        // Generate QR data URL from code
        const qrDataUrl = await QRCode.toDataURL(attendee.qrCode);
        res.json({ qrCode: qrDataUrl });
      }
    } catch (error) {
      console.error('Get QR error:', error);
      res.status(500).json({ message: "Lỗi khi lấy mã QR" });
    }
  });

  // Download template file for bulk import
  // Export attendees with QR codes to Excel
  app.get('/api/events/:eventId/attendees/export', isAuthenticated, async (req: any, res) => {
    const eventId = parseInt(req.params.eventId);
    const userId = req.user?.claims?.sub;
    
    try {
      // Check if event exists and user owns it
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: 'Sự kiện không tồn tại' });
      }
      if (event.userId !== userId) {
        return res.status(403).json({ message: 'Không có quyền thao tác' });
      }
      
      // Get all attendees for the event
      const attendees = await storage.getAttendeesByEventId(eventId);
      
      // Prepare data for Excel
      const excelData = attendees.map((attendee, index) => ({
        'STT': index + 1,
        'Tên': attendee.name,
        'MSSV/MSNV': attendee.studentId || '',
        'Email': attendee.email || '',
        'Khoa': attendee.faculty || '',
        'Ngành': attendee.major || '',
        'Mã QR': attendee.qrCode || '',
        'Trạng thái': attendee.status === 'checked_in' ? 'Đã check-in' : 
                    attendee.status === 'checked_out' ? 'Đã check-out' : 'Chờ check-in',
        'Thời gian check-in': attendee.checkinTime ? new Date(attendee.checkinTime).toLocaleString('vi-VN') : '',
        'Thời gian check-out': attendee.checkoutTime ? new Date(attendee.checkoutTime).toLocaleString('vi-VN') : ''
      }));
      
      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Danh sách sinh viên');
      
      // Set column widths
      const colWidths = [
        { wch: 5 },   // STT
        { wch: 25 },  // Tên
        { wch: 15 },  // MSSV/MSNV
        { wch: 25 },  // Email
        { wch: 20 },  // Khoa
        { wch: 20 },  // Ngành
        { wch: 15 },  // Mã QR
        { wch: 15 },  // Trạng thái
        { wch: 20 },  // Thời gian check-in
        { wch: 20 }   // Thời gian check-out
      ];
      ws['!cols'] = colWidths;
      
      // Generate Excel buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      // Generate filename with event name and date
      const fileName = `DS_SinhVien_${event.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(buffer);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ message: 'Lỗi khi xuất file' });
    }
  });

  // Export attendees with QR images as ZIP file
  app.get('/api/events/:eventId/attendees/export-zip', isAuthenticated, async (req: any, res) => {
    const eventId = parseInt(req.params.eventId);
    const userId = req.user?.claims?.sub;
    
    try {
      // Check if event exists and user owns it
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: 'Sự kiện không tồn tại' });
      }
      if (event.userId !== userId) {
        return res.status(403).json({ message: 'Không có quyền thao tác' });
      }
      
      // Get all attendees for the event
      const attendees = await storage.getAttendeesByEventId(eventId);
      
      // Create temporary directory
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qr-export-'));
      
      try {
        // Prepare data for Excel
        const excelData = attendees.map((attendee, index) => {
          const nameParts = attendee.name.split(' ');
          const formattedName = nameParts.join('_');
          return {
            'STT': index + 1,
            'Tên': attendee.name,
            'MSSV/MSNV': attendee.studentId || '',
            'Email': attendee.email || '',
            'Khoa': attendee.faculty || '',
            'Ngành': attendee.major || '',
            'Mã QR': attendee.qrCode || '',
            'File QR': attendee.qrCode ? `qr-codes/${formattedName}_${attendee.qrCode}.png` : '',
            'Trạng thái': attendee.status === 'checked_in' ? 'Đã check-in' : 
                          attendee.status === 'checked_out' ? 'Đã check-out' : 'Chờ check-in',
            'Thời gian check-in': attendee.checkinTime ? new Date(attendee.checkinTime).toLocaleString('vi-VN') : '',
            'Thời gian check-out': attendee.checkoutTime ? new Date(attendee.checkoutTime).toLocaleString('vi-VN') : ''
          };
        });
        
        // Create workbook and worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Danh sách sinh viên');
        
        // Set column widths
        const colWidths = [
          { wch: 5 },   // STT
          { wch: 25 },  // Tên
          { wch: 15 },  // MSSV/MSNV
          { wch: 25 },  // Email
          { wch: 20 },  // Khoa
          { wch: 20 },  // Ngành
          { wch: 15 },  // Mã QR
          { wch: 30 },  // File QR
          { wch: 15 },  // Trạng thái
          { wch: 20 },  // Thời gian check-in
          { wch: 20 }   // Thời gian check-out
        ];
        ws['!cols'] = colWidths;
        
        // Save Excel file to temp directory
        const excelFileName = `DS_SinhVien_${event.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`;
        const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const excelPath = path.join(tempDir, excelFileName);
        fs.writeFileSync(excelPath, excelBuffer);
        
        // Create QR codes directory
        const qrDir = path.join(tempDir, 'qr-codes');
        fs.mkdirSync(qrDir);
        
        // Generate QR code images
        for (const attendee of attendees) {
          if (attendee.qrCode) {
            // Format tên file: Họ_Tên_CK_XXXXX.png
            const nameParts = attendee.name.split(' ');
            const formattedName = nameParts.join('_');
            const qrImagePath = path.join(qrDir, `${formattedName}_${attendee.qrCode}.png`);
            await QRCode.toFile(qrImagePath, attendee.qrCode);
          }
        }
        
        // Create ZIP file
        const zipFileName = `DS_SinhVien_QR_${event.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.zip`;
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
        
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        archive.on('error', (err) => {
          throw err;
        });
        
        archive.pipe(res);
        
        // Add Excel file to ZIP
        archive.file(excelPath, { name: excelFileName });
        
        // Add QR code images to ZIP
        archive.directory(qrDir, 'qr-codes');
        
        // Finalize the archive
        await archive.finalize();
        
      } finally {
        // Clean up temporary directory
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      
    } catch (error) {
      console.error('Export ZIP error:', error);
      res.status(500).json({ message: 'Lỗi khi xuất file ZIP' });
    }
  });
  
  // Download template file for bulk import
  app.get('/api/attendees/template', async (req, res) => {
    const templateData = [
      {
        'Tên': 'Nguyễn Văn A',
        'MSSV/MSNV': 'SV001',
        'Email': 'nguyenvana@example.com',
        'Khoa': 'Công nghệ thông tin',
        'Ngành': 'Kỹ thuật phần mềm'
      },
      {
        'Tên': 'Trần Thị B',
        'MSSV/MSNV': 'SV002',
        'Email': 'tranthib@example.com',
        'Khoa': 'Kinh tế',
        'Ngành': 'Quản trị kinh doanh'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách sinh viên');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=mau_danh_sach_sinh_vien.xlsx');
    res.send(buffer);
  });

  // Bulk import attendees
  app.post('/api/events/:eventId/attendees/bulk', isAuthenticated, upload.single('file'), async (req: any, res) => {
    const eventId = parseInt(req.params.eventId);
    const file = req.file;
    const userId = req.user?.claims?.sub;

    if (!file) {
      return res.status(400).json({ message: 'Vui lòng chọn file' });
    }

    try {
      // Check if event exists and user owns it
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: 'Sự kiện không tồn tại' });
      }
      if (event.userId !== userId) {
        return res.status(403).json({ message: 'Không có quyền thao tác' });
      }

      let attendeesData: any[] = [];
      
      // Handle CSV files
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        const csvData: any[] = [];
        const stream = Readable.from(file.buffer.toString());
        
        await new Promise((resolve, reject) => {
          stream
            .pipe(csvParser())
            .on('data', (data) => csvData.push(data))
            .on('end', () => resolve(csvData))
            .on('error', reject);
        });
        
        attendeesData = csvData.map((row) => ({
          name: row['Tên'] || row['name'] || '',
          studentId: row['MSSV/MSNV'] || row['studentId'] || '',
          email: row['Email'] || row['email'] || '',
          faculty: row['Khoa'] || row['faculty'] || '',
          major: row['Ngành'] || row['major'] || ''
        }));
      } 
      // Handle Excel files
      else if (
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')
      ) {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        
        attendeesData = data.map((row: any) => ({
          name: row['Tên'] || row['name'] || '',
          studentId: row['MSSV/MSNV'] || row['studentId'] || '',
          email: row['Email'] || row['email'] || '',
          faculty: row['Khoa'] || row['faculty'] || '',
          major: row['Ngành'] || row['major'] || ''
        }));
      } else {
        return res.status(400).json({ message: 'Định dạng file không hợp lệ. Vui lòng sử dụng CSV hoặc Excel' });
      }

      // Validate data
      const validAttendees = attendeesData.filter(a => a.name && a.studentId);
      if (validAttendees.length === 0) {
        return res.status(400).json({ message: 'Không tìm thấy dữ liệu hợp lệ trong file' });
      }

      // Create attendees
      const createdAttendees = [];
      const errors = [];
      
      for (const attendeeData of validAttendees) {
        try {
          // Generate QR code
          const qrCode = await ensureUniqueQRCode();
          const qrDataUrl = await QRCode.toDataURL(qrCode);
          
          const attendee = await storage.createAttendee({
            ...attendeeData,
            eventId,
            qrCode: qrCode,
            qrPath: qrDataUrl
          });
          createdAttendees.push(attendee);
        } catch (error: any) {
          errors.push(`${attendeeData.name} (${attendeeData.studentId}): ${error.message}`);
        }
      }

      res.json({
        message: `Đã thêm ${createdAttendees.length} sinh viên thành công`,
        created: createdAttendees.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Bulk import error:', error);
      res.status(500).json({ message: 'Lỗi khi nhập danh sách sinh viên' });
    }
  });

  // Serve QR code images
  app.get("/uploads/qr_codes/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'uploads', 'qr_codes', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "QR code image not found" });
    }
    
    res.sendFile(filePath);
  });

  const httpServer = createServer(app);
  return httpServer;
}
