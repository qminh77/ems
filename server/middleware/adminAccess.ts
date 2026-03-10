import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req.user as any)?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Tài khoản đã bị vô hiệu hóa" });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ message: "Chỉ quản trị viên mới được truy cập" });
    }

    return next();
  } catch (error) {
    console.error("Admin access check failed:", error);
    return res.status(500).json({ message: "Không thể xác thực quyền quản trị" });
  }
}
