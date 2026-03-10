import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { checkEventAccess } from "../middleware/eventAccess";
import { storage } from "../storage";
import { isEventOwner } from "../services/accessControl";

const allowedPermissions = new Set(["view", "checkin", "manage_attendees", "edit_event"]);

function normalizePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return ["view", "checkin"];
  }

  const sanitized = input
    .filter((item): item is string => typeof item === "string")
    .map((permission) => permission.trim())
    .filter((permission) => allowedPermissions.has(permission));

  return sanitized.length > 0 ? Array.from(new Set(sanitized)) : ["view", "checkin"];
}

export function registerCollaboratorRoutes(app: Express) {
  app.get("/api/users/search", isAuthenticated, async (req: any, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }

      if (query.length > 100) {
        return res.status(400).json({ message: "Query too long" });
      }

      const users = await storage.searchUsersByEmailOrUsername(query);
      const safeUsers = users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        profileImageUrl: u.profileImageUrl,
      }));

      res.json(safeUsers);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  app.get("/api/events/:id/collaborators", isAuthenticated, checkEventAccess, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const collaborators = await storage.getEventCollaborators(eventId);
      res.json(collaborators);
    } catch (error) {
      console.error("Error fetching collaborators:", error);
      res.status(500).json({ message: "Failed to fetch collaborators" });
    }
  });

  app.post("/api/events/:id/collaborators", isAuthenticated, checkEventAccess, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const { userId: targetUserId, permissions } = req.body;
      const invitedBy = req.user?.claims?.sub;
      const normalizedPermissions = normalizePermissions(permissions);

      if (!isEventOwner(req.eventAccess)) {
        return res.status(403).json({ message: "Chỉ chủ sự kiện mới có thể thêm cộng tác viên" });
      }

      const existingAccess = await storage.checkEventAccess(eventId, targetUserId);
      if (existingAccess.hasAccess) {
        return res.status(400).json({ message: "Người dùng đã là cộng tác viên của sự kiện này" });
      }

      const collaborator = await storage.addCollaborator({
        eventId,
        userId: targetUserId,
        role: "collaborator",
        permissions: normalizedPermissions,
        invitedBy,
      });

      res.status(201).json(collaborator);
    } catch (error) {
      console.error("Error adding collaborator:", error);
      res.status(500).json({ message: "Failed to add collaborator" });
    }
  });

  app.patch("/api/events/:id/collaborators/:userId", isAuthenticated, checkEventAccess, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const targetUserId = req.params.userId;
      const { permissions } = req.body;
      const normalizedPermissions = normalizePermissions(permissions);

      if (!isEventOwner(req.eventAccess)) {
        return res.status(403).json({ message: "Chỉ chủ sự kiện mới có thể thay đổi quyền hạn" });
      }

      const updated = await storage.updateCollaboratorPermissions(eventId, targetUserId, normalizedPermissions);
      if (!updated) {
        return res.status(404).json({ message: "Không tìm thấy cộng tác viên" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating collaborator:", error);
      res.status(500).json({ message: "Failed to update collaborator" });
    }
  });

  app.delete("/api/events/:id/collaborators/:userId", isAuthenticated, checkEventAccess, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id, 10);
      const targetUserId = req.params.userId;
      const currentUserId = req.user?.claims?.sub;

      if (!isEventOwner(req.eventAccess) && targetUserId !== currentUserId) {
        return res.status(403).json({ message: "Không có quyền xóa cộng tác viên này" });
      }

      const success = await storage.removeCollaborator(eventId, targetUserId);
      if (!success) {
        return res.status(404).json({ message: "Không tìm thấy cộng tác viên" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error removing collaborator:", error);
      res.status(500).json({ message: "Failed to remove collaborator" });
    }
  });

  app.get("/api/all-events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const ownedEvents = await storage.getEventsByUserId(userId);
      const collaboratedEvents = await storage.getUserCollaborations(userId);
      const allEvents = [
        ...ownedEvents.map((e) => ({ ...e, role: "owner" })),
        ...collaboratedEvents.map((e) => ({ ...e, role: "collaborator" })),
      ];

      res.json(allEvents);
    } catch (error) {
      console.error("Error fetching all events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });
}
