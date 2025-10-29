import type { RequestHandler } from "express";
import { storage } from "./storage";

// DEVELOPMENT MODE: This file provides authentication bypass for development
// To enable authentication, see instructions in replit.md

const DEV_MODE = process.env.AUTH_DISABLED === "true";

export const DEV_USER_ID = "dev-user-123";
export const DEV_USER_EMAIL = "dev@gamematch.com";

export async function ensureDevUser() {
  if (!DEV_MODE) return;
  
  try {
    let user = await storage.getUser(DEV_USER_ID);
    
    if (!user) {
      await storage.upsertUser({
        id: DEV_USER_ID,
        googleId: "dev-google-id",
        email: DEV_USER_EMAIL,
        firstName: "Dev",
        lastName: "User",
        profileImageUrl: null,
        gamertag: "DevGamer",
        bio: "Development mode user for testing",
        location: null,
        latitude: null,
        longitude: null,
        age: null,
        gender: null,
        language: "English",
        preferredGames: ["League of Legends", "Valorant", "Fortnite"],
        showMutualGames: "everyone",
        showMutualFriends: "everyone",
        showMutualHobbies: "everyone",
      });
      console.log("[DEV MODE] Created development user:", DEV_USER_ID);
    }
  } catch (error) {
    console.error("[DEV MODE] Error creating dev user:", error);
  }
}

export const devAuthMiddleware: RequestHandler = async (req: any, res, next) => {
  if (!DEV_MODE) {
    return res.status(401).json({ 
      message: "Development mode is disabled. Please set AUTH_DISABLED=true to bypass authentication." 
    });
  }
  
  const user = await storage.getUser(DEV_USER_ID);
  req.user = user;
  req.isAuthenticated = () => true;
  
  next();
};
