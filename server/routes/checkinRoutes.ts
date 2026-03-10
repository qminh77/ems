import type { Express } from "express";
import { isAuthenticated } from "../auth.js";
import { storage } from "../storage.js";
import { canCheckin } from "../services/accessControl.js";
import { wsManager } from "../websocket.js";
import { cacheManager } from "../cacheManager.js";
import { createRateLimiter } from "../requestGuards.js";

const checkinRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: "checkin",
});

export function registerCheckinRoutes(app: Express) {
  app.post("/api/checkin", isAuthenticated, checkinRateLimit, async (req: any, res) => {
    try {
      const { qrCode } = req.body;
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      if (!qrCode) {
        return res.status(400).json({ message: "QR code is required" });
      }

      const result = await storage.getAttendeeWithEvent(qrCode);
      if (!result) {
        return res.status(404).json({ message: "Invalid QR code or attendee not found" });
      }

      const { attendee, event } = result;
      const access =
        event.userId === userId
          ? { hasAccess: true, role: "owner", permissions: ["all"] }
          : await storage.checkEventAccess(event.id, userId);

      if (!access.hasAccess || !canCheckin(access)) {
        return res.status(403).json({ message: "Bạn không có quyền check-in cho sự kiện này" });
      }

      let action: "check_in" | "check_out";
      let newStatus: string;
      let message: string;

      if (attendee.status === "pending") {
        action = "check_in";
        newStatus = "checked_in";
        message = "Check-in successful!";

        await storage.updateAttendee(attendee.id, {
          status: newStatus,
          checkinTime: new Date(),
        });
      } else if (attendee.status === "checked_in") {
        action = "check_out";
        newStatus = "checked_out";
        message = "Check-out successful!";

        await storage.updateAttendee(attendee.id, {
          status: newStatus,
          checkoutTime: new Date(),
        });
      } else {
        return res.status(400).json({ message: "This attendee has already checked out" });
      }

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

      cacheManager.invalidate(`stats:${userId}`);
      cacheManager.invalidatePattern(`recent:${userId}:`);

      res.json(responseData);

      setImmediate(async () => {
        try {
          const [checkinLog, stats] = await Promise.all([
            storage.createCheckinLog({
              attendeeId: attendee.id,
              action,
              ipAddress: req.ip,
              userAgent: req.get("User-Agent") || "",
            }),
            storage.getDashboardStats(userId),
          ]);

          const broadcastData = {
            ...checkinLog,
            attendee: {
              ...attendee,
              status: newStatus,
              checkinTime: action === "check_in" ? new Date() : attendee.checkinTime,
              checkoutTime: action === "check_out" ? new Date() : attendee.checkoutTime,
            },
            event,
            action,
            timestamp: new Date(),
          };

          wsManager.broadcastCheckinUpdate(userId, broadcastData);
          wsManager.broadcastStatsUpdate(userId, stats);
          wsManager.broadcastAttendeeUpdate(userId, attendee.eventId, broadcastData.attendee);
        } catch (error) {
          console.error("Error in async checkin processing:", error);
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

      const requestedLimit = parseInt(req.query.limit as string, 10) || 10;
      const limit = Math.min(Math.max(requestedLimit, 1), 100);

      const cacheKey = `recent:${userId}:${limit}`;
      const cachedRecentCheckins = cacheManager.get(cacheKey);
      if (cachedRecentCheckins) {
        return res.json(cachedRecentCheckins);
      }

      const recentCheckins = await storage.getRecentCheckinsByUserId(userId, limit);
      cacheManager.set(cacheKey, recentCheckins, 3000);
      res.json(recentCheckins);
    } catch (error) {
      console.error("Error fetching recent check-ins:", error);
      res.status(500).json({ message: "Failed to fetch recent check-ins" });
    }
  });
}
