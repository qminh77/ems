import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { wsManager } from "./websocket.js";
import { setSecurityHeaders } from "./requestGuards.js";
import { ensureDatabaseIndexes } from "./dbIndexes.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(setSecurityHeaders);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

app.use((req, res, next) => {
  const unsafeMethod = req.method === "POST" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE";
  if (!unsafeMethod || !req.path.startsWith("/api")) {
    return next();
  }

  const origin = req.get("origin");
  const referer = req.get("referer");
  const expectedOrigin = `${req.protocol}://${req.get("host")}`;

  const isTrusted = (value?: string) => {
    if (!value) return true;
    try {
      return new URL(value).origin === expectedOrigin;
    } catch {
      return false;
    }
  };

  if (!isTrusted(origin) || !isTrusted(referer)) {
    return res.status(403).json({ message: "CSRF protection: invalid origin" });
  }

  return next();
});

(async () => {
  try {
    await ensureDatabaseIndexes();
  } catch (error) {
    log(`failed to ensure database indexes: ${(error as Error).message}`, "express");
  }

  const server = await registerRoutes(app, { createHttpServer: true });
  if (!server) {
    throw new Error("Failed to create HTTP server");
  }
  
  // Initialize WebSocket server
  wsManager.initialize(server);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "File upload vuot qua gioi han cho phep" });
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    log(`error ${status}: ${message}`, "express");
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
