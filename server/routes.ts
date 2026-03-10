import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import { setupAuth } from "./replitAuth";
import { setupLocalAuth } from "./localAuth";
import { registerCoreRoutes } from "./routes/coreRoutes";
import { registerEventRoutes } from "./routes/eventRoutes";
import { registerAttendeeRoutes } from "./routes/attendeeRoutes";
import { registerCheckinRoutes } from "./routes/checkinRoutes";
import { registerCollaboratorRoutes } from "./routes/collaboratorRoutes";

interface RegisterRoutesOptions {
  createHttpServer?: boolean;
}

export async function registerRoutes(
  app: Express,
  options: RegisterRoutesOptions = {}
): Promise<Server | null> {
  const { createHttpServer = true } = options;

  await setupAuth(app);
  setupLocalAuth(app);

  registerCoreRoutes(app);
  registerEventRoutes(app);
  registerAttendeeRoutes(app);
  registerCheckinRoutes(app);
  registerCollaboratorRoutes(app);

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
