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

    // Create game profiles for each game (only once)
    try {
      const existingProfiles = await storage.getUserGameProfiles(DEV_USER_ID);
      
      if (!existingProfiles || existingProfiles.length === 0) {
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
            // Ignore errors
          }
        }
        console.log("[DEV MODE] Game profiles created for dev user");
      } else {
        console.log("[DEV MODE] Game profiles already exist, skipping creation");
      }
    } catch (e) {
      console.log("[DEV MODE] Error checking game profiles");
    }

    // Add interests for the dev user (using predefined categories from UI)
    const hobbies = [
      {
        category: "anime",
        title: "Haikyu!!",
        description: "Inspiring competitive volleyball anime. Relates to team coordination and clutch mentality in esports",
      },
      {
        category: "anime",
        title: "Jujutsu Kaisen",
        description: "Loves the intense tactical battles and character development",
      },
      {
        category: "anime",
        title: "My Hero Academia",
        description: "Fan of the competitive tournament arcs and strategic combat",
      },
      {
        category: "music",
        title: "Lofi Hip Hop Beats",
        description: "Perfect background music for ranked grinding sessions and practice",
        link: "https://www.youtube.com/results?search_query=lofi+hip+hop+beats",
      },
      {
        category: "music",
        title: "Synthwave & Electronic",
        description: "High-energy synthetic music for competitive play and streaming",
      },
      {
        category: "music",
        title: "Gaming Soundtracks",
        description: "Collector of iconic competitive game soundtracks and compositions",
      },
      {
        category: "movies",
        title: "The Social Network",
        description: "Inspired by competitive drive and achieving excellence",
      },
      {
        category: "movies",
        title: "Free Solo",
        description: "Documentary about pushing human limits and mental resilience",
      },
      {
        category: "movies",
        title: "Esports Documentaries",
        description: "Follows documentaries about competitive gaming professionals",
      },
      {
        category: "books",
        title: "The Art of War",
        description: "Ancient strategy text applied to modern competitive gaming",
      },
      {
        category: "books",
        title: "Mindset by Carol Dweck",
        description: "Understanding growth mindset for competitive improvement",
      },
      {
        category: "books",
        title: "Peak Performance",
        description: "Sports psychology and mental training for peak performance",
      },
      {
        category: "writing",
        title: "Strategy Guides",
        description: "Writing detailed competitive gaming strategy guides",
      },
      {
        category: "writing",
        title: "Esports Analysis",
        description: "Breaking down pro team strategies and meta shifts",
      },
      {
        category: "art",
        title: "Gaming Poster Design",
        description: "Creates tournament posters and esports promotional art",
      },
      {
        category: "art",
        title: "Character Concept Art",
        description: "Appreciates and creates game character concept art",
      },
      {
        category: "cooking",
        title: "Pre-Tournament Meal Prep",
        description: "Specialized nutrition and meal prep for competitive tournaments",
      },
      {
        category: "cooking",
        title: "Energy Drink Recipes",
        description: "Experimenting with healthy caffeine alternatives for gaming",
      },
      {
        category: "travel",
        title: "International LAN Tournaments",
        description: "Traveling to compete in major esports events worldwide",
      },
      {
        category: "travel",
        title: "Gaming Convention Visits",
        description: "Attends major esports conventions and gaming expos",
      },
    ];

    // Only create hobbies if none exist yet
    const existingHobbies = await storage.getUserHobbies(DEV_USER_ID);
    if (!existingHobbies || existingHobbies.length === 0) {
      for (const hobby of hobbies) {
        try {
          await storage.createHobby({
            userId: DEV_USER_ID,
            category: hobby.category,
            title: hobby.title,
            description: hobby.description,
            link: hobby.link,
          });
        } catch (e) {
          // Ignore duplicates
        }
      }
      console.log("[DEV MODE] Created hobbies/interests for dev user");
    } else {
      console.log("[DEV MODE] Hobbies/interests already exist, skipping creation");
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
