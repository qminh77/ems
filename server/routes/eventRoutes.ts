import type { Express } from "express";
import { z } from "zod";
import { insertEventSchema } from "@shared/schema";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { checkEventAccess } from "../middleware/eventAccess";
import { canEditEvent, isEventOwner } from "../services/accessControl";
import { cacheManager } from "../cacheManager";

export function registerEventRoutes(app: Express) {
  app.get("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const cacheKey = `events:${userId}`;
      const cachedEvents = cacheManager.get(cacheKey);
      if (cachedEvents) {
        return res.json(cachedEvents);
      }

      const [ownedEvents, collaboratedEvents] = await Promise.all([
        storage.getEventsByUserId(userId),
        storage.getUserCollaborations(userId),
      ]);

      const mergedEvents = new Map<number, any>();
      for (const event of collaboratedEvents) {
        mergedEvents.set(event.id, { ...event, role: "collaborator" });
      }
      for (const event of ownedEvents) {
        mergedEvents.set(event.id, { ...event, role: "owner" });
      }

      const allEvents = Array.from(mergedEvents.values()).sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      cacheManager.set(cacheKey, allEvents, 10_000);

      res.json(allEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/events/:id", isAuthenticated, checkEventAccess, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const event = await storage.getEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json({ ...event, role: req.eventAccess.role });
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

      const currentUser = await storage.getUser(userId);
      if (!currentUser || !currentUser.isActive) {
        return res.status(403).json({ message: "Tài khoản đã bị vô hiệu hóa" });
      }

      if (!currentUser.isAdmin && !currentUser.canCreateEvents) {
        return res.status(403).json({ message: "Tài khoản của bạn không được phép tạo sự kiện" });
      }

      const processedData = {
        ...req.body,
        userId,
        startTime: req.body.startTime === "" ? undefined : req.body.startTime,
        endTime: req.body.endTime === "" ? undefined : req.body.endTime,
      };

      const eventData = insertEventSchema.parse(processedData);
      const event = await storage.createEvent(eventData);
      cacheManager.invalidatePattern("events:");
      cacheManager.invalidate(`stats:${userId}`);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Dữ liệu không hợp lệ",
          errors: error.errors,
        });
      }

      if (error instanceof Error && error.message.includes("time")) {
        return res.status(400).json({
          message: "Định dạng thời gian không hợp lệ. Vui lòng kiểm tra lại thời gian bắt đầu và kết thúc.",
        });
      }

      res.status(400).json({ message: "Không thể tạo sự kiện" });
    }
  });

  app.put("/api/events/:id", isAuthenticated, checkEventAccess, async (req: any, res) => {
    if (!canEditEvent(req.eventAccess)) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa sự kiện này" });
    }
    try {
      const eventId = parseInt(req.params.id, 10);
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
      const userId = req.user?.claims?.sub;
      cacheManager.invalidatePattern("events:");
      if (userId) {
        cacheManager.invalidate(`stats:${userId}`);
      }
      res.json(event);
    } catch (error) {
      console.error("Error updating event:", error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Dữ liệu không hợp lệ",
          errors: error.errors,
        });
      }

      if (error instanceof Error && error.message.includes("time")) {
        return res.status(400).json({
          message: "Định dạng thời gian không hợp lệ. Vui lòng kiểm tra lại thời gian bắt đầu và kết thúc.",
        });
      }

      res.status(400).json({ message: "Không thể cập nhật sự kiện" });
    }
  });

  app.delete("/api/events/:id", isAuthenticated, checkEventAccess, async (req: any, res) => {
    try {
      if (!isEventOwner(req.eventAccess)) {
        return res.status(403).json({ message: "Chỉ chủ sự kiện mới có thể xóa" });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      const eventId = parseInt(req.params.id, 10);
      const success = await storage.deleteEvent(eventId, userId);
      if (!success) {
        return res.status(404).json({ message: "Event not found" });
      }
      cacheManager.invalidatePattern("events:");
      cacheManager.invalidate(`stats:${userId}`);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  app.get("/api/events/:eventId/access", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const eventId = parseInt(req.params.eventId, 10);

      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const access = await storage.checkEventAccess(eventId, userId);
      res.json(access);
    } catch (error) {
      console.error("Error checking event access:", error);
      res.status(500).json({ message: "Failed to check access" });
    }
  });
}
