import express from "express";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { serve } from "inngest/express";
import { clerkMiddleware } from "@clerk/express";

import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
import { inngest, functions } from "./lib/inngest.js";

import chatRoutes from "./routes/chatRoutes.js";
import sessionRoutes from "./routes/sessionRoute.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());

// Resilient CORS Configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  ENV.CLIENT_URL,
]
  .filter(Boolean)
  .map((url) => url.trim().replace(/\/$/, ""));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.trim().replace(/\/$/, "");
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin);

      if (allowedOrigins.includes(cleanOrigin) || isLocalhost) {
        callback(null, true);
      } else {
        callback(new Error(`Origin not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
  })
);

app.use(clerkMiddleware());

// API Routes
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ message: "api is up and running" });
});

// Production Static File Serving & SPA Fallback
if (ENV.NODE_ENV === "production") {
  // Uses process.cwd() to correctly locate /app/frontend/dist from repo root
  const frontendDistPath = path.resolve(process.cwd(), "frontend", "dist");

  // 1. Serve static assets (JS, CSS, images)
  app.use(express.static(frontendDistPath));

  // 2. SPA Fallback: Bypasses path-to-regexp completely to avoid route syntax errors
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(frontendDistPath, "index.html"));
    }
    next();
  });
}

const startServer = async () => {
  try {
    await connectDB();
    app.listen(ENV.PORT, () => {
      console.log("Server is running on port:", ENV.PORT);
    });
  } catch (error) {
    console.error("Error starting the server", error);
  }
};

startServer();