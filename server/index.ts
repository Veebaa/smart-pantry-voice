import express, { type Request, Response, NextFunction } from "express";
import { setupVite, serveStatic, log } from "./vite.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";

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

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", routesReady: routesInitialized });
});

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
    } else {
      console.log("[startup] Setting up static file serving for production...");
      serveStatic(app);
    }

    await initializeRoutes();
    console.log("[startup] Application fully initialized");
  } catch (error) {
    console.error("[startup] Failed during post-listen initialization:", error);
  }
});
