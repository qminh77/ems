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
import multer from 'multer';
import csvParser from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  setupLocalAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Event routes
  app.get("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const eventData = insertEventSchema.parse({ ...req.body, userId });
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(400).json({ message: "Failed to create event" });
    }
  });

  app.put("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const eventData = insertEventSchema.partial().parse(req.body);
      const event = await storage.updateEvent(eventId, eventData);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(400).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      
      // Generate unique QR code with student ID
      const qrCode = `CHK_${eventId}_${studentId}_${Date.now()}`;
      
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

  // Check-in routes
  app.post("/api/checkin", isAuthenticated, async (req: any, res) => {
    try {
      const { qrCode } = req.body;
      
      if (!qrCode) {
        return res.status(400).json({ message: "QR code is required" });
      }
      
      const attendee = await storage.getAttendeeByQrCode(qrCode);
      if (!attendee) {
        return res.status(404).json({ message: "Invalid QR code or attendee not found" });
      }
      
      const event = await storage.getEventById(attendee.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
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
      
      // Log the action
      await storage.createCheckinLog({
        attendeeId: attendee.id,
        action,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
      });
      
      res.json({
        success: true,
        action,
        message,
        attendee: {
          ...attendee,
          status: newStatus,
        },
        event,
      });
    } catch (error) {
      console.error("Error processing check-in:", error);
      res.status(500).json({ message: "Failed to process check-in" });
    }
  });

  app.get("/api/checkin/recent", isAuthenticated, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const recentCheckins = await storage.getRecentCheckins(limit);
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
        const qrCode = `CHK_${attendee.eventId}_${attendee.studentId}_${Date.now()}`;
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
          const qrCode = `CHK_${eventId}_${attendeeData.studentId}_${Date.now()}`;
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
