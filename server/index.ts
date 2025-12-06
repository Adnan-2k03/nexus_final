import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import pg from "pg";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

async function waitForDatabase(maxRetries = 30, initialDelayMs = 3000): Promise<void> {
  // Railway databases can take 30-90 seconds to wake from sleep
  // Use exponential backoff with longer initial delays
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 10000, // 10 second timeout per attempt
      idleTimeoutMillis: 5000,
    });

    try {
      console.log(`🔄 [Database] Connection attempt ${attempt}/${maxRetries}...`);
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      await pool.end();
      console.log('✅ [Database] Connection established successfully');
      return;
    } catch (error: any) {
      await pool.end().catch(() => {}); // Clean up pool
      
      const isRecovering = error.message?.includes('not yet accepting connections') || 
                           error.message?.includes('recovery') ||
                           error.code === '57P03';
      
      console.log(`⚠️  [Database] Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 3s, 4s, 5s, 6s... up to 15s max
        const delayMs = Math.min(initialDelayMs + (attempt * 1000), 15000);
        console.log(`⏳ [Database] ${isRecovering ? 'Database waking up...' : 'Retrying...'} Waiting ${delayMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw new Error(`Failed to connect to database after ${maxRetries} attempts. Database may still be sleeping - try again in a few minutes.`);
}

const app = express();

// CORS configuration for split deployment (Vercel frontend + Railway backend)
const isDev = process.env.NODE_ENV === 'development';
const defaultOrigins = isDev 
  ? ['http://localhost:5173', 'http://localhost:5000']
  : [];

const corsOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || defaultOrigins;

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In production with CORS_ORIGIN set, always allow
      if (!isDev && corsOrigins.length > 0) {
        callback(null, true);
      } else if (isDev) {
        callback(null, true); // Allow all in dev
      } else {
        callback(new Error('CORS not allowed'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
    // Wait for database to be ready before starting (important for Railway where DB might start after app)
    if (process.env.NODE_ENV === 'production') {
      await waitForDatabase(15, 2000); // 15 retries, 2 seconds apart = 30 seconds max wait
    }
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error(`[Error] ${status}: ${message}`);
    });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else if (process.env.BACKEND_ONLY !== "true") {
    // Only serve static files if not in backend-only mode (e.g., not on Railway)
    serveStatic(app);
  }
  // If BACKEND_ONLY=true, skip static file serving (API-only mode for Railway)

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
  } catch (error: any) {
    console.error('❌ [Startup Error]', error.message || error);
    process.exit(1);
  }
})();
