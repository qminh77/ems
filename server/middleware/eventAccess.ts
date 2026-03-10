import { storage } from "../storage.js";

export async function checkEventAccess(req: any, res: any, next: any) {
  try {
    const userId = req.user?.claims?.sub;
    const eventId = parseInt(req.params.id || req.params.eventId, 10);

    if (!userId || Number.isNaN(eventId)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const access = await storage.checkEventAccess(eventId, userId);
    if (!access.hasAccess) {
      return res.status(403).json({ message: "Ban khong co quyen truy cap su kien nay" });
    }

    req.eventAccess = access;
    return next();
  } catch (error) {
    console.error("Error checking event access:", error);
    return res.status(500).json({ message: "Failed to check access" });
  }
}
