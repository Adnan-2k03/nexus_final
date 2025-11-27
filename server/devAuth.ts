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
    // Always update dev user profile to ensure it's complete
    await storage.upsertUser({
      id: DEV_USER_ID,
      googleId: "dev-google-id",
      email: DEV_USER_EMAIL,
      firstName: "Alex",
      lastName: "Chen",
      profileImageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=DevGamer",
      gamertag: "DevGamer",
      bio: "Competitive Valorant and League player 🎮 Looking for skilled teammates for tournaments. Currently grinding Diamond rank. Open for scrimmages and practice sessions!",
      location: "San Francisco, CA",
      latitude: 37.7749,
      longitude: -122.4194,
      age: 24,
      gender: "male",
      language: "English",
      preferredGames: ["Valorant", "League of Legends", "CS2"],
      showMutualGames: "everyone",
      showMutualFriends: "everyone",
      showMutualHobbies: "everyone",
    });
    console.log("[DEV MODE] Updated development user profile:", DEV_USER_ID);

    // Create game profiles for each game
    const games = [
      { gameName: "Valorant", highestRank: "Diamond 2", currentRank: "Diamond 1", wins: 128, losses: 45 },
      { gameName: "League of Legends", highestRank: "Diamond 3", currentRank: "Diamond 2", wins: 245, losses: 89 },
      { gameName: "CS2", highestRank: "Global Elite", currentRank: "Global Elite", wins: 342, losses: 127 },
    ];

    for (const game of games) {
      try {
        await storage.createGameProfile({
          userId: DEV_USER_ID,
          gameName: game.gameName,
          highestRank: game.highestRank,
          currentRank: game.currentRank,
          hoursPlayed: 200 + Math.floor(Math.random() * 800),
          achievements: [`${game.highestRank} Peak`, "Tournament Competitor", "Streamer Ready"],
          stats: {
            wins: game.wins,
            losses: game.losses,
            winRate: `${Math.round((game.wins / (game.wins + game.losses)) * 100)}%`,
            mmr: 2000 + Math.floor(Math.random() * 500),
          }
        });
      } catch (e) {
        // Game profile might already exist
        console.log(`Game profile for ${game.gameName} already exists`);
      }
    }
    console.log("[DEV MODE] Game profiles ensured for dev user");
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
