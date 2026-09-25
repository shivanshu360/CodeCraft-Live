import express from "express";
import path from "path";
import cors from "cors";
import { serve } from "inngest/express";
import { clerkMiddleware } from "@clerk/express";

import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
import { inngest, functions } from "./lib/inngest.js";

import chatRoutes from "./routes/chatRoutes.js";
import sessionRoutes from "./routes/sessionRoute.js";

const app = express();

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

// API routes
app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ message: "api is up and running" });
});

// Production static file serving & SPA fallback
if (ENV.NODE_ENV === "production") {
  const frontendDistPath = path.resolve(process.cwd(), "frontend", "dist");

  // 1. Serve static files (JS, CSS, images)
  app.use(express.static(frontendDistPath));

  // 2. SPA Fallback (Bypasses path-to-regexp completely)
  app.use((req, res, next) => {
    if (req.method === "GET") {
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