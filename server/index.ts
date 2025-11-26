import express, { type Request, Response, NextFunction } from "express";
import { setupVite, serveStatic, log } from "./vite.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`[startup] Starting server in ${process.env.NODE_ENV || 'development'} mode`);
console.log(`[startup] DATABASE_URL is ${process.env.DATABASE_URL ? 'set' : 'NOT SET'}`);

const app = express();
const server = createServer(app);

app.set("trust proxy", 1);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let routesInitialized = false;
let routesInitializing = false;

// Health endpoint - must respond immediately
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", routesReady: routesInitialized });
});

// In production, set up static file serving IMMEDIATELY so / responds before routes load
if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(__dirname, "..", "public");
  const indexPath = path.resolve(distPath, "index.html");
  console.log(`[startup] Setting up static files from: ${distPath}`);
  
  if (fs.existsSync(distPath)) {
    // Serve static assets (JS, CSS, images, etc.)
    app.use(express.static(distPath));
    console.log("[startup] Static file middleware registered");
    
    // Explicit root route handler - serves index.html for / immediately
    // This ensures health checks to / pass before routes are loaded
    if (fs.existsSync(indexPath)) {
      app.get("/", (_req, res) => {
        res.sendFile(indexPath);
      });
      console.log("[startup] Root route handler registered");
    }
  } else {
    console.error(`[startup] WARNING: Static files not found at ${distPath}`);
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
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

async function initializeRoutes() {
  if (routesInitialized || routesInitializing) return;
  routesInitializing = true;
  
  try {
    console.log("[startup] Loading routes module...");
    const { default: routes } = await import("./routes.js");
    console.log("[startup] Routes loaded successfully");
    app.use(routes);
    routesInitialized = true;
    console.log("[startup] Routes initialized");
  } catch (error) {
    console.error("[startup] Failed to initialize routes:", error);
    routesInitializing = false;
    throw error;
  }
}

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error("[error]", err);
});

const PORT = 5000;

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`[startup] Server listening on 0.0.0.0:${PORT}`);
  log(`Server running on port ${PORT}`);

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("[startup] Setting up Vite for development...");
      await setupVite(app, server);
    }
    // Note: In production, static files are already set up above before server.listen

    await initializeRoutes();
    
    // In production, add SPA fallback AFTER routes are loaded
    // This serves index.html for any unmatched routes (client-side routing)
    if (process.env.NODE_ENV === "production") {
      const distPath = path.resolve(__dirname, "..", "public");
      const indexPath = path.resolve(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        app.use("*", (_req, res) => {
          res.sendFile(indexPath);
        });
        console.log("[startup] SPA fallback registered");
      }
    }
    
    console.log("[startup] Application fully initialized");
  } catch (error) {
    console.error("[startup] Failed during post-listen initialization:", error);
  }
});
