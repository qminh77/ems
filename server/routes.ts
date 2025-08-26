import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertEventSchema, insertAttendeeSchema } from "@shared/schema";
import QRCode from "qrcode";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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
      
      // Generate unique QR code
      const qrCode = `CHK_${eventId}_${randomUUID()}`;
      
      // Create QR code directory if it doesn't exist
      const qrDir = path.join(process.cwd(), 'uploads', 'qr_codes');
      if (!fs.existsSync(qrDir)) {
        fs.mkdirSync(qrDir, { recursive: true });
      }
      
      const qrPath = path.join(qrDir, `${qrCode}.png`);
      
      // Generate QR code image
      try {
        await QRCode.toFile(qrPath, qrCode);
      } catch (qrError) {
        console.error("Error generating QR code:", qrError);
        return res.status(500).json({ message: "Failed to generate QR code" });
      }
      
      const attendeeData = insertAttendeeSchema.parse({
        ...req.body,
        eventId,
        qrCode,
        qrPath: `uploads/qr_codes/${qrCode}.png`,
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
