import express from "express";

let appPromise: Promise<express.Express> | null = null;

async function createVercelApp() {
  const [{ registerRoutes }, { setSecurityHeaders }] = await Promise.all([
    import("../server/routes.js"),
    import("../server/requestGuards.js"),
  ]);

  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(setSecurityHeaders);

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

  await registerRoutes(app, { createHttpServer: false });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "File upload vuot qua gioi han cho phep" });
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    return res.status(status).json({ message });
  });

  return app;
}

async function getApp() {
  if (!appPromise) {
    appPromise = createVercelApp();
  }
  return appPromise;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error: any) {
    const message = error?.message || "Server bootstrap failed";
    return res.status(500).json({
      message: "API initialization failed",
      detail: message,
    });
  }
}
