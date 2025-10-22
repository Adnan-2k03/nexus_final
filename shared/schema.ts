import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  real,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const matchRequestStatusEnum = pgEnum("match_request_status", ["waiting", "connected", "declined"]);
export const genderEnum = pgEnum("gender", ["male", "female", "custom", "prefer_not_to_say"]);

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Google OAuth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  googleId: varchar("google_id").unique().notNull(),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Gaming profile fields
  gamertag: varchar("gamertag").unique(),
  bio: text("bio"),
  location: varchar("location"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  age: integer("age"),
  gender: genderEnum("gender"),
  language: varchar("language"),
  preferredGames: text("preferred_games").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Match requests table
export const matchRequests = pgTable("match_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  gameName: varchar("game_name").notNull(),
  gameMode: varchar("game_mode").notNull(), // 1v1, 2v2, 3v3, etc.
  tournamentName: varchar("tournament_name"),
  description: text("description").notNull(),
  status: matchRequestStatusEnum("status").notNull().default("waiting"),
  region: varchar("region"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Match connections table
export const matchConnections = pgTable("match_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => matchRequests.id),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  accepterId: varchar("accepter_id").notNull().references(() => users.id),
  status: varchar("status").notNull().default("pending"), // pending, accepted, declined
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Hidden matches table - tracks which users have hidden which match requests
export const hiddenMatches = pgTable("hidden_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  matchRequestId: varchar("match_request_id").notNull().references(() => matchRequests.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_hidden_matches").on(table.userId),
]);

// Chat messages table - stores messages between matched players
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: varchar("connection_id").notNull().references(() => matchConnections.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertMatchRequest = typeof matchRequests.$inferInsert;
export type MatchRequest = typeof matchRequests.$inferSelect;
export type InsertMatchConnection = typeof matchConnections.$inferInsert;
export type MatchConnection = typeof matchConnections.$inferSelect;
export type InsertHiddenMatch = typeof hiddenMatches.$inferInsert;
export type HiddenMatch = typeof hiddenMatches.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Enhanced match request type that includes user profile data
export type MatchRequestWithUser = MatchRequest & {
  gamertag: string | null;
  profileImageUrl: string | null;
};

// Chat message with sender information
export type ChatMessageWithSender = ChatMessage & {
  senderGamertag: string | null;
  senderProfileImageUrl: string | null;
};

export const insertUserSchema = createInsertSchema(users);
export const insertMatchRequestSchema = createInsertSchema(matchRequests).omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export const insertMatchConnectionSchema = createInsertSchema(matchConnections).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHiddenMatchSchema = createInsertSchema(hiddenMatches).omit({ id: true, createdAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });