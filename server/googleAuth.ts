import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
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
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || !!process.env.REPL_ID,
      sameSite: !!process.env.REPL_ID ? "none" : "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  if (hasGoogleAuth) {
    const callbackURL = process.env.NODE_ENV === "production" 
      ? `${process.env.FRONTEND_URL}/api/auth/google/callback`
      : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`
        : `http://localhost:5000/api/auth/google/callback`;
    
    if (process.env.NODE_ENV === "production" && !process.env.FRONTEND_URL) {
      throw new Error("FRONTEND_URL must be set in production for Google OAuth callback");
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
            return res.redirect("/");
          }
          req.login(user, (loginErr) => {
            if (loginErr) {
              console.error("[OAuth Error] Login error:", loginErr);
              return next(loginErr);
            }
            return res.redirect("/");
          });
        })(req, res, next);
      }
    );
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
