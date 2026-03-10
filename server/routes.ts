import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import { setupAuth } from "./auth.js";
import { setupLocalAuth } from "./localAuth.js";
import { registerCoreRoutes } from "./routes/coreRoutes.js";
import { registerEventRoutes } from "./routes/eventRoutes.js";
import { registerAttendeeRoutes } from "./routes/attendeeRoutes.js";
import { registerCheckinRoutes } from "./routes/checkinRoutes.js";
import { registerCollaboratorRoutes } from "./routes/collaboratorRoutes.js";
import { registerAdminRoutes } from "./routes/adminRoutes.js";
import { ensureAdminCpSchema } from "./dbBootstrap.js";

interface RegisterRoutesOptions {
  createHttpServer?: boolean;
}

export async function registerRoutes(
  app: Express,
  options: RegisterRoutesOptions = {}
): Promise<Server | null> {
  const { createHttpServer = true } = options;

  try {
    await ensureAdminCpSchema();
  } catch (error) {
    console.error("Failed to ensure AdminCP schema:", error);
  }

  await setupAuth(app);
  setupLocalAuth(app);

  registerCoreRoutes(app);
  registerEventRoutes(app);
  registerAttendeeRoutes(app);
  registerCheckinRoutes(app);
  registerCollaboratorRoutes(app);
  registerAdminRoutes(app);

  app.get("/uploads/qr_codes/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), "uploads", "qr_codes", filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "QR code image not found" });
    }

    return res.sendFile(filePath);
  });

  if (!createHttpServer) {
    return null;
  }

  return createServer(app);
}
