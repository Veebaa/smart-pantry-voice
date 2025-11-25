import express, { type Request, Response, NextFunction } from "express";
import routes from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";

// Log startup information immediately
console.log(`[startup] Starting server in ${process.env.NODE_ENV || 'development'} mode`);
console.log(`[startup] DATABASE_URL is ${process.env.DATABASE_URL ? 'set' : 'NOT SET'}`);

const app = express();
const server = createServer(app);

// Trust proxy for cookies to work behind Replit's proxy
app.set("trust proxy", 1);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log("[startup] Initializing routes...");
    app.use(routes);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error("[error]", err);
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("[startup] Setting up Vite for development...");
      await setupVite(app, server);
    } else {
      console.log("[startup] Setting up static file serving for production...");
      serveStatic(app);
    }

    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`[startup] Server listening on 0.0.0.0:${PORT}`);
      log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("[startup] Failed to start server:", error);
    process.exit(1);
  }
})();
