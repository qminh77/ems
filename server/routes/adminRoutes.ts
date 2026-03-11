import type { Express } from "express";
import { z } from "zod";
import { updateSystemSettingsSchema, updateUserAdminSchema } from "../../shared/schema.js";
import { isAuthenticated } from "../auth.js";
import { requireAdmin } from "../middleware/adminAccess.js";
import { storage } from "../storage.js";
import { cacheManager } from "../cacheManager.js";

const userUpdatePayloadSchema = updateUserAdminSchema.refine(
  (data) => data.isAdmin !== undefined || data.canCreateEvents !== undefined || data.isActive !== undefined,
  { message: "Vui lòng gửi ít nhất một trường cần cập nhật" }
);

export function registerAdminRoutes(app: Express) {
  app.get("/api/public/settings", async (_req, res) => {
    try {
      const cacheKey = "settings:public";
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const settings = await storage.getSystemSettings();
      const publicSettings = {
        systemName: settings.systemName,
        systemDescription: settings.systemDescription,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        logoUrl: settings.logoUrl,
        footerText: settings.footerText,
        registrationEnabled: settings.registrationEnabled,
      };

      cacheManager.set(cacheKey, publicSettings, 15_000);
      return res.json(publicSettings);
    } catch (error) {
      console.error("Error fetching public settings:", error);
      return res.status(500).json({ message: "Không thể lấy cấu hình hệ thống" });
    }
  });

  app.get("/api/admin/settings", isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      return res.json(settings);
    } catch (error) {
      console.error("Error fetching admin settings:", error);
      return res.status(500).json({ message: "Không thể lấy cấu hình AdminCP" });
    }
  });

  app.put("/api/admin/settings", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const payload = updateSystemSettingsSchema.parse(req.body);
      const updated = await storage.updateSystemSettings(payload);
      cacheManager.invalidate("settings:public");
      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: error.errors });
      }
      console.error("Error updating admin settings:", error);
      return res.status(500).json({ message: "Không thể cập nhật cấu hình hệ thống" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      const users = await storage.listUsersWithUsername();
      return res.json(users);
    } catch (error) {
      console.error("Error listing users:", error);
      return res.status(500).json({ message: "Không thể lấy danh sách tài khoản" });
    }
  });

  app.patch("/api/admin/users/:id", isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const targetUserId = req.params.id as string;
      const actorUserId = req.user?.claims?.sub as string | undefined;
      const payload = userUpdatePayloadSchema.parse(req.body);

      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "Không tìm thấy tài khoản" });
      }

      if (actorUserId === targetUserId && payload.isActive === false) {
        return res.status(400).json({ message: "Không thể tự vô hiệu hóa chính mình" });
      }

      if (payload.isAdmin === false && targetUser.isAdmin) {
        const allUsers = await storage.listUsers();
        const adminCount = allUsers.filter((item) => item.isAdmin && item.isActive).length;
        if (adminCount <= 1) {
          return res.status(400).json({ message: "Hệ thống cần ít nhất 1 admin đang hoạt động" });
        }
      }

      const updated = await storage.updateUserAdmin(targetUserId, payload);
      if (!updated) {
        return res.status(404).json({ message: "Không tìm thấy tài khoản" });
      }

      cacheManager.invalidate(`auth:user:${targetUserId}`);
      cacheManager.invalidate(`auth:active:${targetUserId}`);

      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dữ liệu không hợp lệ", errors: error.errors });
      }
      console.error("Error updating user:", error);
      return res.status(500).json({ message: "Không thể cập nhật tài khoản" });
    }
  });
}
