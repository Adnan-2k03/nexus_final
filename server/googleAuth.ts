import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import pg from "pg";
import { storage } from "./storage";

const hasGoogleAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (!hasGoogleAuth) {
  console.warn("⚠️  Google OAuth is disabled - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not set");
  console.warn("⚠️  Authentication features will not be available");
}

if (!process.env.SESSION_SECRET) {
  console.warn("⚠️  SESSION_SECRET not set - using default for development only");
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  
  console.log("🔄 [Session Store] Initializing PostgreSQL session store...");
  
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on("connect", () => {
    console.log("✅ [Session Store] Pool connected to database");
  });

  pool.on("error", (err) => {
    console.error("❌ [Session Store] Pool error:", err.message);
  });
  
  const sessionStore = new pgStore({
    pool: pool,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
    errorLog: (error) => {
      console.error("❌ [Session Store Error]", error);
    },
  });
  
  sessionStore.on("connect", () => {
    console.log("✅ [Session Store] Connected to database");
  });
  
  sessionStore.on("error", (error) => {
    console.error("❌ [Session Store Error Event]", error);
  });
  
  const isProduction = process.env.NODE_ENV === "production";
  const isReplitEnv = !!process.env.REPL_ID;
  
  const isCrossOriginDeployment = 
    isReplitEnv || 
    (isProduction && !!process.env.FRONTEND_URL && !!process.env.BACKEND_ONLY);
  
  const cookieConfig = {
    httpOnly: true,
    secure: isProduction || isReplitEnv,
    sameSite: isCrossOriginDeployment ? "none" : "lax",
    maxAge: sessionTtl,
  } as const;

  console.log("🍪 [Session Config]");
  console.log(`   Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`   Cross-Origin: ${isCrossOriginDeployment ? 'YES' : 'NO'}`);
  console.log(`   Cookie sameSite: ${cookieConfig.sameSite}`);
  console.log(`   Cookie secure: ${cookieConfig.secure}`);
  if (!isCrossOriginDeployment && isProduction) {
    console.warn("⚠️  Cross-origin deployment NOT detected!");
    console.warn("   For split deployment (e.g., Vercel frontend + Railway backend):");
    console.warn("   Set these environment variables on your BACKEND (Railway):");
    console.warn("   - FRONTEND_URL=<your-actual-vercel-url> (must use HTTPS)");
    console.warn("   - BACKEND_ONLY=true");
    console.warn("   - CORS_ORIGIN=<your-actual-vercel-url>");
    console.warn("   - NODE_ENV=production");
    console.warn("   This enables sameSite=none cookies for cross-origin authentication.");
  }
  
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: cookieConfig as any,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  if (hasGoogleAuth) {
    const backendUrl = process.env.BACKEND_URL || process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : undefined;
      
    const callbackURL = process.env.NODE_ENV === "production" 
      ? `${backendUrl}/api/auth/google/callback`
      : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`
        : `http://localhost:5000/api/auth/google/callback`;
    
    if (process.env.NODE_ENV === "production" && !backendUrl) {
      throw new Error("BACKEND_URL or RAILWAY_PUBLIC_DOMAIN must be set in production for Google OAuth callback");
    }

    console.log(`[OAuth Debug] Callback URL: ${callbackURL}`);
    console.log(`[OAuth Debug] Client ID: ${process.env.GOOGLE_CLIENT_ID?.substring(0, 20)}...`);
    console.log(`[OAuth Debug] Client Secret exists: ${!!process.env.GOOGLE_CLIENT_SECRET}`);
    console.log(`[OAuth Debug] Client Secret length: ${process.env.GOOGLE_CLIENT_SECRET?.trim().length}`);

    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID!.trim(),
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
          callbackURL,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const googleId = profile.id;
            const email = profile.emails?.[0]?.value;
            const firstName = profile.name?.givenName;
            const lastName = profile.name?.familyName;
            const profileImageUrl = profile.photos?.[0]?.value;

            if (!email) {
              return done(new Error("No email provided by Google"));
            }

            const user = await storage.upsertUserByGoogleId({
              googleId,
              email,
              firstName: firstName || null,
              lastName: lastName || null,
              profileImageUrl: profileImageUrl || null,
            });

            return done(null, user);
          } catch (error) {
            return done(error as Error);
          }
        }
      )
    );

    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await storage.getUser(id);
        done(null, user);
      } catch (error) {
        done(error);
      }
    });

    app.get("/api/auth/google", 
      passport.authenticate("google", { 
        scope: ["profile", "email"] 
      })
    );

    app.get("/api/auth/google/callback",
      (req, res, next) => {
        passport.authenticate("google", (err: any, user: any, info: any) => {
          if (err) {
            console.error("[OAuth Error] Full error:", err);
            console.error("[OAuth Error] Error name:", err.name);
            console.error("[OAuth Error] Error message:", err.message);
            if (err.oauthError) {
              console.error("[OAuth Error] OAuth status code:", err.oauthError.statusCode);
              console.error("[OAuth Error] OAuth data:", err.oauthError.data);
            }
            return res.status(500).json({ 
              message: "Authentication failed", 
              error: err.message,
              details: err.oauthError?.data 
            });
          }
          if (!user) {
            return res.redirect(process.env.FRONTEND_URL || "/");
          }
          req.login(user, (loginErr) => {
            if (loginErr) {
              console.error("[OAuth Error] Login error:", loginErr);
              return next(loginErr);
            }
            return res.redirect(process.env.FRONTEND_URL || "/");
          });
        })(req, res, next);
      }
    );
  } else {
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
      try {
        const user = await storage.getUser(id);
        done(null, user);
      } catch (error) {
        done(error);
      }
    });
  }

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
