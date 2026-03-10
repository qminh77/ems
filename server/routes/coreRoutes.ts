import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";
import { wsManager } from "../websocket";
import { cacheManager } from "../cacheManager";

export function registerCoreRoutes(app: Express) {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const cacheKey = `auth:user:${userId}`;
      const cachedUser = cacheManager.get(cacheKey);
      if (cachedUser) {
        return res.json(cachedUser);
      }

      const claims = req.user?.claims;
      if (claims?.sub) {
        const userFromSession = {
          id: claims.sub,
          email: claims.email ?? null,
          firstName: claims.first_name ?? null,
          lastName: claims.last_name ?? null,
          profileImageUrl: claims.profile_image_url ?? null,
        };
        cacheManager.set(cacheKey, userFromSession, 30_000);
        return res.json(userFromSession);
      }

      const user = await storage.getUser(userId);
      if (user) {
        cacheManager.set(cacheKey, user, 30_000);
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/ws-token", isAuthenticated, async (req: any, res) => {
    if (process.env.VERCEL) {
      return res.status(503).json({ message: "WebSocket is disabled in this environment" });
    }

    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found" });
    }

    const token = wsManager.issueConnectionToken(userId);
    return res.json({ token, expiresInMs: 60000 });
  });

  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const cacheKey = `stats:${userId}`;
      const cachedStats = cacheManager.get(cacheKey);
      if (cachedStats) {
        return res.json(cachedStats);
      }

      const stats = await storage.getDashboardStats(userId);
      cacheManager.set(cacheKey, stats, 5000);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
}
